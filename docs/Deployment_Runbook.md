# Casa Aurelia — Production Deployment Runbook

Step-by-step runbook to deploy the Casa Aurelia application to a production host.
Commands marked **safe/reproducible** run verbatim; items marked
**OPERATOR-REQUIRED** need operator-owned values (domain, host, TLS, secrets) and
are never invented here.

Related documents (read first): `docs/Production_Deployment.md` (architecture),
`docs/Security_Headers_CSP_HSTS.md` (headers), `docs/Backup_Restore.md`
(backups), `docs/Rollback_Procedures.md` (rollback), `deploy/nginx-*.example`
and `deploy/casaaurelia-backend.service.example` (templates).

This runbook targets a Debian/Ubuntu host with nginx + systemd. Not every step
applies to a non-Linux host; the sections describe the operator intent so the
equivalent can be done elsewhere.

---

## 1. Provision host

- **OPERATOR-REQUIRED**: choose a host/VPS/VM with a public IP, a DNS A record
  pointing at it, and an open inbound 443 (and 80 to redirect). Enable outbound
  HTTPS for package installs.
- **OPERATOR-REQUIRED**: create a non-root deploy/service user, e.g. `casaaurelia`.

## 2. Install required runtime

- **safe/reproducible** (as root):
  ```bash
  apt-get update
  apt-get install -y python3 python3-venv python3-pip nginx git sqlite3 curl
  ```
- **OPERATOR-REQUIRED**: ensure the service user can manage the app paths.

## 3. Clone repository

- **safe/reproducible**:
  ```bash
  mkdir -p /opt/casaaurelia
  git clone <REPOSITORY_URL> /opt/casaaurelia   # <OPERATOR> repo URL
  cd /opt/casaaurelia
  git checkout <RELEASE_TAG_OR_COMMIT>          # <OPERATOR> pinned release
  ```

## 4. Create Python virtual environment

- **safe/reproducible**:
  ```bash
  cd /opt/casaaurelia/backend
  python3 -m venv venv
  chown -R casaaurelia:casaaurelia /opt/casaaurelia
  ```

## 5. Install backend dependencies

- **safe/reproducible**:
  ```bash
  cd /opt/casaaurelia/backend
  ./venv/bin/pip install --upgrade pip
  ./venv/bin/pip install -r requirements.txt
  ```

## 6. Configure backend/.env

- **OPERATOR-REQUIRED**: copy the template and replace every placeholder with
  real values. **Do not commit it.**
  ```bash
  cp .env.production.example /opt/casaaurelia/backend/.env
  # EDIT /opt/casaaurelia/backend/.env: APP_ENV, DATABASE_URL (absolute),
  # UPLOAD_DIR (absolute), SECRET_KEY, ADMIN_EMAIL, ADMIN_PASSWORD, CORS_ORIGINS
  chown casaaurelia:casaaurelia .env
  chmod 600 .env
  ```
- **OPERATOR-REQUIRED**: generate real secrets:
  ```bash
  python3 -c "import secrets; print(secrets.token_urlsafe(48))"   # SECRET_KEY
  python3 -c "import secrets; print(secrets.token_urlsafe(20))"   # ADMIN_PASSWORD
  ```

## 7. Configure database path

- **OPERATOR-REQUIRED**: set `DATABASE_URL=sqlite:////opt/casaaurelia/backend/casa_aurelia.db`
  (an **absolute** path in production) in `.env`. Create the uploads directory:
  ```bash
  mkdir -p /opt/casaaurelia/backend/uploads/menu
  chown -R casaaurelia:casaaurelia /opt/casaaurelia/backend/uploads
  ```

## 8. Run Alembic migrations

- **safe/reproducible** (schema is owned by migrations; do **not** rely on
  startup auto-`create_all`, which is disabled in production):
  ```bash
  cd /opt/casaaurelia/backend
  ./venv/bin/python -m alembic upgrade head
  ./venv/bin/python -m alembic current    # must show: 007_allergen_system (head)
  ```
- **OPERATOR-REQUIRED**: take a fresh backup immediately before migrating a
  previously populated DB (see `docs/Backup_Restore.md`).

## 9. Build frontend

- **safe/reproducible** (requires Node 20.19+ / 22.12+; use the version pinned in
  CI):
  ```bash
  cd /opt/casaaurelia/frontend
  npm ci
  npm run build        # tsc -b && vite build -> dist/
  ```
- `VITE_API_URL` is optional: in production the frontend is served from the same
  origin as the API, so the default (`''` → same-origin `/api`) is correct. If the
  API must live on another origin, set `VITE_API_URL=https://api.example.com`
  only at build time (it is a public value, never a secret).
- **OPERATOR-REQUIRED (SEO, Original Phase 14):** set `VITE_SITE_URL` at the
  production build (no trailing slash, e.g. `VITE_SITE_URL=https://casaaurelia.example`).
  It is the single origin used for absolute canonical URLs, the Open Graph
  `og:url`, the robots.txt `Sitemap:` line, and the sitemap.xml URLs
  (`scripts/generate-seo.mjs` runs before `vite build`). When it is not set
  (dev / pre-deploy) no fake URLs are emitted; the sitemap.xml is a valid stub and
  robots.txt omits the `Sitemap:` line. Verify after deploy:
  `curl -sI https://domain/sitemap.xml` and `curl -s https://domain/robots.txt`.

## 10. Configure nginx

