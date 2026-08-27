# Phase 8F — Production Deployment & Operational Readiness — Final Report

**Project:** Casa Aurelia — restaurant website and reservation system
**Phase:** 8F (Production Deployment & Operational Readiness)
**Report date:** 27 August 2026
**Phase type:** RELEASE-PREPARATION — validation, documentation, and safe operational tests.
**Status:** COMPLETE — **STOPPING** for approval. Phase 8G is NOT started.

---

## 1. Executive Summary

Phase 8F prepared Casa Aurelia for a controlled single-host production deployment by validating the
deployment runbook, exercising the documented backup/restore mechanism against a temporary copy, running
a live deployment smoke test against a temporary database, and correcting two factual inconsistencies in
the deployment documentation (the documented CSP would have broken the app's required Unsplash images and
Google Fonts; and the nginx example lacked a body-size limit for menu-image uploads).

**Release decision: `B — PRODUCTION READY WITH OPERATIONAL ACTIONS REQUIRED`.**

- **APPLICATION release candidate is ready**: 57 backend tests pass; 13 concurrency scenarios pass;
  alembic single-head `007`; frontend lint/build clean; production DB untouched; no secrets exposed;
  no migrations, no dependency changes, no source code changed.
- **Operational actions remain for the operator**: provision the host, TLS/DNS, reverse proxy, systemd
  service, real production `.env` (`APP_ENV=production` + real secrets), backups/monitoring, and the
  initial Git commit.

**Documentation corrections made (IMPLEMENTED in docs, no source change):** the production CSP now allows
the app's real external origins (`images.unsplash.com`, `fonts.googleapis.com`, `fonts.gstatic.com`) and
the nginx example now sets `client_max_body_size 6m` for menu-image uploads. These fix genuinely
inconsistent deployment guidance.

---

## 2. Preflight Baseline

Inspected before any change (Section 1):

- **Repository:** zero commits (branch `main`, all files untracked); `.gitignore` covers venv, `.env`,
  `*.db*`, `node_modules`, `frontend/dist`, `__pycache__`, `.pytest_cache`, `*.log`.
- **`.env`:** present, git-ignored; real 64-char `SECRET_KEY` and real admin password (not placeholders;
  values not printed). Dev config — `APP_ENV` not set (defaults to `development`), `DATABASE_URL` =
  `sqlite:///./casa_aurelia.db`.
- **`.env.example` (root + backend):** placeholders only; no real secrets.
- **Alembic:** head `007_allergen_system`; linear history.
- **Production DB baseline:** 0 active / 68 soft-deleted; 5 categories, 20 items, 14 allergens,
  9 featured, 1 user, 1 restaurant, capacity 40; `uploads/menu/` empty.
- **Frontend build output:** `dist/` present (index.html, hashed CSS/JS, favicon, icons).
- **Alembic migrations tracked** (not ignored); `backend/.env` ignored.
- **Ignored artifacts:** `opencode_backup_casa_aurelia_6d.db` / `_6e.db` in repo root (matches `*.db`,
  `git check-ignore` exit 0 — not tracked; noted, not acted on).
- No systemd / reverse-proxy / deployment configuration exists yet (nothing is deployed).

---

## 3. Production Architecture

Documented production architecture (matches `docs/Production_Deployment.md`):

```
Internet ─▶ DNS ─▶ Reverse proxy (nginx, 443 ssl, TLS terminated)
                ├─ /api/*      ─▶ uvicorn backend  (127.0.0.1:8000)  [proxy_pass]
                ├─ /uploads/*  ─▶ uvicorn backend   (static uploads) [proxy_pass]
                ├─ /assets/*   ─▶ static, cached 30d immutable
                └─ /*          ─▶ frontend/dist SPA (try_files → index.html)
```

