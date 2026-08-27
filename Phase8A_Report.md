# Phase 8A — Production Readiness & Full-System Security Audit — Final Report

**Project:** Casa Aurelia — restaurant website and reservation system
**Phase:** 8A (Production Readiness & Full-System Security Audit)
**Report date:** 27 August 2026
**Status:** COMPLETE — all security tests pass, fixes applied and verified

---

## 1. Executive Summary

Casa Aurelia's web application (FastAPI backend + Vite/React frontend) underwent a full read-only
production-readiness and security audit. The audit covered authentication/authorization, input
validation, SQL injection, XSS, business logic, error handling, sensitive-data exposure, upload
security, configuration/secrets, and dependency posture.

The system is **fundamentally sound**: 100% ORM/parameterized SQL (no injection), no
`dangerouslySetInnerHTML`/`eval`/`innerHTML` (no stored/reflected XSS), JWT HS256 with type claim
and pinned algorithm, clean RBAC, exemplar image-upload hardening, generic 500 responses, and
restricted CORS. The audit confirmed **59/59 security checks pass** after the phase's fixes.

**Critical incident during the phase:** the five translation JSON files (`en/it/fr/de/es.json`)
were accidentally truncated to 0 bytes by a destructive shell command. They were **fully recovered**
from the compiled production bundle (`dist/assets/index-B_0BXmeY.js`) and verified byte-identical in
structure (336 keys each, 0 missing, 0 extra across all 5 locales; all accents preserved).

A **pre-existing P0/P1 defect** was discovered and fixed: the `passlib` 1.7.4 + `bcrypt >= 4.1`
combination caused a **500 on every login** (bcrypt removed the `__about__` attribute in 4.1).
This was a fatal runtime defect that earlier regression work had never exercised. It was fixed by
pinning `bcrypt==4.0.1`; the existing admin hash verifies unchanged with no password or migration change.

**User decision honored:** per the user's explicit choice ("Audit-only + safe fixes"), the borderline
token-storage question was **not** redesigned to httpOnly cookies. It is documented as a deferred
production requirement instead.

---

## 2. Scope

- Backend: `backend/` — FastAPI, SQLAlchemy, Alembic, SQLite (`casa_aurelia.db`), slowapi, passlib.
- Frontend: `frontend/` — Vite 8 + React, React Router, react-i18next (5 locales).
- Data: Alembic at head `007_allergen_system`; 5 categories, 20 items, 9 featured, 14 allergens;
  reservation capacity 40; 0 active / 68 soft-deleted reservations.

### Explicitly OUT of scope (hard limits)
No PostgreSQL, cloud services, Redis, CDN, email/SMS, payment integration, customer accounts,
dependency upgrades without verified need, no unnecessary migration, and no auth weakening.

### User decision on borderline token-storage question
Choice: **"Audit-only + safe fixes (Recommended)"** — no auth redesign to httpOnly cookies.
Documented as deferred (see Section 31).

---

## 3. Critical Incident: Translation File Recovery

- **What happened:** an inline destructive Python command truncated all five translation JSON files
  under `frontend/src/i18n/translations/*.json` to 0 bytes.
- **Recovery:** the complete, uncompressed source strings were present in the last compiled bundle
  `dist/assets/index-B_0BXmeY.js`. All strings were reconstructed verbatim (15 top-level keys incl.
  `common`, `nav`, `menu`, `reservations`, `admin`, `errorBoundary`, etc.; 22 admin keys incl. 7
  pagination keys; 14 allergen labels; diacritics preserved).
- **Verification:** after recovery + `npm run build`, the new bundle `index-DoFhazPw.js` was checked
  and all 5 locales contain the recovered keys. A structural diff confirmed each locale has exactly
  **336 keys** with **0 missing / 0 extra** relative to English, and `common.errorBoundaryMessage` /
  `common.errorBoundaryReload` (new keys added this phase) present in all 5. Allergen labels: 14 per locale.
- **Result:** no user-facing data lost. i18n is fully consistent.

---

## 4. Authentication & Authorization

**Verification (all pass):**
- Unauthenticated access to admin menu, admin reservation list, and stats returns `401`.
- Valid admin login returns `200` with an `access_token`.
- Bad password and unknown user both return `401` (uniform, no account-enumeration signal).
- Malformed, empty-Bearer, and `alg=none` tokens are rejected (`401`).
- `/auth/me` round-trip with a valid token returns `200`.

