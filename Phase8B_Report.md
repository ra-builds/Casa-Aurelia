# Phase 8B — Production Infrastructure & Deployment Readiness Audit — Final Report

**Project:** Casa Aurelia — restaurant website and reservation system
**Phase:** 8B (Production Infrastructure & Deployment Readiness)
**Report date:** 27 August 2026
**Phase type:** AUDIT-ONLY — **zero source modifications were made.**

---

## 1. Executive Summary

This phase performed a **read-only audit** of Casa Aurelia's production infrastructure and
deployment readiness across 12 audit areas: environment/configuration, frontend production
deployment, CSP readiness, HSTS readiness, SQLite→PostgreSQL compatibility, backup/disaster
recovery, CI/automated testing, dependency monitoring, admin authentication hardening, contact
form, production-blocker classification, and regression baseline.

**Headline conclusions:**
- The application is **deployment-ready in principle** for a single-host reverse-proxy setup: the
  production build is a static SPA with same-origin `/api` and `/uploads` calls and **no inline
  scripts** (CSP-friendly), and the backend reads configuration from Pydantic Settings + a
  git-ignored `.env`.
- The **single largest production blocker** is not the code but the **Version Control / migration
  posture**: the repository has **zero commits** and, more seriously, **Alembic migration files are
  git-ignored** (`backend/alembic/versions/*.py`), so a fresh production environment could not
  reproduce the schema at a known revision from a clean checkout.
- The **PostgreSQL concurrency finding is material**: the Phase 7D reservation "concurrency
  protection" relies on a SAVEPOINT (`begin_nested()`) around an **unlocked SELECT-then-INSERT**.
  This does **not** provide the claimed atomicity under either SQLite or PostgreSQL. This is a
  data-integrity concern that must be addressed before a public, high-traffic production launch
  (true fix: a conditional atomic INSERT / `SELECT … FOR UPDATE` / a counter row lock).
- **No dependency is an immediate production blocker**; `bcrypt==4.0.1` + `passlib==1.7.4` works
  (Phase 8A fixed the earlier crash).
- **No automated test suite exists** in the repo (no `backend/tests/`, `pytest.ini`, or
  `conftest.py`); the only regression script depends on a running server and live DB state.

The full findings table with evidence, severity, and recommended phase is in Section 13.

---

## 2. Audit Scope

Read-only review of backend configuration/files, frontend production build and routing, CSP/HSTS
compatibility, PostgreSQL portability of models/migrations/concurrency, backup strategy design,
CI prerequisites, dependency posture, admin auth, and contact form. **No source files were
modified.** Temporary audit scripts were placed under the OS temp directory and removed afterward.

**Out of scope (per Phase 8A user decision — "Audit-only + safe fixes"):**
- No token-storage redesign, no PostgreSQL migration, no cloud services, no email/SMS/payment
  providers, no blind dependency upgrades, no MFA, no architecture changes, no CSP/HSTS
  implementation, no backup system implementation, no CI provider creation, no migrations.

---

## 3. Environment / Configuration Findings

**Files inspected:** `backend/app/core/config.py`, `backend/.env`, `backend/.env.example`,
`backend/app/db/database.py`, `backend/app/main.py`, `frontend/src/utils/helpers.ts`,
`.gitignore`, `backend/.gitignore`.

**Configuration model (FINDING C1 — GOOD):**
- `Settings` (Pydantic `BaseSettings`) loads from `backend/.env` with `extra="ignore"`; defaults are
  development-safe. `SECRET_KEY` is enforced `min_length=32` (config.py:8) — **no secret-key fallback**.
- `.env` is git-ignored (root `.gitignore`); no secret is committed.

**FINDING C2 — [P2] Production/debug settings only partially externalized:**
- `DEBUG`/`ENV` is **not** modeled. There is no `APP_ENV=production` switch anywhere; the app never
  branches on environment. This means there is no accidental dev-only behavior in production (good),
  but also no explicit "production hardening" path. **Recommendation (8C):** add an
  `APP_ENV`/`ENVIRONMENT` setting to make environment explicit and to (later) select log levels/SSL.
- **Risk:** low; no dev-only assumption found that leaks into prod.

**FINDING C3 — [P3] `.env.example` stale token expiry:**
- `.env.example` documents `ACCESS_TOKEN_EXPIRE_MINUTES=480`; the live `.env` is `60`
  (set in Phase 8A). The example should be updated to `60`. No source change (documentation).

**FINDING C4 — [P1] Unsupported/round-trip config coupling:**
- `DATABASE_URL` default is `sqlite:///./casa_aurelia.db` (a **relative path** — depends on the
  process working directory). For a production deployment the DB path must be an absolute path per
  environment. `UPLOAD_DIR` defaults to relative `"uploads"` likewise.
- **Recommendation (8C / later):** make both absolute and environment-specific.

**FINDING C5 — [P3] CORS allow-list is hardcoded to localhost:**
- `cors_origins` default and `.env` are `http://localhost:5173,http://127.0.0.1:5173`. In production
  with a same-origin reverse proxy this is fine (no CORS needed), but if a public origin is ever
  used it must be added to the allow-list. Low risk given the same-origin design.

**FINDING C6 — [P3] `VITE_API_URL` documented in `.env.example` but unused in production:**
- `helpers.ts:4` sets `API_BASE = import.meta.env.VITE_API_URL || ''`. There is **no** frontend
  `.env.local`/`.env.production` present. Setting `VITE_API_URL` to `http://localhost:8000` (as the
  example suggests) would force cross-origin API calls in production and is a **misconfiguration
  trap**; the intended production mode is same-origin (`API_BASE=''`). Documented, not changed.

**Host/port assumptions:**
- Backend uvicorn runs on `127.0.0.1:8000`; frontend Vite dev on `5173` with a dev-only proxy
  (`/api`, `/uploads` → `http://localhost:8000`) in `vite.config.ts`. The proxy is **dev-only**.