- **safe/reproducible** template: `deploy/nginx-casaaurelia.conf.example`.
- **OPERATOR-REQUIRED**: replace placeholders (domain, cert paths, `root` path)
  and install:
  ```bash
  cp deploy/nginx-casaaurelia.conf.example /etc/nginx/sites-available/casaaurelia
  ln -s /etc/nginx/sites-available/casaaurelia /etc/nginx/sites-enabled/
  nginx -t && systemctl reload nginx
  ```

## 11. Configure systemd

- **safe/reproducible** template: `deploy/casaaurelia-backend.service.example`.
- **OPERATOR-REQUIRED**: replace service user/group, `WorkingDirectory`,
  `EnvironmentFile`, `ExecStart` paths, install and start:
  ```bash
  cp deploy/casaaurelia-backend.service.example \
     /etc/systemd/system/casaaurelia-backend.service
  systemctl daemon-reload
  systemctl enable --now casaaurelia-backend
  systemctl status casaaurelia-backend
  journalctl -u casaaurelia-backend -f
  ```
  The unit runs uvicorn WITHOUT `--reload`, bound to `127.0.0.1:8000` only.

## 12. Configure DNS

- **OPERATOR-REQUIRED**: create an A record (and AAAA if IPv6) for the chosen
  domain pointing to the host. Wait for propagation before issuing TLS.

## 13. Configure TLS

- **OPERATOR-REQUIRED**: obtain a certificate (e.g. Let's Encrypt via `certbot`):
  ```bash
  apt-get install -y certbot python3-certbot-nginx
  certbot --nginx -d casaaurelia.example    # <OPERATOR> real domain
  ```
  certbot rewrites the nginx server block to serve the certificate. Verify with
  `openssl s_client -connect casaaurelia.example:443 -servername ... </dev/null | openssl x509 -noout -dates`.

## 14. Enable HTTP → HTTPS redirect

- In the nginx template the `listen 80` block already returns `301 https://…`.
- After TLS is verified and all traffic is HTTPS, enable HSTS by keeping the
  `Strict-Transport-Security` header in the nginx template (it is included by
  default in the template but must only go live once TLS is proven).
- **OPERATOR-REQUIRED**: confirm `curl -sI http://domain/` returns `301`.

## 15. Verify security headers

- **safe/reproducible**:
  ```bash
  curl -sI https://casaaurelia.example/ | grep -iE 'strict-transport|content-security|x-content-type|x-frame-options|referrer-policy'
  # API responses carry the app-side headers (nosniff, XFO DENY, Referrer-Policy, Permissions-Policy)
  curl -sI https://casaaurelia.example/api/health | grep -iE 'x-content-type|x-frame|referrer-policy|permissions-policy'
  ```

## 16. Verify health endpoint

- **safe/reproducible**:
  ```bash
  curl -s https://casaaurelia.example/api/health
  # {"status":"healthy","service":"Casa Aurelia API","database":"connected"}
  ```

## 17. Verify customer pages

- **safe/reproducible**: browse `/`, `/menu`, `/about`, `/contact`, `/gallery` and
  refresh deep links such as `/reservations` — the SPA fallback must return the
  app (HTTP 200 with `index.html`), never a 404.

## 18. Verify reservation flow

- **safe/reproducible**: book a reservation for a future slot; confirm the
  confirmation code appears and appears again via "look up a reservation". Booking
  a duplicate (same email+date+time) must be rejected.

## 19. Verify admin login

- **OPERATOR-REQUIRED**: log in at `/admin` with the values from `.env`. Confirm
  menu/category administration and reservation management load.

## 20. Verify uploads

- **OPERATOR-REQUIRED**: as admin, upload a JPEG/PNG/WebP menu image (≤5 MB) and
  confirm it is served from `https://domain/uploads/menu/…`. Confirm an oversized
  or non-image file is rejected with a 400.

## 21. Configure backups

- **safe/reproducible** procedure: `docs/Backup_Restore.md` (SQLite online-backup
  via `.backup`, uploads copy, `.env` encrypted copy, daily + weekly + monthly
  retention, weekly restore/integrity verification on a scratch copy).
- **OPERATOR-REQUIRED**: schedule it (e.g. a cron job under the service user or a
  timer), store copies off-host/off-region, and test a restore.

## 22. Configure monitoring / log review

- **safe/reproducible** operator checks (documented in `docs/Production_Deployment.md`
  and this runbook):
  | Check | Command |
  |-------|---------|
  | Process | `systemctl is-active casaaurelia-backend` |
  | HTTP health | `curl -fsS https://domain/api/health` |
  | Backend logs | `journalctl -u casaaurelia-backend --since "24 hours ago"` |
  | nginx logs | `tail -f /var/log/nginx/casaaurelia.*.log` |
  | DB connectivity | health endpoint reports `"database":"connected"`; else `alembic current` |
  | Disk usage | `df -h /opt /var` (backups + uploads grow) |
  | Backup status | last backup file mtime: `ls -la backend/backups/` |
- **OPERATOR-REQUIRED**: add external uptime/TLS-expiry alerts at the operator's
  discretion. A full monitoring platform is intentionally out of scope.

## 23. Establish rollback procedure

- See `docs/Rollback_Procedures.md`. Key points: a failed deploy is rolled back by
  reverting the application/frontend artifacts and re-running
  `systemctl restart` / `nginx -s reload`; the SQLite database is **not** reverted
  by reverting code, but by restoring a pre-deploy backup if a migration must be
  reversed.