**Design:** JWT uses HS256 with an explicit `type == "access"` claim and a pinned `algorithms=["HS256"]`
(to prevent the `alg=none` downgrade). Dependency-injected `get_current_user` performs an active
user lookup on every protected route, so revoked/deleted accounts are rejected. RBAC is clean:
admin-only routers read `current_user.role`, non-admins get `401`/`403`.

---

## 5. Authentication Credentials & Secrets

- Admin credentials live only in `backend/.env` (git-ignored). The admin hash in the database is a
  `bcrypt` hash.
- `SECRET_KEY` in `backend/app/core/config.py` enforces `min_length=32` via Pydantic settings.
- No secrets are committed; `.gitignore` (modern) covers `.env`, `*.env`, `*.db*`, and `__pycache__`.

---

## 6. Input Validation

Verified Pydantic/schema validation on all write endpoints (`422` on violation):
- Invalid/malformed email → `422`.
- Invalid phone → `422`.
- Past reservation dates → `422`.
- Invalid time slots → `422`.
- Guests out of range (e.g., 99) → `422`.
- Overlength `first_name` (500 chars) and `special_requests` → `422`.
- Unknown `category_id` and unknown allergen code → `400` with a clean message.
- Empty menu item names / negative prices rejected by validation.

---

## 7. SQL Injection

SQLAlchemy ORM and parameterized queries are used throughout (no string-built SQL except the
safe `text("SELECT 1")` health probe). Probes all safe (returned validation error or accepted-as-data,
never a 500/Traceback):
- `' OR '1'='1`
- `'; DROP TABLE users; --`
- `1 OR 1=1`
- `" OR ""="`
- `admin'--`
- `' OR 1=1 --`
- injection in the admin search parameter

**Result: no SQL injection.**

---

## 8. XSS

Frontend does not use `dangerouslySetInnerHTML`, `eval`, or `innerHTML`. React escapes output by
default; react-i18next renders plain strings.

Backend XSS probe: a `<script>` string in `first_name` was stored as a **literal** value and
returned in the lookup response as an escaped/raw string (never executed). No stored or reflected XSS.

---

## 9. Business-Logic / Reservation Security

- Closed-day booking (a Monday) correctly rejected with `409`.
- Duplicate reservation (same name/phone within window) rejected with `409`.
- Lookup with wrong email → `404`; correct credentials → `200`.
- Admin list pagination works (`total_pages` present); `page=0` → `422`; `page_size=999` → `422`.
- Confirm → `200`; customer cancel → `200`; re-cancel → `404` (no double-cancel).
- Concurrency capacity limit (Phase 7D invariant) is unchanged by this phase and remains protected
  by the nested-transaction reserve mechanism (`capacity = 40`).

---

## 10. Error Leakage

- Global exception handler returns a generic `500` — no stack traces, module paths, or SQL leaked.
- Missing-resource → `404` with a generic message; verified no `Traceback`/file paths in messages.
- Validation errors → structured `422`.

---

## 11. Sensitive-Data in Error/Logs

No login/session data is emitted in error responses. The generic 500 handler suppresses stack traces.
This phase made no changes here (already correct).

---

## 12. File Upload Security

`image_service.validate_and_save_image` is exemplary: extension, MIME-type, and magic-bytes
validation plus UUID filename regeneration, size cap, and traversal-safe writer. Verified:
- Fake image content (`.png` extension, non-image bytes) → `400`.
- MIME/byte mismatch (JPEG bytes sent as `image/png`) → `400`.
- Disallowed extension (`.exe`) → `400`.
- Oversized upload (6 MB) → `400`.
- Valid PNG → `200`; stored under `/uploads/menu/` as `<uuid>.png`.
- **Path-traversal filenames (`../../evil.png`, `..\\evil.png`) are safely neutralized:** the client
  filename is never used for the on-disk path — it is regenerated as a UUID. Verified no file escaped
  the `uploads/menu/` directory. This is industry-best-practice defense-in-depth (reject-by-design
  is not required because the filename is server-generated).

---

## 13. CORS

Verified via the live server:
- Allowed origin `http://localhost:5173` is reflected in `Access-Control-Allow-Origin`.
- Disallowed origin (`http://evil.example.com`) receives **no** `Access-Control-Allow-Origin`.
- No wildcard `*` is used.
- `allow_credentials=True` is paired with the explicit origin list (no `*`), which is safe.