---

## 4. Frontend Production Deployment

**Files inspected:** `frontend/vite.config.ts`, `frontend/index.html`, `frontend/dist/index.html`,
`frontend/dist/assets/*`, `frontend/src/utils/helpers.ts`, `frontend/src/App.tsx`, `frontend/package.json`.

**FINDING F1 — [P1/Deployment requirement] Vite dev proxy is NOT used in production (expected, but must be documented):**
- The `/api` and `/uploads` proxies exist only under `server.proxy` (dev mode). The production build
  is purely static. Therefore a **reverse proxy (nginx/Caddy/Traefik) is required** to route
  `/api/*` → backend and `/uploads/*` → backend, and to serve `dist/` statically. With `API_BASE=''`
  the SPA already calls same-origin `/api` and `/uploads`, so **no frontend source change is needed**
  for this deployment model. **This is the "can the frontend be deployed without source changes?"
  answer: YES, provided the host performs this reverse-proxy routing.**

**FINDING F2 — [P1/Deployment requirement] SPA fallback routing is mandatory:**
- The SPA uses React Router `BrowserRouter` (HTML5 history) with client side routes:
  `/`, `/menu`, `/about`, `/gallery`, `/reservations`, `/contact`, `/reservation-confirmed`,
  `/reservation-lookup`, `/admin`, and a `*` NotFound. Direct navigation or refresh on any subpath
  requires the host to **fall back to `index.html`** for non-file requests (except `/api`, `/uploads`).
  Without this, deep links/refreshes return 404.

**FINDING F3 — [P3] Production asset handling / caching:**
- `dist/index.html` references hashed assets (`/assets/index-DoFhazPw.js`,
  `index-DdfkVfzn.css`) with `crossorigin` — good for long-lived immutable caching. `dist/index.html`
  should be served with `no-cache`; assets with `immutable`/long max-age. This is a host config item.

**FINDING F4 — [P3] External static dependencies in the page:**
- `index.html` preloads an Unsplash image and loads Google Fonts (see CSP section).
- Social links (`Instagram/Facebook/TripAdvisor`), `tel:` / `mailto:` links render to
  external/navigation schemes — no CSP `connect-src` impact (not fetched by JS).

**Build facts (verified):**
- `npx vite build` succeeded: 2273 modules; `dist/index.html` 1.37 kB;
  `index-DoFhazPw.js` 573.65 kB (172.98 kB gzip); `index-DdfkVfzn.css` 41.17 kB.
- `tsc -b` reports only 2 pre-existing TS6133 unused-import errors; `npm run lint` (oxlint) only
  pre-existing warnings. No new warnings.

---

## 5. CSP Readiness

**Files inspected:** `frontend/index.html`, `frontend/dist/index.html`, `frontend/src/**`
(eval/Function/WebSocket/worker/dangerouslySetInnerHTML scans), `constants.ts`, `HeroSection.tsx`,
`AboutPage.tsx`, `ExperienceSection.tsx`, `helpers.ts`.

**CSP/IP cross-checks (results):**
- **Inline scripts:** none. Built output uses a same-origin `/assets/*.js` module script. **No nonce/hash
  required for scripts.**
- **Inline event handlers** (`onclick=`, `onload=`, `javascript:`): none found.
- **eval / new Function:** none found.
- **dangerouslySetInnerHTML:** none found (React default escaping).
- **WebSocket / EventSource / service worker / Web Worker:** none found.
- **Inline `<style>`/`<script>` tags in components:** none found.
- **React inline `style` attributes:** **present and consequential** — `HeroSection.tsx`,
  `AboutPage.tsx`, `ExperienceSection.tsx` set `style={{ backgroundImage: url(...) }}` (inline `style`
  attributes). These require `style-src 'unsafe-inline'` (React renders them as inline attributes;
  hashes/nonces cannot validate runtime DOM styles).
- **External fonts:** Google Fonts (`fonts.googleapis.com`, `fonts.gstatic.com`) via `<link>` in
  `index.html` → requires `style-src` for the stylesheet and `font-src` for font files.
- **External images:** Unsplash (`https://images.unsplash.com`) used heavily in `constants.ts`
  (`IMAGES`, gallery, menu dish images) and as CSS background images → requires `img-src`.
- **Google Calendar** external link (`calendar.google.com/calendar/render`) in `helpers.ts:142` —
  it is a `window.open`/location navigation, not a JS-fetch, so it needs no `connect-src`; if opened
  in a new tab it is top-navigation only (new tab), which CSP does not block.

**FINDING CSP1 — [P1/Deployment requirement] A workable strict CSP (no nonce/hash needed for scripts):**
Recommended directives (to be applied at the **frontend host layer**, see Section 15 for placement):
```
default-src 'self';
script-src 'self';
style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
font-src 'self' https://fonts.gstatic.com;
img-src 'self' data: https://images.unsplash.com;
connect-src 'self' /api;             # same-origin API; extend if VITE_API_URL is ever set
object-src 'none';
base-uri 'self';
form-action 'self';
frame-ancestors 'none';
upgrade-insecure-requests
```
- `'unsafe-inline'` is required in `style-src` for React inline `style` attributes (and for Tailwind
  Vite which injects a style element at runtime in some build modes). This is a pragmatic, accepted
  relaxation for style (not script).
- **Blockers:** none for scripts. The only caveats are the Google Fonts + Unsplash origins.
- **Nonce/hash:** **not required** (no inline scripts). `script-src 'self'` suffices.
- **Where applied:** must be served with the HTML `index.html` document — i.e. at the reverse
  proxy/host (or injected by the static server), **not** on the backend's JSON/upload responses
  (confirmed as the Phase 8A decision). The backend `SECURITY_HEADERS` do **not** include CSP, which
  is correct.

**FINDING CSP2 — [P3] Optional hardening:** self-hosting the hero/about/chef Unsplash images and the
Google Fonts (or removing the Unsplash preload) would allow dropping the `https://images.unsplash.com`
and font origins, tightening the policy. Deferred (visual/data hosting decision).

