# Production Deployment — Casa Aurelia

This document is the production deployment blueprint for Casa Aurelia. It covers the
runtime layout, reverse-proxy TLS/security-header responsibilities, and the areas
that the application itself intentionally does **not** implement (they belong to the
host/proxy layer).

## Architecture overview

```
Internet
   │  TLS (terminated at reverse proxy — Nginx / Caddy / Traefik)
   ▼
Reverse Proxy  :80→443, static frontend files, SPA fallback, /api + /uploads proxying,
                CSP header, HSTS, X-Frame-Options, nosniff, Referrer-Policy
   │
   ├── /  , /assets/*   ──► frontend/dist  (served by proxy, static)
   ├── /api/*           ──► uvicorn backend  (127.0.0.1:8000)
   └── /uploads/*       ──► uvicorn backend  (127.0.0.1:8000, static uploads)
```

The frontend development proxy (`Vite :5173`) is for development only. In
production the built frontend is served as static files and the API is reached via
the same origin, so CORS is not exercised in production.

## Runtime layout

- **Backend**: `uvicorn app.main:app` bound to `127.0.0.1:8000` (never exposed
  directly to the internet). Run behind the reverse proxy.
- **Frontend**: `npm run build` → `frontend/dist`, served by the reverse proxy.
- **Working directory**: start uvicorn from `backend/`. Paths are now resolved
  absolutely relative to the backend root (`APP_ENV`, DATABASE_URL, upload_dir), so
  the process is no longer sensitive to how it is launched (systemd/uWSGI/cron).

## Environment (production)

In `backend/.env` or the process environment, set at minimum:

```
APP_ENV=production
DATABASE_URL=sqlite:////absolute/path/to/casa_aurelia.db
SECRET_KEY=<long random, ≥32 chars>
ADMIN_EMAIL=admin@...
ADMIN_PASSWORD=<long random, ≥8 chars>
ACCESS_TOKEN_EXPIRE_MINUTES=60
CORS_ORIGINS=https://yourdomain.example
ALLOWED_HOSTS=casaaurelia.example
UPLOAD_DIR=/absolute/path/to/uploads
```

`APP_ENV=production` is a first-class setting (introduced in Phase 8C). Reserve
`development` for local work.

`ALLOWED_HOSTS` (comma-separated, **required** in production) is the allow-list
for the `Host` header the app answers to (backed by `TrustedHostMiddleware`).
Set it to the canonical production hostname(s). The app **refuses to boot** in
production without it — there is no `*` wildcard fallback. In development it
may be left empty; the local hosts (`localhost`, `127.0.0.1`) and the pytest
client host (`testserver`) are allowed automatically. The reverse proxy must
pass the real `Host` header through so the middleware sees the public origin.

## Running the backend as a service (systemd example)

```ini
[Unit]
Description=Casa Aurelia backend
After=network.target

[Service]
WorkingDirectory=/opt/casaaurelia/backend
EnvironmentFile=/opt/casaaurelia/backend/.env
ExecStart=/opt/casaaurelia/backend/venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000 --proxy-headers --forwarded-allow-ips=127.0.0.1
Restart=on-failure
User=casaaurelia
Group=casaaurelia

[Install]
WantedBy=multi-user.target
```

> The template `deploy/casaaurelia-backend.service.example` is the authoritative
> systemd unit (non-root service user, `EnvironmentFile`, no `--reload`,
> `--proxy-headers --forwarded-allow-ips=127.0.0.1`).
>
> For the **first deployment only**, after `alembic upgrade head`, run the seed
> process once (`./venv/bin/python seed.py`) to create the admin user, the
> restaurant configuration and the starter menu. Seed is idempotent and safe to
> re-run, but it is intended to run once.

## API documentation policy

The interactive API docs are development/runtime conveniences and are **not
exposed in production**:

| Endpoint      | Development/test            | Production |
|---------------|----------------------------|------------|
| `/docs`       | available (Swagger UI)     | `404` |
| `/redoc`      | available (ReDoc)          | `404` |
| `/openapi.json` | available (OpenAPI schema) | `404` |
| `/api/health` | available                  | available (the production health check) |

No authentication is introduced for the docs; they are simply not mounted when
`APP_ENV=production`.

## Timezone

The server timezone **must** be `Europe/Rome`. Reservation "today"/closed-day
logic depends on server-local calendar dates (`date.today()`), so a wrong server
timezone shifts booking-window and closure cutoffs. Set it during provisioning,
e.g. `sudo timedatectl set-timezone Europe/Rome` (Debian/Ubuntu), and verify with
`timedatectl`.

## Persistent storage

Two things live on disk and must persist across restarts and redeploys:

- the **SQLite database** (`DATABASE_URL` absolute path);
- the **uploaded menu images** directory (`UPLOAD_DIR`, served under `/uploads/`).