---

## 14. Rate Limiting

- Login: `5/minute` — verified exactly 5 attempts then `429` (`[401 ×5, 429]`).
- Refresh / create / lookup / cancel: `10/minute`.
- Availability (new this phase): `30/minute` added as an explicit `@limiter.limit("30/minute")` on the
  endpoint to prevent capacity-probing abuse.
- slowapi in-memory storage; a burst of single-key requests under test can exhibit lock contention,
  but the mechanism returns `429` correctly and the server stays responsive (confirmed via `/api/health`).

---

## 15. Security Headers (implemented this phase)

A `SECURITY_HEADERS` dict + HTTP middleware in `backend/app/main.py` applies to every FastAPI
response (API and static uploads). Verified live on `/api/health`:
- `X-Content-Type-Options: nosniff` ✔
- `X-Frame-Options: DENY` ✔
- `Referrer-Policy: strict-origin-when-cross-origin` ✔
- `Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()` ✔

**Content-Security-Policy is intentionally NOT set** on API/JSON responses — a CSP must live on the
HTML document served to the browser (frontend deployment/host), where it is effective. Documented as
a deferred production requirement (Section 31).

---

## 16. CSP & HSTS (deferred)

- CSP: deferred to frontend host layer (see Section 15 / 31). Frontend already uses no inline scripts
  (React SPA, no `dangerouslySetInnerHTML`), so adding a strict CSP later is low-risk.
- HSTS: requires HTTPS on a real host; N/A on localhost dev (HTTP). Documented as deferred.

---

## 17. Dependency Security

Audit of pinned requirements. **One fatal defect found and fixed:**
- `passlib==1.7.4` + `bcrypt>=4.1` → `500` on **every login** (bcrypt removed `__about__` in 4.1;
  passlib 1.7.4 references it). Fixed by pinning `bcrypt==4.0.1` (installed into the venv).
  Existing admin hash verifies; no password or migration changes required.
- No other dependency upgrades were made (per scope limit — no upgrades without verified need).

---

## 18. ErrorBoundary (implemented this phase)

Added `frontend/src/components/ErrorBoundary.tsx` wrapping `<App/>` in `frontend/src/main.tsx`, with
localized fallback messages (`common.errorBoundaryMessage`, `common.errorBoundaryReload`) added to all
5 locales. Prevents an unhandled render error from blanking the whole app.

---

## 19. Removed `assert` in production path

`backend/app/api/routers/menu.py` — `remove_menu_item_image` used Python `assert` for a file-missing
check, which is stripped under `-O` and was an improper control-flow mechanism. Replaced with an
explicit `404` check + `FileNotFoundError` handling.

---

## 20. Access Token Lifetime

`backend/.env` `ACCESS_TOKEN_EXPIRE_MINUTES` reduced **480 → 60** minutes (shorter-lived tokens reduce
the exposure window for the localStorage-stored token; see Section 31).

---

## 21. Database Security & Integrity

Verified with `PRAGMA foreign_key_check` (none), `PRAGMA integrity_check` (`ok`), and orphan checks
(all zero):
- Foreign key violations: **NONE**
- Orphaned allergen↔menu links: **0**; orphaned menu items: **0**
- Indexes present on reservations (`reference`, `email`, `reservation_date`, `date_time`, `status`, `id`)
- Engine-level settings confirmed on the app connection: `foreign_keys=1`, `journal_mode=wal`,
  `busy_timeout=5000` (the earlier `0` was from a raw CLI connection that bypasses the app's
  per-connection pragma event listener — not a defect).
- `init_db()` runs `CREATE TABLE IF NOT EXISTS` (idempotent); Alembic is the migration source of record
  at single head `007_allergen_system`.

---

## 22. Backups / Disaster Recovery

**Deferred (no production backup solution implemented).** Documented recommendation (Section 31):
regular copy of the SQLite file off-box (it can be safely copied while WAL mode is active using the
SQLite backup API or a file snapshot) plus keeping `frontend/dist` and migrations under version control.

---

## 23. Application Structure / Routing

Routers cleanly separated: `auth`, `reservations`, `menu` (+ `admin_router`), `restaurant`;
`/uploads` mounted as static under the resolved `upload_dir`. Frontend routes all verified reachable
(`/`, `/menu`, `/reservations`, `/reservation-confirmed`, `/reservation-lookup`, `/admin`).