---

## 6. HSTS Readiness

**Files inspected:** backend (all app code), frontend, `vite.config.ts`, `main.py`.

**FINDING H1 — [Deployment requirement] The application does NOT terminate TLS.**
- FastAPI/uvicorn serves plain HTTP; `uvicorn[standard]` is configured without SSL cert/key in
  `main.py` and no uvicorn `--ssl-*` flags. **The app expects HTTPS to be terminated by a reverse
  proxy / host** (nginx/Caddy/Traefik/cloud LB). No `HTTPS`-related config exists in `Settings`.
- HSTS therefore **belongs at the reverse proxy / host layer**, not in the app, and must be emitted
  **only after TLS is actually in place**.
- **Local development:** no HSTS should (or does) apply to localhost; the dev flow on
  `http://localhost:5173` / `127.0.0.1:8000` is unaffected. This matches the requirement to NOT add
  HSTS to localhost.
- **FINDING H1a — [P2] No absolute-URL generation:** the app never generates absolute `https://`
  URLs, so it is compatible with HTTPS termination as long as the proxy forwards `Host` (and
  `X-Forwarded-Proto`). No change required now, but the proxy must be configured correctly.

---

## 7. SQLite → PostgreSQL Compatibility (Assessment Only — NO Migration)

**Files inspected:** all `backend/app/models/*.py`, all `backend/alembic/versions/*.py`,
`backend/alembic/env.py`, `backend/app/db/database.py`, `reservation_service.py`, `menu_service.py`.

### What is portable today
- **Dialect selection is already conditional:** `database.py:8,13` branches on
  `settings.database_url.startswith("sqlite")` for `check_same_thread` and per-connection pragmas
  (WAL, `busy_timeout`, `foreign_keys`). A PostgreSQL URL would skip these automatically.
- **Types:** `Integer`, `Boolean`, `Numeric(10,2)`, `Date`, `Time`, `String(n)`, `Text`,
  `DateTime(timezone=True)` all map cleanly to PostgreSQL (`INTEGER`, `BOOLEAN`, `NUMERIC(10,2)`,
  `DATE`, `TIME`, `VARCHAR(n)`, `TEXT`, `TIMESTAMPTZ`). No SQLite-only type usage (e.g., no
  `JSON1`, no `AUTOINCREMENT` reliance — PKs are `INTEGER PRIMARY KEY` which autoincrements on both;
  on PostgreSQL SQLAlchemy emits `SERIAL`/`IDENTITY`).
- **Constraints:** foreign keys are named and `ON DELETE CASCADE`; composite PK on
  `menu_item_allergens`; unique indexes — all portable.
- **Migrations 001–004, 006, 007** use standard `op.create_table`/`op.add_column`/`op.bulk_insert`
  — portable. Alembic `env.py` reads `settings.database_url`, so pointing it at PostgreSQL would
  drive the same migration chain there (subject to the batch-mode caveat below).
- **`func.lower(...).like(...)`** search filters are portable (case-insensitive search via LOWER on
  both dialects).

### What would require changes / risks
- **FINDING P1 — [MIGRATION RISK] `op.batch_alter_table(..., copy_from=...)` in migration 005:**
  migration `005_menu_database_foundation.py` rebuilds tables with Alembic **batch mode** (a
  SQLite-centric table-recreation strategy) and manually recreates indexes. On PostgreSQL, `batch`
  mode may emit different DDL (AlterTable ops) and is **not a tested PostgreSQL path**; the manual
  `create_index` inside the batch would need validation. This is the **only non-trivial migration
  portability risk**.
- **FINDING P2 — [MIGRATION RISK] Timezone semantics:**
  `DateTime(timezone=True)` on PostgreSQL is `TIMESTAMPTZ` (preserves UTC offset), whereas SQLite
  **stores the value but drops tzinfo on retrieval** (returns naive). The code writes
  `datetime.now(timezone.utc)` and reads/compares with naive `date.today()`; behaviour is consistent
  with UTC but a PostgreSQL migration must verify no naive-vs-aware comparison errors, and set the
  **PostgreSQL session `timezone` to UTC** for reproducibility.
- **FINDING P3 — [MIGRATION RISK] Case-sensitivity of unique/equality checks:**
  SQLite `=` on text is case-sensitive (BINARY collation default), matching PostgreSQL default
  `=` (case-sensitive collation). So the seed/name-uniqueness logic behaves the same. However,
  PostgreSQL index default collation is locale-dependent; a `C`/case-sensitive collation should be
  confirmed for `String`/`Text` unique columns to avoid surprises. Low risk.
- **FINDING P4 — [P2] Relative paths:** `sqlite:///./casa_aurelia.db` and `uploads` are relative;
  PostgreSQL DSN would be absolute, but the working-directory dependence for SQLite should be
  eliminated regardless before production.

### Concurrency mechanism — **the key PostgreSQL (and general) finding**
- **FINDING CC1 — [P1] The Phase 7D "concurrency protection" does not provably protect capacity.**
  In `reservation_service.create_reservation` (lines 102–114):
  ```
  inner = db.begin_nested()          # SAVEPOINT — NOT a lock
  booked = get_booked_guests(...)    # unlocked SELECT (aggregate SUM)
  capacity = get_capacity(...)       # unlocked SELECT
  if guests > capacity - booked: raise ...
  db.add(reservation)
  inner.commit()
  db.commit()
  ```
  A SAVEPOINT provides **atomic rollback**, not **isolation from concurrent writers**. Two
  concurrent `create_reservation` calls can both read `booked=10`, both pass the `< capacity - booked`
  check, and both commit → oversubscribing capacity. Under **SQLite WAL** the final writes serialize
  but the read-decide-write is still a check-then-act race; under **PostgreSQL** the same race exists
  at the READ COMMITTED default isolation (no `FOR UPDATE` on the aggregate).