Both must be on **persistent** storage (a real disk / mounted volume), writable
by the non-root service user, and never ephemeral (no throwaway/container
ephemeral storage). Back up both (see `Backup_Restore.md`). Uploads are plain
files on disk; no object storage is used or configured.

## Reverse proxy responsibilities (F1, F2, HSTS, CSP)

The proxy must:

1. **Terminate TLS** and redirect `http://` → `https://`.
2. **Proxy** `/api/` and `/uploads/` to `127.0.0.1:8000`.
3. **Pass through the real `Host` header** (`proxy_set_header Host $host`) so the
   backend's `TrustedHostMiddleware` allow-list sees the public origin, and
   `X-Forwarded-*` headers so uvicorn (`--proxy-headers
   --forwarded-allow-ips=127.0.0.1`) records real client addresses (rate limiting
   keyed by IP depends on this).
4. **SPA fallback** (F2): serve `frontend/dist/index.html` for any unmatched
   non-asset route so client-side routing works on refresh/deep-links.
5. Set **HSTS** on `https` responses (only after TLS is confirmed working):
   `Strict-Transport-Security: max-age=31536000; includeSubDomains`.
6. Set the **Content-Security-Policy** (CSP) on the HTML/document responses
   (F1/CSP1), NOT on API/JSON or uploaded-image responses where it is ineffective.
7. Set `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`,
   `Referrer-Policy` (the API middleware also sets the API-side equivalents; the
   proxy headers govern the HTML document).

### Example Nginx server block (condensed)

```nginx
server {
    listen 80;
    server_name casaaurelia.example;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name casaaurelia.example;

    ssl_certificate     /etc/letsencrypt/live/casaaurelia.example/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/casaaurelia.example/privkey.pem;

    root /opt/casaaurelia/frontend/dist;
    index index.html;

    # HSTS (production only, once TLS verified)
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    # Document-level CSP. The app requires Unsplash images + Google Fonts; keep these
    # origins or the deployed site will lose images/fonts. See Security_Headers_CSP_HSTS.md.
    add_header Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https://images.unsplash.com; connect-src 'self'; frame-ancestors 'none'" always;
    add_header X-Content-Type-Options nosniff always;
    add_header X-Frame-Options DENY always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # SPA fallback: everything not a real file → index.html
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Long-lived cache for hashed build assets
    location /assets/ {
        try_files $uri =404;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    location /api/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 60s;
        # The app allows up to 5 MB menu-image uploads (`max_upload_size_mb`);
        # raise nginx's default 1 MB body limit so uploads are not rejected.
        client_max_body_size 6m;
    }

    location /uploads/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        client_max_body_size 6m;
    }
}
```

> `add_header` in Nginx only propagates to the current response; put HSTS/CSP on
> the block(s) that serve the HTML document and API responses as appropriate.

## Concurrency & capacity safety (CC1)

The reservation booking endpoint uses a **single atomic SQL insert with a capacity
guard** (see `reservation_service.create_reservation`). Under SQLite WAL
single-writer serialization, concurrent requests cannot oversubscribe capacity;
exactly one wins and the loser is rejected with a seats-remaining message. This is
portable to PostgreSQL. No additional application-level locking is required.

The same single write statement also enforces the **concurrent-duplicate guard**
(Phase 8D): its `WHERE` clause additionally requires that no active (non-cancelled,
non-deleted) reservation already exists for the same email + date + time. Under WAL
serialization the second of two identical concurrent requests re-reads the first's
committed row and is rejected, so two active duplicates can never be created —
without a unique index or migration. Cancelled and soft-deleted reservations are
excluded from this check, so re-bookings after a cancellation/soft-delete still work.

## Migrations on deploy

Before starting a new version that changes the schema, run (with the venv active, in
`backend/`):

```bash
venv/bin/python -m alembic upgrade head
```

Keep a fresh DB backup immediately before migrating (see `Backup_Restore.md`). The
migration chain is linear and its head is `009_closures`.

### First deployment (fresh database) — required sequence

1. Provision the persistent directories (DB + uploads, writable by the service
   user) and set the production environment variables (see "Environment" above,
   including `ALLOWED_HOSTS`).
2. Apply migrations:
   ```bash
   venv/bin/python -m alembic upgrade head
   venv/bin/python -m alembic current   # must show: 009_closures (head)
   ```
3. Seed once for the initial admin user, restaurant configuration and menu:
   ```bash
   venv/bin/python seed.py
   ```
   Seed is idempotent (safe to re-run) but is meant to run once.
4. Start the backend **without** `--reload` (systemd unit/`uvicorn app.main:app`).
   Startup never auto-creates tables in production; Alembic owns the schema.

## Verifying a deployment

- `GET /api/health` → `{"status":"healthy",...}`.
- `curl -I https://domain/` shows the HSTS and CSP headers on the HTML response.
- Book a test reservation; confirm `remaining_capacity` decrements and duplicate
  prevention still works.
- `alembic current` shows the expected head.