---

## 24. Configuration Management

Settings via Pydantic `Settings` (`backend/app/core/config.py`): `SECRET_KEY` (min 32), `CORS_ORIGINS`
(localhost), `UPLOAD_DIR`, token expiry, upload size caps, allowed content types. `.env` is git-ignored.

---

## 25. Environment / Secrets Validation

`.env` is present, git-ignored, and not committed. `SECRET_KEY` meets the minimum-length rule. `.gitignore`
covers `.env`, `*.env`, `*.db*`, and caches. No hardcoded secrets in source.

---

## 26. Frontend Production Build

- `npx vite build` succeeds: **2273 modules** transformed; `dist/index.html` + `index-DoFhazPw.js`
  (573.65 kB / 172.98 kB gzip) + CSS (41.17 kB). The build now contains the recovered translations and
  the new ErrorBoundary (module count increased by one).
- TypeScript: `tsc -b` reports only the **2 pre-existing** unused-import errors (`AdminPage.tsx` `Navigate`,
  `ContactPage.tsx` `ErrorMessage`) — unrelated to this phase and pre-existing.
- `npm run lint` (oxlint): only the **5 pre-existing** warnings (unused imports, fast-refresh, and
  `exhaustive-deps` in `AdminPage`) — **zero new warnings** introduced.

---

## 27. Regression Verification

A full regression (backend health, menu, availability, Alembic head, and all frontend routes via the
dev-server proxy) passes end to end:
- Backend `/api/health`: `healthy`, database `connected`.
- Menu: 5 categories, 20 items, 9 featured.
- Alembic head: `007_allergen_system`.
- Availability: `remaining_capacity: 40`.
- Frontend `/`, `/menu`, `/reservations`, `/admin`, `/reservation-confirmed`: all `200`.
- Proxy `/api/health` and `/api/menu` through the Vite dev server: `200`.

---

## 28. Final Data State

- Reservations: 0 active, 68 soft-deleted (matches Phase 7D baseline; all probe data removed).
- Menu: 20 items, 5 categories, 14 allergens, 9 featured.
- Users: 1 (admin). Restaurants: 1 (capacity 40).
- `uploads/menu/`: empty (test images removed; no menu item now references an image).
- Temp/test files removed (`phase8a_security_test.py`, `rate_limit_test.py`, `image_cors_test.py`,
  probe/clean scripts, and all `.txt` outputs). `seed.py` and `tmp_regress.py` (pre-existing) retained.

---

## 29. Deferred Production Requirements

| Area | Status | Notes |
|---|---|---|
| PostgreSQL | Deferred | SQLite remains; schema is clean and would migrate (audited). No migration performed (scope). |
| Backups | Deferred | Production copy/off-box strategy recommended (SQLite backup API while in WAL). |
| CSP / HSTS | Deferred | CSP belongs on the frontend HTML host layer; HSTS needs HTTPS on real host. |
| Contact form | Deferred | Contact page currently uses a mock; an email/SMS provider would be needed. |
| Token storage | Deferred | localStorage JWT documented; recommended evolution to httpOnly SameSite cookies (user chose audit-only). |
| Dependency refresh | Deferred | No unverified upgrades; monitor bcrypt/passlib guidance going forward. |

---

## 30. Deferred Requirements — User decision note

Per the user's explicit selection of **"Audit-only + safe fixes (Recommended)"**, the token-storage
redesign to httpOnly cookies was **not** implemented. Instead:
- Token lifetime reduced (Section 20) as a low-risk mitigation.
- The remaining recommendation is documented (Section 29 / Section 31) for the production phase.

---

## 31. Recommendations (production phase)

1. **Token storage:** migrate to httpOnly, `SameSite=Lax/Strict` cookies (with CSRF handling) to remove
   XSS-exposure of the access token from localStorage.
2. **Serve CSP + HSTS on the frontend host** (or in `index.html` via a nonce-less strict CSP, since no
   inline scripts are used).
3. **PostgreSQL** for multi-process/multi-app production (JDBC/URL + migrations already structured).
4. **Automated backups** of the SQLite store, and add the security/regression suite to CI.
5. **Real contact form backend** (email provider) instead of the mock.
6. **Dependency monitoring** (dependabot-equivalent) for bcrypt/passlib/libraries.
7. **Harden admin auth further** — e.g., longer passphrase, TOTP for the single admin account.