- **Severity:** P1. In a quiet single-admin demo the race window is small, but at a public launch
  concurrent bookings can violate the 40-seat invariant.
- **Needed under PostgreSQL (8C):** a real atomic capacity reservation, e.g. a **conditional INSERT**
  (`INSERT … SELECT … WHERE NOT EXISTS` / `INSERT … WHERE (sum of active seats < capacity)`), or a
  guarded counter row (`UPDATE restaurant.capacity_reserved = capacity_reserved + :n WHERE
  capacity_reserved + :n <= capacity`) with row-level locking, or `SELECT … FOR UPDATE` on the
  restaurant/capacity row before deciding. This must be designed in 8C; it is the single most
  important data-integrity change for PostgreSQL.

### Migration-readiness verdict
**MOSTLY portable.** Models and 7 of 8 migrations are cleanly portable. Migration 005's batch-mode
table rebuild, the `TIMESTAMPTZ`/UTC session timezone, and (above all) the reservation concurrency
mechanism are the three items requiring change/validation before a PostgreSQL go-live. **No migration
was created or run in this phase.**

---

## 8. Backup / Disaster Recovery Readiness (Design Only)

**Files inspected:** `casa_aurelia.db` (+ `-wal`/`-shm`), `backend/uploads/`, `frontend/dist/`,
`backend/alembic/versions/*`, `backend/.env`, `.gitignore`.

### What must be backed up (source of truth)
1. **`backend/casa_aurelia.db`** — the only persistent user/business data (reservations, menu,
   users, restaurant).
2. **`backend/uploads/menu/**`** — admin-uploaded dish images (currently empty, but live data in prod).
3. **`backend/.env`** — secrets & config (back up securely / store in a secret manager; never in git).
4. **Alembic migrations** — required to recreate/evolve schema (`backend/alembic/versions/*.py`) —
   **but these are currently git-ignored (FINDING B2 below)**.
5. **Frontend source + build config** — for reproducing `dist/` (code, not the built artifact).

### What can be rebuilt (not backed up)
- `frontend/node_modules/` (from `package-lock.json`), `frontend/dist/` (from `npm run build`),
  venv (from `requirements.txt`), reference/catalog data (menu/restaurant/allergens can be re-seeded
  from `seed.py`, though that would not restore user reservation history).

### Consistency requirements with WAL
- The DB runs `journal_mode=WAL`, so a naive copy of `casa_aurelia.db` while running can miss
  in-flight/committed WAL frames. A consistent backup must either:
  - use the live **SQLite online backup API** (`sqlite3` `VACUUM INTO 'backup.db'`, safe even while WAL
    is active), or
  - copy **`*.db` + `*.db-wal` + `*.db-shm` together** while quiesced, or
  - stop the app briefly and copy `.db` plus replay `-wal`.
- **Recommended approach (documented, not implemented):** schedule `VACUUM INTO` (or the `backup`
  SQLAlchemy interface) to a timestamped file, verifying integrity with `PRAGMA integrity_check`.

### Restore sequence (documented)
1. Stop the app (all workers) to avoid write conflicts.
2. Restore the chosen consistent DB snapshot (e.g., a `VACUUM INTO` output) to `casa_aurelia.db`.
3. Restore `uploads/menu/` content to the path in `.env` `UPLOAD_DIR`.
4. Restore `.env` (secrets) and ensure `DATABASE_URL` matches an absolute path.
5. Run `alembic upgrade head` to confirm schema at target revision (migrations must be present —
   see FINDING B2).
6. Start app; run a smoke test (`/api/health`, menu, one lookup).

### Retention & verification (documented)
- Recommend: **daily** backups, weekly off-box copies; retain N daily + M weekly/monthly.
- Verification: on each backup, run `PRAGMA integrity_check = ok` and a read of one reservation +
  menu counts; periodically do a test restore into a scratch location.

### FINDING B1 — [P1] **No backup mechanism exists** (by design — no implementation requested), and
there is no automated or even manual backup procedure/procedure doc in the repo. Must be delivered in
8C or before production. Off-box/cloud backup is out of scope (user decision), so a same-host
scheduled `VACUUM INTO` + periodic off-box copy is the minimal viable starting point.

### FINDING B2 — [P1] **Alembic migration files are git-ignored.**
- `.gitignore` line: `backend/alembic/versions/*.py`. Migrations are the **schema source of truth** for
  `alembic upgrade head` on any environment, including DR restores. Ignoring them means a clean
  checkout cannot rebuild or migrate a database, and restore step 5 fails.
- **Recommendation (8C):** remove that ignore pattern and commit migrations (they are deterministic,
  versioned artifacts, not generated noise). This is arguably a P1 prerequisite for any real
  environment reproducibility and DR.

---

## 9. CI / Automated Test Automation Readiness

**Files inspected:** `backend/requirements.txt`, `backend/tmp_regress.py`, `frontend/package.json`,
`frontend/.oxlintrc.json`, frontend `tsconfig*`, absence of `backend/tests/`, `pytest.ini`,
`conftest.py`.

### Existing state
- **No committed automated backend test suite.** `pytest==8.3.4`, `pytest-asyncio`, and `httpx`
  are in `requirements.txt`, but there is **no `backend/tests/`, no `pytest.ini`, no `conftest.py`**.
  Phase 8A's `phase8a_security_test.py` and `rate_limit_test.py` were temporary and removed.
- **`backend/tmp_regress.py` is a standalone, server-coupled script:** it requires the **backend on
  :8000 AND the frontend dev server on :5173 already running**, reads **live DB state** (counts must
  be exactly 5/20/9), and asserts against the running Alembic head. It is not CI-portable as-is:
  - depends on running servers,
  - depends on the specific live dataset (would fail in CI with an empty DB),
  - shells out to `alembic heads`,
  - would need orchestration/cleanup.