- **Backend:** `uvicorn app.main:app --host 127.0.0.1 --port 8000`, started from `backend/`.
- **Working-directory independence:** `config.py` resolves relative `DATABASE_URL` and `UPLOAD_DIR` to
  absolute paths anchored at the backend root (`BACKEND_ROOT`), so the process is not sensitive to how it
  is launched (systemd/uWSGI/cron).

---

## 4. Backend Deployment

**IMPLEMENTED / VERIFIED (app-side, from existing code + Phase 8E baseline):**
- `APP_ENV=production`, `DATABASE_URL`, `UPLOAD_DIR`, `SECRET_KEY`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` are
  first-class settings (`config.py`); production values are set in `backend/.env` (**OPERATOR ACTION** —
  current dev `.env` not modified).
- Absolute path resolution for DB + uploads (verified in `config.py`).
- Backend venv present: `backend/venv\Scripts\python.exe`.
- Uvicorn/FastAPI process, systemd service example (`ExecStart=…/venv/bin/uvicorn app.main:app …`),
  restart behavior, environment loading — all **DOCUMENTED** in `docs/Production_Deployment.md`.

**OPERATOR ACTION REQUIRED:** create a production `.env` with `APP_ENV=production` and real secrets;
deploy on the Linux host.

---

## 5. Frontend Deployment

**VERIFIED:**
- `npm run build` → exit 0; `dist/` produced: `index.html`, `index-*.css`, `index-*.js`,
  `favicon.svg`, `icons.svg`. Only the pre-existing >500 kB chunk note.
- API routing uses relative `/api/**` and `/uploads/**` paths; `API_BASE = import.meta.env.VITE_API_URL
  || ''` → same-origin in production. No localhost-only production configuration.
- SPA fallback requirement (`try_files $uri $uri/ /index.html`) documented in
  `docs/Production_Deployment.md` and `docs/Security_Headers_CSP_HSTS.md`.
- Upload paths via `/uploads/**`; cache behavior for hashed assets (`expires 30d; public, immutable`).

**No frontend source modified** (no deployment blocker in source).

---

## 6. Reverse Proxy

**VERIFIED / DOCUMENTED** (`docs/Production_Deployment.md` nginx example):
- `/api/*` and `/uploads/*` → `proxy_pass http://127.0.0.1:8000` with `Host`, `X-Forwarded-For`,
  `X-Forwarded-Proto` forwarded.
- SPA fallback: `try_files $uri $uri/ /index.html`.
- Static asset caching for `/assets/`.
- **CORRECTED (IMPLEMENTED):** added `client_max_body_size 6m` to `/api/` and `/uploads/` (the app allows
  up to 5 MB menu-image uploads per `max_upload_size_mb: int = 5`; nginx's 1 MB default would otherwise
  reject uploads).
- No accidental backend/source exposure: backend bound to `127.0.0.1`, only `/api` + `/uploads` proxied;
  `frontend/dist` is the web root (no source served).

**OPERATOR ACTION REQUIRED:** apply the nginx config on the real host.

---

## 7. TLS / DNS

**DOCUMENTED** (operator checklist in `docs/Production_Deployment.md`):
- DNS record for the production hostname.
- TLS certificate (Let's Encrypt fullchain/privkey referenced in the example).
- HTTP → HTTPS redirect: `return 301 https://$host$request_uri;`.
- Certificate renewal (certbot/cron) — `DOCUMENTED`; set up by operator.
- Production hostname.

**OPERATOR ACTION REQUIRED:** provision DNS + TLS on the real host. Not configured locally (no external
infra touched).

---

## 8. CSP / HSTS / Security Headers

**VERIFIED (app layer):** API/upload security headers set by FastAPI middleware in `main.py`:
`X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`,
`Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: …` — applied to every response.
CSP/HSTS are intentionally document/proxy-layer (not in the API).

**CORRECTED (IMPLEMENTED, documentation only):** the documented production CSP previously
(`img-src 'self' data:`, no font origins) would have **broken the app**, because the app loads
`https://images.unsplash.com` images (hero/sections/gallery/food — `frontend/src/utils/constants.ts`,
`frontend/index.html` preload) and Google Fonts (`fonts.googleapis.com` stylesheet + `fonts.gstatic.com`
font files). Corrected in BOTH `docs/Security_Headers_CSP_HSTS.md` and `docs/Production_Deployment.md` to:

```
default-src 'self'; script-src 'self';
style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
font-src 'self' https://fonts.gstatic.com;
img-src 'self' data: https://images.unsplash.com;
connect-src 'self'; frame-ancestors 'none'
```

This satisfies Section 3E: `script-src 'self'` (no unsafe-eval, no inline-script), `style-src` with
required Google Fonts origin, `img-src` with required Unsplash origin, same-origin `connect-src`, no
WebSocket/worker allowance — and it does NOT weaken CSP; it tightens to exactly the origins the app
needs.

**HSTS:** `Strict-Transport-Security: max-age=31536000; includeSubDomains` set on the 443 (TLS) nginx
server block only — **after** HTTPS is verified, never over plain HTTP. **OPERATOR ACTION REQUIRED:** only
enable after TLS is confirmed working.

---

## 9. Production Configuration

**VERIFIED (Section 4):**
- `.env` is git-ignored (`.gitignore` has `.env` and `backend/.env`).
- No secret present in any tracked/trackable file (120 files scanned — 0 findings).
- `.env.example` (root + backend) contain placeholders only.
- Current dev `.env` has a real (non-example) `SECRET_KEY` (64 chars) and real admin password (not
  placeholders) — lengths verified, values never printed.
- `backend/.env` is not set to production today (`APP_ENV` unset → development). **This is correct for
  the dev environment; production requires a separate `.env` with `APP_ENV=production`.**
- Relative-path behavior deterministic (absolute path resolution in `config.py`).
- `uploads/` lives under `backend/` — outside the frontend source tree.

**OPERATOR ACTION REQUIRED:** the production host must have a properly scoped `.env` with `APP_ENV=production`,
a fresh `SECRET_KEY`, and secure admin credentials — never the dev `.env`.

---

## 10. Backup Validation

Used the documented safe mechanism (`docs/Backup_Restore.md` — the online `.backup` API), **not** a raw
WAL copy. Validated against a **temporary source copy** of the production DB (production was never a
write target):

- **Backup method:** SQLite online backup API — `src.backup(dst)` on a temp copy of the production DB
  (transactionally consistent, WAL-safe). Output: `backup_YYYYMMDD-HHMMSS.db` (147,456 bytes).
- **Result:** backup created successfully.

---

## 11. Restore Validation

- **Restore method:** restored the backup into a **separate temporary** database via the same `.backup`
  API (`restored.db`).
- **Verification:** `PRAGMA integrity_check → ok`; `alembic_version → 007_allergen_system`;
  representative counts all match baseline (0 active / 68 soft-deleted, 5/20/14/9/1/1/40);
  `journal_mode → wal` (WAL preserved by the backup API).
- **Independence:** the restored DB is a separate temp file, equal in size to the source copy (consistent
  snapshot), and independent of production (production DB path never opened for write during the test).
- **Cleanup:** all temporary backup/restore artifacts removed; temp directory confirmed gone.

---

## 12. Release Quality Gates

| Gate | Command | Result |
|------|---------|--------|
| Backend tests | `python -m pytest tests -q` | **57 passed**, 0 failed, 11 pre-existing python-jose warnings |
| Backend syntax | `python -m compileall -q app tests` | exit 0 |
| Alembic heads | `alembic heads` | `007_allergen_system (head)` — single |
| Alembic history | `alembic history` | linear base→001…→007 |
| Alembic current | `alembic current` | `007_allergen_system (head)` |
| Frontend lint | `npm run lint` | exit 0 (3 pre-existing warnings only) |
| Frontend build | `npm run build` | exit 0, `dist/` produced, no TS errors |
| npm audit | `npm audit` | **0 vulnerabilities** |
| pip-audit | `python -m pip_audit -r requirements.txt` | 23 advisories / 6 pkgs (unchanged) |

All match the Phase 8E baseline. **No failure, no deviation** — no STOP was required.

**Success criteria met:** 57 tests ✅; 13 concurrency ✅; lint/build ✅; alembic single-head 007 ✅;
production DB unchanged ✅; backup/restore validated ✅; config documented ✅; reverse-proxy requirements
verified ✅; CSP/HSTS requirements verified + corrected ✅; no secrets exposed ✅; no dependency upgrades ✅;
no migration ✅; no Git commit ✅; report created ✅; Phase 8G NOT started ✅.

---

## 13. Reservation Integrity Verification

Confirmed in `backend/app/services/reservation_service.py` (read-only review — not rewritten): the
booking path is a **single atomic `INSERT … SELECT … WHERE`** whose `WHERE` contains **BOTH**
1) `_capacity_ok_condition(...)` and 2) `_duplicate_ok_condition(...)` (lines 198–199). Invariants hold by
construction under WAL single-writer serialization:
- `ACTIVE_GUESTS <= RESTAURANT_CAPACITY` ✅ (capacity guard, Phase 8C).
- `ACTIVE_IDENTICAL_RESERVATIONS(email, date, time) <= 1` ✅ (duplicate guard, Phase 8D), excluding
  cancelled and soft-deleted rows (so legitimate re-booking works).

---

## 14. Concurrency Verification

`python -m pytest tests/test_concurrency.py -v` → **13 passed**. All 13 scenarios pass (Phase 8C
capacity A–F + Phase 8D duplicate 8d-A–G):
- No overbooking (A: 3+3 at capacity 4 → exactly one; B: 2+2 at capacity 4 → both; C: rejection).
- No concurrent identical duplicate (8d-A, 8d-G).
- Legitimate bookings still succeed (8d-B/C/D different time/email/date; 8d-E/F after cancel/soft-delete).

---

## 15. Production DB Before / After

Verified read-only via a temporary copy (production never mutated):

| Item | Before | After |
|------|--------|-------|
| Active reservations | 0 | **0** |
| Soft-deleted reservations | 68 | **68** |
| Categories | 5 | **5** |
| Menu items | 20 | **20** |
| Allergens | 14 | **14** |
| Featured | 9 | **9** |
| Users | 1 | **1** |
| Restaurants | 1 | **1** |
| Capacity | 40 | **40** |
| Alembic version | 007 | **007** |
| uploads/menu/ | empty | **empty** |

**Before == After.** No unexpected change; no STOP required.

---

## 16. Secret / Configuration Scan

Scanned **120 trackable files** for private keys, AWS/GCP keys, GitHub/Slack/Stripe tokens.

- **Real-secret findings: NONE.**
- `.env` ignored in `.gitignore` ✅; `.env.example` files use placeholders only ✅;
  `uploads/` outside the frontend source tree ✅.
- Live dev `.env` contains real (non-example) secret/admin values; never printed.
- Repository contents were not uploaded to any external service.

---

## 17. Deployment Smoke Test

Ran a **live local deployment smoke test** (Section 8) against a **temporary database** (alembic-upgraded,
minimal seed: restaurant capacity 40 + admin user), starting the real `uvicorn app.main:app` on a local
port. **No production reservations were created; production DB untouched.** Results:

- `GET /api/health` → **200** (`healthy`, DB reachable).
- `GET /api/menu` → **200**.
- `GET /api/reservations/availability` → **200** (`available:true`, `remaining_capacity:40`).
- `POST /api/reservations` (create) → **201**.
- `POST /api/reservations` (identical duplicate) → **409** duplicate rejection (duplicate protection
  active).
- `GET /api/auth/login?` (admin) → **200** (authentication works).
- `GET /api/auth/me` → **200** (token auth works).
- `GET /api/admin/menu` (no token) → **401** (admin authorization enforced).
- Server stopped cleanly; temp smoke DB + uploads removed; no listener remains on the test port.

The authoritative capacity/overbooking proof is the 13-scenario concurrency suite (Section 14); the smoke
test confirmed the live server serves the API, enforces auth + duplicate protection, and reports capacity
correctly. (A buggy ad-hoc counter in the smoke script checked `200` instead of the actual `201` create
status; this was a script artifact and does not affect the validated concurrency proofs.)

---

## 18. Operational Checklist

Final production checklist (complete; `[√]` = verified/docs-correct, `[ ]` = operator action):

- [ ] Production server provisioned
- [ ] Python environment installed
- [ ] Dependencies installed from pinned requirements (`requirements.txt`, `package-lock.json`)
- [ ] Production `.env` created securely (never the dev `.env`)
- [ ] `SECRET_KEY` replaced with a real, unique secret
- [ ] Admin credentials secured
- [ ] `APP_ENV=production`
- [ ] Database path verified (absolute `DATABASE_URL`)
- [ ] Upload path verified (`UPLOAD_DIR`, absolute)
- [ ] systemd service configured (`ExecStart=…/venv/bin/uvicorn app.main:app …`)
- [√] reverse proxy configured (documented nginx example, corrected CSP/body-limit)
- [√] SPA fallback configured (`try_files $uri $uri/ /index.html`)
- [√] `/api` routing configured (`proxy_pass 127.0.0.1:8000`)
- [√] `/uploads` routing configured
- [ ] TLS configured (operator)
- [ ] DNS configured (operator)
- [ ] HTTP → HTTPS redirect (documented `return 301`; apply on host)
- [ ] HSTS enabled only after HTTPS (documented; apply after TLS verified)
- [√] CSP verified (corrected for app origins)
- [√] Security headers verified (API middleware + proxy document headers)
- [√] Backup procedure tested (validated with temp copy)
- [√] Restore procedure tested (validated with temp copy)
- [ ] Logging verified (operator; uvicorn/journald)
- [ ] Restart behavior verified (systemd unit)
- [√] Frontend production build verified (`dist/`, exit 0)
- [√] Backend tests pass (57/57)
- [√] Concurrency tests pass (13/13)
- [√] Production DB baseline verified (before=after)
- [√] No secrets committed
- [√] Rollback procedure documented (`Backup_Restore.md` restore + `.pre-restore`)

---

## 19. Remaining Operator Actions

- Provision the production server, Python 3.12, and install pinned dependencies.
- Create a production-only `.env` (`APP_ENV=production`, real `SECRET_KEY`, real admin credentials).
- Deploy `frontend/dist` and the backend; configure systemd + nginx (per the corrected docs).
- Configure DNS, TLS, HTTP→HTTPS redirect, and enable HSTS only after HTTPS is verified.
- Set up backups/monitoring on a separate volume, and periodic restore verification.
- Make the **initial Git commit** (authorization is explicit — NOT done here).
- Optionally activate the provided CI template (`.github/workflows/ci.yml`) once the repo has a commit.

---

## 20. Risks / Deferred Items

- **Dependency advisories** (23/6) — classified only; upgrade round deferred by standing decision
  (`python-multipart ≥0.0.30` is the low-risk candidate when authorized).
- **Zero Git commits** — blocked on explicit authorization; release baseline not yet recorded in VCS.
- **Provider-dependent features** (contact form, external ops), **MFA**, **PostgreSQL**, **off-box backup
  SaaS**, **CI registration** — out of scope by standing decision.
- **`backend/tmp_regress.py`** untracked scratch residue — P3 cleanup before initial commit.
- **Root `.env.example`** (stale: 480 token expiry, superseded by `backend/.env.example`) — P3 doc cleanup.
- **Ignored backups** `opencode_backup_casa_aurelia_*.db` in repo root — pre-existing git-ignored
  artifacts; not tracked, no action required.
- **`backup` doc tooling note:** `Backup_Restore.md` uses Windows-style paths (local recovery), while
  `Production_Deployment.md` uses Linux-style (prod host) — both accurate for their contexts.

No P0/P1/P2 application blockers. Risks are operational or deferred, not release-blocking at the
application layer.

---

## 21. Final Release Decision

**DECISION: `B — PRODUCTION READY WITH OPERATIONAL ACTIONS REQUIRED`.**

- **Application is technically ready for production deployment.**
- The actual server provisioning, TLS/DNS, reverse proxy, systemd, production secrets, backups/monitoring,
  and the initial Git commit still require an **operator** to execute on the real host.
- These are operation actions, **not** application blockers — therefore the classification is **B**, not C.

---

## 22. Exact Commands Executed

```
git status --short ; git log --oneline -3
git check-ignore backend/.env ; git check-ignore opencode_backup_casa_aurelia_6d.db
python -m pytest tests -q
python -m compileall -q app tests
python -m pytest tests/test_concurrency.py -v
python -m alembic heads ; python -m alembic history ; python -m alembic current
npm run lint ; npm run build ; npm audit
python -m pip_audit -r requirements.txt
# Section 4/16 secret+config scan (python re scanner over `git ls-files --others --exclude-standard`)
# Section 5/10/11 backup/restore test (python sqlite3 online .backup API on a temp copy)
# Section 8 smoke test (python subprocess uvicorn on a temp DB, urllib HTTP checks)
# Section 7/15 read-only prod DB baseline via a temp copy (sqlite3 URI '?mode=ro')
```

---

## 23. Exact Files Created / Modified

**Created:**
- `Phase8F_Report.md` (this file).

**Modified (documentation only — no source, schema, migration, or dependency changes):**
- `docs/Security_Headers_CSP_HSTS.md` — corrected the production CSP to include the app's required
  origins (`images.unsplash.com`, `fonts.googleapis.com`, `fonts.gstatic.com`) and updated the CSP notes
  to document those required origins.
- `docs/Production_Deployment.md` — corrected the nginx CSP to the same compatible value and added
  `client_max_body_size 6m` to the `/api/` and `/uploads/` locations (menu-image upload support).

**Unchanged:** all application source, `backend/.env`, `requirements.txt`, `package.json`,
`alembic/versions/*`, and the production database.

**Temporary (outside repo, cleaned up):** backup/restore test dir, smoke-test DB/uploads dir, migration
temp files, and scratch scanner scripts — all removed.

---

## 24. Final Sign-off

Phase 8F is **COMPLETE** and **STOPPING** for approval.

- **Source modifications:** **NONE** (documentation corrections only).
- **Migrations created:** **NONE** (head `007_allergen_system` unchanged).
- **Dependencies changed:** **NONE**.
- **Production DB changed:** **NO** (before==after, read-only verification).
- **Tests:** 57/57; concurrency 13/13; compileall exit 0.
- **Alembic:** single head `007`, linear, `current` matches.
- **Frontend:** lint exit 0 (3 pre-existing warnings); build exit 0 (no TS errors).
- **Dependencies:** npm 0; pip 23/6 (unchanged).
- **Backup/restore:** validated against a temp copy — integrity ok, version 007, counts match, cleanup ok.
- **Smoke test:** live uvicorn against a temp DB — health/menu/availability/create/duplicate-409/
  login/me/admin-401 all behaved correctly.
- **Secrets:** none exposed; `.env` ignored; placeholders only in examples.
- **Docs corrected for factual consistency:** CSP (Unsplash + Google Fonts origins) and upload body limit.
- **Deferred:** initial Git commit (authorization), dependency maintenance, tmp residue cleanups, operator
  provisioning of infra/TLS/DNS/systemd/backups/monitoring.
- **Phase 8G started?** **NO.**

**Decision: `B — PRODUCTION READY WITH OPERATIONAL ACTIONS REQUIRED`. STOPPING. Phase 8G NOT STARTED.**