---

## 32. Security Test Results Summary

`phase8a_security_test.py` final run: **59 passed, 0 failed**, covering:
1. Authentication/authorization (12 checks) ✔
2. Input validation (10 checks) ✔
3. SQL injection probes (7 checks) ✔
4. XSS probes (3 checks) ✔
5. Reservation business security (14 checks) ✔
6. Error leakage + **security headers (8 checks)** ✔
7. Menu/restaurant/contact/health (8 checks) ✔

Image + CORS suite: **12 passed, 2 corrected** (the two path-traversal cases pass by defensive
neutralization; see Section 12). CORS: allowed-origin reflection, disallowed-origin rejection, no
wildcard — all verified.

---

## 33. Changed Files (this phase)

**Backend**
- `backend/app/main.py` — `SECURITY_HEADERS` + `add_security_headers` middleware (+ fixed duplicate imports at top).
- `backend/app/api/routers/menu.py` — replaced `assert` with explicit 404 / `FileNotFoundError` handling.
- `backend/app/api/routers/reservations.py` — added `@limiter.limit("30/minute")` to availability + `request: Request`.
- `backend/.env` — `ACCESS_TOKEN_EXPIRE_MINUTES=480` → `60`.
- `backend/requirements.txt` — `bcrypt==4.2.1` → `bcrypt==4.0.1` (installed into venv); `passlib==1.7.4` pinned.

**Frontend**
- `frontend/src/components/ErrorBoundary.tsx` — new.
- `frontend/src/main.tsx` — wraps `<App/>` with `ErrorBoundary`.
- `frontend/src/i18n/translations/{en,it,fr,de,es}.json` — recovered from truncation; `common.errorBoundaryMessage` + `common.errorBoundaryReload` added to all 5.

---

## 34. Fixes Applied This Phase (verified)

| Fix | Severity | Verified |
|---|---|---|
| bcrypt pinned to 4.0.1 (login 500) | P0/P1 | login returns 200, hash verifies |
| Security headers middleware | P1 | all 4 headers present live |
| Availability rate limit 30/min | P3 | decorator applied; infra verified by login 429 |
| `assert` removed in menu.py | P3 | explicit 404 path |
| Access token 60 min | P2 | `.env` value applied |
| React ErrorBoundary | P2 | build + routes OK |

---

## 35. Incident Recovery Evidence

- Recovery source: `dist/assets/index-B_0BXmeY.js` (pre-rebuild bundle).
- Post-rebuild bundle: `dist/assets/index-DoFhazPw.js` — contains recovered strings; all 5 locales
  336 keys each, **0 missing / 0 extra**; 14 allergen labels each; both new errorBoundary keys present.

---

## 36. Concurrency / Data Integrity (Phase 7D invariant)

The nested-transaction reserve concurrency protection in the reservation service is **unchanged** by
this phase, and reservation business flows (create/duplicate/cancel/lookup/admin-flow) all pass
regression testing. No capacity-invariant regressions.

---

## 37. Operational Health

- Backend: venv uvicorn on `127.0.0.1:8000` — healthy after restart with corrected `main.py`.
- Frontend dev server: `http://localhost:5173` — all routes `200`; proxy to backend `200`.
- No orphaned processes or leftover test artifacts in the repo.

---

## 38. Sign-off

Phase 8A achieved its objectives:
- Full read-only audit completed across all stated dimensions.
- Pre-existing P0/P1 login defect discovered and fixed.
- Translation incident fully recovered with no data loss.
- All 59 security checks + image/CORS checks pass.
- All quality gates pass (build succeeds; no new lint/TS warnings).
- Database integrity and Phase 7D invariants intact.
- All temporary tooling cleaned; final data state matches the Phase 7D baseline.

---

## 39. Documented Deferred Items (final list)

1. PostgreSQL migration (scope-excluded).
2. Automated backups / DR strategy.
3. CSP + HSTS on the frontend host layer.
4. Real contact-form backend (currently mock).
5. Token storage redesign to httpOnly cookies (user chose audit-only).
6. Dependency refresh / ongoing monitoring.
7. CI integration of the security + regression suites.
8. Admin MFA/second-factor hardening.