- **Frontend:** `package.json` has `lint` (oxlint) and `build` (`tsc -b && vite build`) but **no
  `test` script and no frontend test framework**.

### Exact commands required for CI (documented, not executed as a pipeline)
Backend:
```
python -m pip install -r requirements.txt     # or create venv
# (once a proper pytest suite exists)
python -m pytest -q                            # REQUIRES a DB-isolated suite (see below)
```
Frontend:
```
npm ci                                          # reproducible install from package-lock.json
npm run lint                                    # oxlint
npm run build                                   # tsc -b && vite build
```

### FINDING CI1 — [P1] No DB-isolated automated tests exist:
There is no way today to run the backend's security/regression checks in CI without a live server and
live data. A proper CI suite must:
- use an isolated scratch DB (e.g., a temp `sqlite:///:memory:` or a dedicated CI `DATABASE_URL`),
- not depend on running servers (use FastAPI `TestClient` / `httpx.ASGITransport`),
- seed its own fixtures and **clean up** its own rows,
- never touch the development DB (`casa_aurelia.db`) so test data cannot leak into production.

### FINDING CI2 — [P3] Frontend has no unit/component test runner.
`vite` + React are present; adding Vitest + React Testing Library would fill the gap. Deferred.

### FINDING CI3 — [P3] `tmp_regress.py` and `seed.py` are fine as dev helpers but must not be the
CI entry point. `/api` proxy depends on a live backend.

---

## 10. Dependency Monitoring

**Files inspected:** `backend/requirements.txt`, `frontend/package.json`, `frontend/package-lock.json`.

### Backend — highest-focus dependencies
- **`passlib[bcrypt]==1.7.4` + `bcrypt==4.0.1`** (Phase 8A pin). **Current compatibility: works.**
  `verify_password`/`get_password_hash` verified at runtime (login 200, hash validates). No immediate
  blocker.
- **Known upgrade risks (documented; NO changes):**
  - `bcrypt >= 4.1` removes the `__about__` attribute that `passlib 1.7.4` imports → would reintroduce
    the Phase 8A login 500 crash. **Do not upgrade bcrypt without also addressing passlib.**
  - `passlib` has not been updated for years and its `setup.py` declares `bcrypt` loosely; the
    ecosystem recommends moving off `passlib` (e.g., use `bcrypt` directly or `pwdlib`) — a **future
    hardening item (P2/8C+)**. For now the pin is the correct, verified fix.
- Other pins (`fastapi 0.115.6`, `sqlalchemy 2.0.36`, `pydantic 2.10.4`, `pydantic-settings 2.7.0`,
  `python-jose[cryptography] 3.3.0`, `python-multipart 0.0.20`, `slowapi 0.1.9`, `email-validator 2.2.0`,
  `alembic 1.14.0`, pytest/httpx) are common, current stable versions; **none is an immediate blocker**.

### Frontend
- `react ^19.2.x`, `react-router-dom ^7.18`, `vite ^8`, `typescript ~6`, `tailwindcss ^4`,
  `oxlint`, `i18next`, `lucide-react`, `framer-motion` — mainstream and current. No immediate blocker.
  `package-lock.json` is present (reproducible installs).

### FINDING D1 — [P3] Monitoring strategy (documented, not implemented):
- Add a dependency-advisory check to CI (e.g., `pip-audit` for Python, `npm audit` for Node).
- Track passlib/bcrypt guidance; plan a phased move off passlib.
- No blind upgrades (per scope). Any future upgrade must be gated by a runtime login test to avoid
  silent regressions like the Phase 8A bcrypt crash.

---

## 11. Admin Authentication Hardening (Audit Only — No Redesign)

**Files inspected:** `auth.py`, `core/security.py`, `core/deps.py`, `models/user.py`,
`core/config.py`, `frontend/src/utils/helpers.ts`, `frontend/src/hooks/useAuth.tsx`,
`App.tsx`.

### Current architecture
- **Login** (`POST /api/auth/login`, 5/min): verifies bcrypt password, issues **both** an access JWT
  (HS256, `type=access`, exp = `ACCESS_TOKEN_EXPIRE_MINUTES=60`) and a refresh JWT (`type=refresh`,
  `refresh_token_expire_days=7`).
- **Validation:** `get_current_user` decodes access token, checks `type==access`, then does a **live
  DB lookup** and verifies `is_active` on every protected request. `get_admin_user` enforces
  `role=="admin"` (403 otherwise).
- **Refresh** (`POST /api/auth/refresh`, 10/min): accepts a refresh JWT, checks `is_active`, and
  issues a **new** access + refresh pair. **No rotation, no revocation, no server-side denylist/version** —
  a stolen refresh token stays valid until its 7-day expiry.
- **Storage:** both tokens are stored in **`localStorage`** (`auth_token`, `refresh_token`) in
  `helpers.ts` — the XSS-exposure risk documented in Phase 8A (deferred per user decision; not redesigned).
- **Password hashing:** bcrypt (`CryptContext(schemes=["bcrypt"], deprecated="auto")`).
- **Admin account:** a **single** admin user, password from `.env`/`ADMIN_PASSWORD`, role fixed to
  `admin`, no MFA, no recovery flow, no second factor.

### Risk assessment
- **FINDING A1 — [P2] Refresh tokens are long-lived (7 days) and stateless with no rotation/revocation.**
  Mitigations already present: rate limit on `/refresh` (10/min), `is_active` re-check. Recommended
  (8C+): server-side token version/denylist or short-lived refresh + rotation; bounded reuse detection.
- **FINDING A2 — [P2] Tokens in `localStorage`** (deferred by user decision; the prescribed hardening
  is httpOnly+SameSite cookies + CSRF handling). Current compensations: token lifetime cut to 60 min
  (Phase 8A), `is_active` checks, rate limits.
- **FINDING A3 — [P3] No lockout / no per-account backoff** beyond the IP rate limit; a distributed
  attack could stretch the 5/min. Low risk for a single-admin system. Recommend slow increase /
  account lockout in 8C+.
- **FINDING A4 — [INFO] No MFA.** Per user decision, not implemented. Documented architecture for a
  future TOTP (see below) — deferred.

### Safe mitigations already present (verified)
- HS256 with pinned algorithm + `type` claim; no `alg=none` downgrade (earlier test: rejected).
- Live `is_active` + role check on every protected request; 401/403 correct.
- Login & refresh rate-limited; short access-token lifetime.
- bcrypt hashing (not plaintext), secret-key min 32.

### Recommended future MFA/TOTP architecture (DOCUMENTED, NOT IMPLEMENTED)
1. Add `totp_secret` + `totp_enabled` columns to `users` (new Alembic migration — deferred).
2. On login, after password verify, require a TOTP code if `totp_enabled`.
3. Provision via `pyotp`; reveal secret once; store as an encrypted/dedicated field.
4. Enforce backup codes and a recovery flow.
5. Gate admin-only routes (already gated) behind MFA; consider MFA on refresh.
This belongs in a later phase and requires the user decision to add MFA.

### Production prerequisites for admin auth (P2/P3 scope)
- A **secrets manager / rotated admin password** rather than a long-lived `.env` value.
- Optional IP allow-listing for `/admin` in front of the proxy.

---

## 12. Contact Form Status

**Files inspected:** `frontend/src/pages/ContactPage.tsx`.

**FINDING CF1 — [P1/P2] The contact form is a pure client-side mock and does NOT send or store anything.**
On submit (`handleSubmit`, lines 35–45):
1. Local client-side validation (name/email/subject/message length) runs.
2. `setSubmitting(true)`.
3. `await new Promise(r => setTimeout(r, 1000))` — an artificial 1 s delay (pretend "sending").
4. `setSubmitted(true)`; form fields reset.
- **No network request is made. No data is persisted anywhere (no backend endpoint, no email, no DB).**
  The visitor receives a success message but the message never reaches anyone.
- **Affected:** this is a real functional gap for a public site — customers believe they contacted the
  restaurant but the message is silently discarded.
- The unused `ErrorMessage` import is a pre-existing lint/TS warning (matches Phase 8A).
- **Recommendation (8C+):** add a real `POST /api/contact` endpoint (rate-limited, validated,
  stored or forwarded to an email/SMS provider) and wire the form to it. **Not implemented in 8B**
  (no email provider per scope).

---

## 13. Production Blockers (Classification)

All findings classified P0/P1/P2/P3/DEFERRED. "Implemented in 8C" = belongs to the next phase.

| # | Finding | Evidence | Severity | Risk | Recommendation | Phase |
|---|---------|----------|----------|------|----------------|-------|
| CC1 | Reservation capacity check-then-insert race (SAVEPOINT, no lock) | `reservation_service.py:102-114` | **P1** | Oversubscription → capacity invariant violated under concurrency; needed for PostgreSQL | Atomic conditional INSERT / `FOR UPDATE` on counter | 8C |
| B2 | Alembic migrations git-ignored | `.gitignore: "backend/alembic/versions/*.py"` | **P1** | Cannot reproduce/migrate schema or restore DB from a clean checkout; DR step 5 fails | Remove ignore pattern; commit migrations | 8C |
| B1 | No backup/restore procedure exists | No backup tooling/doc in repo | **P1** | Total loss of reservation/menu data on disk failure | Add scheduled `VACUUM INTO` + off-box copy + verify | 8C |
| CI1 | No DB-isolated automated test suite | No `backend/tests/`, no pytest config; `tmp_regress.py` needs live servers+live data | **P1** | No automated gate; test/phase data at risk of leaking into prod DB | Build pytest suite on isolated DB with TestClient | 8C |
| F1 | Reverse proxy `/api`,`/uploads` routing required in prod | `vite.config.ts` proxy is dev-only; `helpers.ts` `API_BASE=''` | **P1 (deployment)** | Frontend cannot reach backend in prod without host config | Configure reverse proxy + document | 8C |
| F2 | SPA fallback routing required | `BrowserRouter` in `App.tsx:20`; deep-link refresh → 404 without fallback | **P1 (deployment)** | Deep links/refresh return 404 | Host `try_files ... /index.html` (excl. /api, /uploads) | 8C |
| CSP1 | Needs CSP at host; `style-src 'unsafe-inline'` + Google Fonts + Unsplash required | `index.html`, `HeroSection.tsx` inline styles, `constants.ts` images | **P1 (deployment)** | Click/reflected risk without CSP; breaks if omitted wrong origins | Apply recommended CSP at host (Section 5) | 8C |
| CF1 | Contact form is a client-side mock | `ContactPage.tsx:35-45` | **P2** | Customer messages silently lost | Add real `/api/contact` + provider | 8C+ |
| C4 | Relative DB/upload paths; no env switch | `config.py:7`, `database.py:7` | **P2** | Path/working-dir dependence in prod | Absolute paths; add `APP_ENV` | 8C |
| P4(PG) | SQLite batch-mode table rebuild in migration 005 | `005_menu_database_foundation.py` | **P2 (migration)** | Migration may not run cleanly on PostgreSQL | Validate/rework migration 005 for PostgreSQL | 8C |
| H1a | No explicit HTTPS/proxy-forwarded assumptions documented | `main.py`, backend all | **P3** | Proxy misconfig | Document proxy `Host`/`X-Forwarded-Proto` | 8C |
| C2 | No `DEBUG`/`ENV` modeled | `config.py` | **P3** | No explicit prod mode | Add `APP_ENV` | 8C |
| C3 | `.env.example` token expiry stale (480 vs 60) | `.env.example` | **P3** | Config drift | Update example to 60 | 8C |
| A1 | Refresh tokens stateless, no rotation/revocation, 7-day | `auth.py`, `security.py` | **P2** | Stolen refresh token persists | Rotation/denylist; shorter expiry | 8C+ |
| A2 | Tokens in localStorage | `helpers.ts:13,24,36` | **P2** | XSS → token theft (deferred by user) | httpOnly cookies + CSRF | later/DEFERRED |
| A3 | No account lockout/backoff | `auth.py` (IP rate limit only) | **P3** | Slow brute force | Lockout/backoff | later |
| A4 | No MFA | `user.py` | **INFO** | Single-admin compromise | TOTP (Section 11) | later/DEFERRED |
| D1 | No dependency advisory checks in CI | Pinned reqs + package-lock | **P3** | Silent CVE regressions | pip-audit / npm audit in CI | 8C |
| E1 | Repo has zero commits; no git baseline | `git log` → no commits; all files untracked | **P1** | No VCS safety net; cannot `git diff` unintended changes | Make first commit; adopt versioning | 8C |
| F4/CSP2 | External Unsplash + Google Fonts; preload | `index.html`, `constants.ts` | **P3** | CSP origin surface; external dependency | Optional self-hosting | later |

**Effective P0 findings:** none that block a local facility/demo deployment. **No blocker prevents**
the app from running today on a single host. The risks are concentrated in **production hardening**
(concurrency, VCS/migrations, backups, automated tests, host-layer CSP/HSTS/routing) rather than in
the application logic itself.

---

## 14. Safe Fixes (Recommended — NOT applied in this audit-only phase)

These are safe, low-risk changes proposed for 8C (each gated by user approval; none made now):
1. Remove `backend/alembic/versions/*.py` from `.gitignore` and commit migrations (FINDING B2).
2. Make the repository's first commit to establish a VCS baseline (FINDING E1).
3. Add `APP_ENV`/`ENVIRONMENT` + enforce absolute `UPLOAD_DIR`/`database_url` for non-SQLite
   (FINDING C2/C4).
4. Fix `.env.example` `ACCESS_TOKEN_EXPIRE_MINUTES` to 60 (FINDING C3) — documentation.
5. Implement the atomic capacity reservation to close FINDING CC1 (requires a code change + new
   migration test; the most impactful safe-data fix).
6. Add a CI-ready, DB-isolated pytest suite (FINDING CI1).
7. Add dependency advisory checks (`pip-audit`, `npm audit`) to CI (FINDING D1).

All of the above are **out of scope for 8B** (no source modifications). They are listed for the
user's approval in 8C.

---

## 15. Deferred Items

Per the Phase 8A user decision and Phase 8B scope, the following are deferred (intentionally outside
this phase / needing later approval):
1. **JWT token-storage redesign** to httpOnly + SameSite cookies with CSRF (Phase 8A decision).
2. **PostgreSQL migration** (FINDING CC1 concurrency must be solved first; migration 005 rework + UTC
   timezone validation required).
3. **CSP + HSTS implementation** (belong at the frontend host / reverse proxy, not in this repo's app
   layer; CSP policy in Section 5 is ready to apply once a host layer exists).
4. **Real contact-form backend** + email/SMS provider (FINDING CF1).
5. **Cloud / off-box backups** and any SaaS infrastructure.
6. **Dependency upgrades** (especially any bcrypt/passlib change — gated by runtime login test).
7. **CI provider/workflow creation** (Section 9 documents exact commands only).
8. **MFA / TOTP** (architecture documented in Section 11; requires `pyotp` + a migration + user decision).

---

## 16. Recommended Phase 8C Scope

Based on the audits, the recommended next phase (gated by user approval) is:
1. **Fix FINDING CC1** — atomic capacity reservation (highest priority data-integrity change).
2. **Fix FINDING B2 + E1** — commit migrations, make first VCS commit, remove migration ignore.
3. **Implement FINDING B1** — minimal backup (`VACUUM INTO`) + restore/verification procedure.
4. **Implement FINDING CI1** — DB-isolated pytest suite wired to the endpoint surface + cleanup.
5. **Apply safe config fixes** — `APP_ENV`, absolute paths, `.env.example` correction.
6. **Add host-deployment runbook** — reverse-proxy config (F1/F2/CSP1/H1a): `/api`, `/uploads`,
   SPA fallback, CSP header, HSTS (post-TLS), asset caching.
7. **Add dependency advisory checks** to whatever CI is adopted.
8. **Optionally begin the PG migration-readiness work** (start with migration 005 rework + a
   PostgreSQL staging validation) — separate from the concurrency fix.

Items 1–7 are code/config/procure + documentation work. Items requiring new external providers
(contact email, cloud backup, MFA) remain deferred to later phases pending user decisions.

---

## 17. Regression Verification (read-only, baseline intact)

All checks performed read-only against the running servers and DB. **No test data was left behind.**

Backend (`http://127.0.0.1:8000`):
- `/api/health` → `200` `{status: healthy, database: connected}` ✔
- `/api/menu` → `200`, 5 categories, 20 items, 9 featured ✔
- availability → `200` `{available: true, remaining_capacity: 40}` ✔
- `/api/admin/menu` unauthenticated → `401`; after login → `200` (auth + authorization) ✔
- `/api/auth/login` → `200` with access token ✔

Frontend (dev server `http://localhost:5173`):
- `/`, `/menu`, `/reservations`, `/reservation-confirmed`, `/reservation-lookup`, `/admin` — all `200` ✔

Database (read-only queries):
- Alembic head = `007_allergen_system` ✔
- 5 categories, 20 menu items, 14 allergens, 9 featured ✔
- 0 active reservations, 68 soft-deleted reservations ✔
- 1 user, 1 restaurant (capacity 40) ✔
- `uploads/menu/` empty ✔

Build quality gates (read-only re-verification of existing state — confirmed, not changed):
- frontend `vite build` succeeds; no new lint/TS warnings.

---

## 18. Final Sign-off

This phase was performed as a **read-only audit**. No source files were created or modified inside the
repository. Temporary audit scripts were placed under the OS temp directory and removed after use.
The database was only read, never written. No migrations, dependencies, `.env` values, build outputs,
generated files, or schema were changed. The regression baseline is fully intact.

The two running servers (backend :8000, frontend :5173) and all six frontend routes + API behavior
were re-verified after the audit with no state change.

---

## APPENDIX A — Complete Findings Table (consolidated)

See Section 13 for the full classified table. Summary by severity:
- **P0:** none.
- **P1:** CC1 (concurrency), B2 (migrations ignored), B1 (no backups), CI1 (no isolated tests),
  F1 (proxy routing), F2 (SPA fallback), CSP1 (CSP at host), E1 (zero VCS commits).
- **P2:** CF1 (contact mock), C4 (relative paths/env), PG-migration variables (005 batch, timezone),
  A1 (refresh no rotation), A2 (localStorage, deferred).
- **P3:** C2/C3, H1a, A3, D1, F4/CSP2, CI2/CI3.
- **DEFERRED:** A2 (cookies), A4 (MFA), PostgreSQL migration, cloud backups, contact provider,
  dep upgrades, CI provider, CSP/HSTS implementation.

## APPENDIX B — Production Blocker List

1. **Capacity oversubscription race** in reservation creation (FINDING CC1) — must be fixed before
   public/high-traffic launch; also a prerequisite for PostgreSQL.
2. **Alembic migrations git-ignored + zero-commit repo** (FINDING B2 + E1) — no reproducible schema /
   VCS safety net; must commit migrations and make the first commit, or `alembic upgrade head` on a
   fresh/DR environment is impossible.
3. **No backup/restore procedure** (FINDING B1) — single DB is the sole source of truth; no DR path.
4. **No DB-isolated automated tests** (FINDING CI1) — no automated safety net; risk of live-data coupling.
5. **Production host layer not defined** (FINDINGS F1/F2/CSP1/H1a) — reverse-proxy `/api` + `/uploads`
   routing, SPA fallback, CSP, and (post-TLS) HSTS must be established for any real deployment.

## APPENDIX C — Exact Files Inspected

**Backend**
- `app/core/config.py`, `app/core/security.py`, `app/core/deps.py`
- `app/db/database.py`
- `app/main.py`
- `app/api/routers/auth.py`, `reservations.py`, `menu.py`
- `app/services/reservation_service.py`, `menu_service.py`, `restaurant_service.py`, `image_service.py`
- `app/models/reservation.py`, `user.py`, `menu_item.py`, `category.py`, `allergen.py`,
  `restaurant.py`, `restaurant_setting.py`
- `app/schemas/*` (referenced via routers)
- `alembic/env.py`, `alembic/versions/001_initial_schema.py` … `007_allergen_system.py`
- `requirements.txt`, `.env` (redacted), `.env.example`, `seed.py`, `tmp_regress.py`
- `casa_aurelia.db` (read-only), `uploads/` (read-only)

**Frontend**
- `vite.config.ts`, `index.html`, `dist/index.html`, `dist/assets/*`, `package.json`,
  `package-lock.json`, `.oxlintrc.json`, `tsconfig*.json`
- `src/main.tsx`, `src/App.tsx`
- `src/utils/helpers.ts`, `src/utils/constants.ts`
- `src/pages/ContactPage.tsx`, `src/components/home/HeroSection.tsx`,
  `src/pages/AboutPage.tsx`, `src/components/home/ExperienceSection.tsx`
- Full `src/**` CSP pattern scans (eval/Function/WebSocket/worker/dangerouslySetInnerHTML/handlers)

**Repository meta**
- `.gitignore`, `backend/.gitignore`

## APPENDIX D — Exact Commands / Tests Executed

- `git rev-parse --is-inside-work-tree` / `git log --oneline` / `git status --short` (zero commits;
  all untracked; unchanged throughout).
- SHA-256 baseline + recheck of `backend/app/**` and `frontend/src/**` before/after audit → identical
  (proves no source modification).
- Read-only API checks via Python `urllib`: `/api/health`, `/api/menu`, availability, admin 401 → login
  200 → authorized 200.
- Read-only DB queries: reservation/menu/allergen/category/user/restaurant/featured counts;
  `alembic heads` → `007_allergen_system`.
- Frontend route checks: 6 routes via `Invoke-WebRequest` → all 200.
- Static scans: `Select-String`/grep over migrations (op.execute/SQLite/DateTime/etc.), CSP patterns,
  env var usage, and a byte-level em-dash encoding check of `dist/index.html` (UTF-8 intact).
- Confirmations: `npx vite build` (existing output), `npm run lint`, `tsc -b` (only pre-existing issues).

All temp scripts were deleted; no new files were introduced into the repository.

## APPENDIX E — Final git diff / status

The repository has **zero commits** (branch `main`, nothing committed), so there is no `git diff`
to display. `git status --short` at the start and end of the phase is identical:
```
?? .env.example
?? .gitignore
?? Phase8A_Report.md
?? backend/
?? frontend/
```
No new tracked or untracked files were introduced by this audit. This is itself flagged as FINDING E1
(P1): the absence of an initial commit removes any git-level guarantee of "no unintended changes."

---

**PHASE 8B COMPLETE**

**AUDIT-ONLY** — no source files modified.

**ZERO SOURCE MODIFICATIONS** — verified by identical SHA-256 baselines of `backend/app` and
`frontend/src` before and after the audit, and by unchanged `git status`.

**ZERO MIGRATIONS CREATED** — Alembic head unchanged at `007_allergen_system`.

**ZERO DEPENDENCY CHANGES** — `requirements.txt` / `package.json` / `package-lock.json` untouched.

**ZERO DATABASE SCHEMA CHANGES** — all DB access was read-only.

**REGRESSION BASELINE INTACT** — all backend endpoints, frontend routes, menu/reservation/allergen
counts, and the empty `uploads/menu` verified after the audit.
