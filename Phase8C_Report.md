# Phase 8C — Production Hardening & Critical Fixes — Final Report

**Project:** Casa Aurelia — restaurant website and reservation system
**Phase:** 8C (Production Hardening & Critical Fixes)
**Report date:** 27 August 2026
**Phase type:** IMPLEMENTATION of the accepted Phase 8B P1/P2 hardening + critical fixes.
**Status:** STOPPING for approval — Phase 8D is **not** auto-started.

---

## 1. Executive Summary

Phase 8C implemented the accepted production-hardening and critical data-integrity fixes
identified in Phase 8B, without any major architectural redesign (per the user decision).

**Headline conclusions:**
- **CC1 (capacity race) is genuinely fixed.** The reservation booking path now issues a
  **single atomic `INSERT … SELECT … WHERE (capacity_ok)`** statement instead of the Phase 7D
  SAVEPOINT/unlocked-SELECT-then-INSERT. Under SQLite WAL single-writer serialization, concurrent
  requests cannot oversubscribe the restaurant; the new concurrency test suite proves exactly-one-wins
  at capacity. No schema change was required, and the approach is PostgreSQL-portable.
- **An isolated pytest suite now exists** (`backend/tests/`, `pytest.ini`, `conftest.py`). It targets a
  fresh temporary SQLite database and **never touches `casa_aurelia.db`**. **50 tests pass**, including
  reservation regressions, auth, menu, and security, plus the dedicated concurrency scenarios A–F.
- **Migrations are no longer git-ignored** (B2). `backend/alembic/versions/*.py` is removed from
  `.gitignore`, so the schema is reproducible from a fresh VCS checkout. A fresh-temp-DB migration test
  runs cleanly 001→007, and the Alembic head stays `007_allergen_system` with a single linear history.
- **Config hardened (C4/C2):** added `APP_ENV` and absolute-path resolution for `DATABASE_URL` and
  `UPLOAD_DIR`, anchored at the backend root, so behavior no longer depends on the process working
  directory. `.env.example` publishes `APP_ENV=development`; the documented token expiry was already
  corrected to `60` during Phase 8A (verified — no `480` remains).
- **Dependency audits (classify-only):** `npm audit` is **clean (0)**; `pip-audit` reports **23 known
  advisories across 6 packages** — all classified, **none auto-upgraded** per the "no blind dependency
  upgrades" hard limit. `python-multipart` is flagged as the only low-risk supported upgrade, deferred
  to a controlled maintenance step.
- **Documentation delivered:** `docs/Backup_Restore.md`, `docs/Production_Deployment.md`,
  `docs/Security_Headers_CSP_HSTS.md`, `docs/CI_CD.md`, plus a ready-to-use GitHub Actions workflow
  (`.github/workflows/ci.yml`).
- **Build restored:** two pre-existing TypeScript unused-import errors that blocked `npm run build` were
  removed; **`tsc -b && vite build` now succeeds** (exit 0). Frontend lint passes (warnings only).
- **Auth unchanged, contact provider deferred, production DB baseline fully intact**, uploads empty, no
  test residue.

Full findings/actions and classifications are in the Appendix A table.

---

## 2. Audit & Fix Scope

This phase converts the accepted Phase 8B recommendations into validated changes. **Safe, justified,
production-hardening fixes were implemented; no major architectural redesign was performed.**

**Implemented (P1/P2):**
1. CC1 — atomic capacity reservation fix (single-statement capacity guard).
2. CI1 — isolated, DB-decoupled pytest suite + concurrency + regression tests.
3. B2 — restore migration file trackability (remove `alembic/versions/*.py` from `.gitignore`).
4. B1 — backup/restore procedure and documentation.
5. C4/C2 — absolute-path handling for `DATABASE_URL`/`UPLOAD_DIR` + `APP_ENV`.
6. F1/F2/CSP1/H1a — production deployment + reverse-proxy/CSP/HSTS runbook documentation.
7. CI — documented CI commands + ready-to-use GitHub Actions workflow.

**Hard limits honored (unchanged):** no PostgreSQL migration, no JWT redesign, no httpOnly cookies,
no MFA, no cloud storage, no Redis, no email/SMS/payment provider, no UI redesign, no
reservation-table/seating-duration models, no menu business-logic changes, **no unnecessary
migrations** (CC1 uses the existing schema — none created), **no blind dependency upgrades**, no
committing secrets, no mutating the production DB during tests. Auth is untouched.

---

## 3. CC1 — Atomic Capacity Reservation (Critical Fix)

### 3.1 Problem
The Phase 7D implementation wrapped the booking flow in a **SAVEPOINT** (`begin_nested()`) around an
**unlocked SELECT-then-INSERT**. A SAVEPOINT only guarantees *atomic rollback*, not *isolation from
concurrent writers*. Two concurrent requests could both read the same "booked" count, both pass the
capacity check, and both insert — **oversubscribing the restaurant**.

### 3.2 Fix
`backend/app/services/reservation_service.py` now performs the capacity check and the insert as
**one atomic write statement**:

```sql
INSERT INTO reservations (…)
SELECT literal_cols …
WHERE ( (SELECT max(capacity) FROM restaurants)
        - (SELECT SUM(guests) FROM reservations
           WHERE reservation_date = :d AND reservation_time = :t
             AND status != 'cancelled' AND deleted_at IS NULL) ) >= :guests
```

- Helpers added: `_active_guests_subquery(...)` and `_capacity_ok_condition(...)`.
- Flow: closed-day pre-check → duplicate pre-check (UX) → atomic insert → if `rowcount == 0`, re-check
  duplicate vs. capacity and return a safe message → `commit` → reload and return.
- **Why it closes the race:** SQLite (WAL) serializes writers. The second concurrent statement runs only
  after the first commits, so its re-read of the active guest sum observes committed rows and the `WHERE`
  evaluates false → **exactly one request succeeds**. Same single-statement semantics hold on PostgreSQL.
- **No schema change; no migration created** (head unchanged at `007_allergen_system`).

### 3.3 Validation
- Scratch execution of the compiled SQL against an isolated engine: valid for the sqlite dialect.
- Sequential sanity: 3-guest booking succeeds (capacity 4); a second 3-guest booking is rejected
  (`Only 1 seats remaining`), DB has exactly 1 row.
- **Concurrency suite** (`tests/test_concurrency.py`, file-backed SQLite, one session per thread):
  - A: cap 4, 3+3 concurrent → **exactly 1 success**, 1 failure.
  - B: cap 4, 2+2 concurrent → **both succeed**, active sum = 4.
  - C: existing 3 → concurrent 2 rejected ("seats").
  - D: cancelled excluded from capacity.
  - E: soft-deleted excluded from capacity.
  - F: duplicate rules intact.
  - Invariant asserted throughout: `active_guests <= capacity` (no overbooking).

**Residual (documented, low severity):** the *sequential* duplicate guard is enforced and tested, but a
*concurrent* duplicate (identical email+slot, capacity ample) is not additionally guarded inside the
atomic statement. This is a pre-existing, low-severity UX race outside CC1's capacity-fix scope; it is
recording as a future P4 item (see §14/Appendix A).

---

## 4. CI1 — Isolated Pytest Suite (Implemented)

Created `backend/pytest.ini` and `backend/tests/`:

| File | Purpose |
|------|---------|
| `conftest.py` | Sets `DATABASE_URL`/`SECRET_KEY`/`ADMIN_*`/`UPLOAD_DIR` to a **temp location before importing the app**; builds an isolated in-memory-free temp SQLite engine; seeds a restaurant + admin; disables slowapi rate-limit within tests; cleans up temp DB. |
| `test_reservations.py` | Availability, closed-day, booking, duplicate, lookup, wrong-email, customer-cancel, double-cancel, capacity rejection, cancelled-excluded, soft-deleted-excluded, admin auth, admin list/update, pagination, invalid date/time/guests/email/phone/reference. |
| `test_concurrency.py` | Scenarios A–F (see §3.3) using one Session per thread. |
| `test_auth.py` | Login, bad creds, unknown user, `/me`, malformed/`alg=none` token, refresh. |
| `test_menu.py` | Public menu, admin authorization, category/item CRUD, unknown-category, allergens. |
| `test_security.py` | Security headers, SQLi probes, XSS storage, no-traceback-leak, uploads not listable. |

**Isolation guarantee:** no test imports the live DB; `casa_aurelia.db` is never opened by tests.
Result: **50 passed, 0 failed** (only jose/library deprecation warnings, non-blocking).

---

## 5. Concurrency & Reservation Regression Results

```
python -m pytest tests -q
50 passed, 11 warnings (deprecation: python-jose datetime.utcnow — library, not ours)
```
All reservation regression tests pass, including the admin auth, capacity, cancelled/soft-deleted
exclusion, and pagination cases. See §4 for the full inventory.

---

## 6. Gitignore / VCS Baseline (B2, E1 — Reviewed Safely)

- **B2 fix applied:** removed `backend/alembic/versions/*.py` from the root `.gitignore`
  (migration files are now trackable). Verified: `git check-ignore backend/alembic/versions/007_allergen_system.py`
  → not ignored (exit 1).
- **E1 (zero commits) — reviewed, not auto-committed:** the repo remains on branch `main` with **zero
  commits** and all files untracked:
  ```
  ?? .env.example
  ?? .gitignore
  ?? Phase8A_Report.md
  ?? Phase8B_Report.md
  ?? backend/
  ?? frontend/
  ```
  An initial commit was **not** created: committing is an explicit, user-authorized action and was not
  requested. This remains a recommended next step (see §14).

---

## 7. Alembic Reproducibility (Fresh-Temp-DB Test)

Validated against a fresh temporary SQLite database (never the live DB):

- `alembic upgrade head` on an empty temp DB applied 001 → 007 cleanly (exit 0).
- `alembic heads` → `007_allergen_system (head)` — **single head, no branch points**.
- `alembic current` → `007_allergen_system (head)`.
- `alembic history` → linear chain `<base> -> 001 -> 002 -> 003 -> 004 -> 005 -> 006 -> 007`.
- Production DB `alembic_version` = `007_allergen_system` (read-only confirmed).
- **No migrations were created or changed this phase.**

---

## 8. Configuration Hardening (C4, C2)

`backend/app/core/config.py`:
- Added `app_env: str = "development"` (`APP_ENV`), making the environment explicit.
- Added `BACKEND_ROOT` (resolved to the backend package root) and a `@model_validator` that resolves
  **relative** `DATABASE_URL` (sqlite) and `UPLOAD_DIR` to **absolute** paths anchored at the backend
  root. Absolute paths, in-memory URLs, and bare `sqlite://` are left untouched. This de-couples the app
  from the process working directory (important for systemd/cron/uWSGI).
- Verified: defaults resolve to `backend/casa_aurelia.db` and `backend/uploads` (both exist) —
  **identical locations to current behavior, no relocation.**

`backend/.env.example`:
- Added `APP_ENV=development` documentation.
- The `480 → 60` token-expiry correction documented in Phase 8B (**C3**) was already applied during
  Phase 8A; confirmed no `480` remains anywhere in `backend/**/*.py`.

---

## 9. Dependency Audits (Classify-Only — No Upgrades)

Per the "no blind dependency upgrades" hard limit, these are **classified, not changed**.

**npm audit (frontend):** `0 vulnerabilities` (121 dependencies). ✔

**pip-audit (backend), 23 advisories / 6 packages:**

| Package | Pinned | Advisories | Suggested/Blocking |
|---------|--------|-----------|--------------------|
| starlette | 0.41.3 | 9 | Blocked: fix requires 1.x / higher minors that conflict with FastAPI 0.115.6 pin — major-coordinate change; defer, test, then patch. |
| python-jose | 3.3.0 | 5 | Unmaintained; real fix is migration to PyJWT (a JWT-stack change — explicitly out of scope). |
| python-multipart | 0.0.20 | 6 | **Recommended low-risk** supported upgrade to ≥0.0.30 (minor bump). Deferred to a controlled maintenance step; not blind. |
| pytest | 8.3.4 | 1 | Dev-only; fix 9.x is a major bump. Defer. |
| python-dotenv | 1.0.1 | 1 | Minor supported fix (1.2.x); low risk. Defer/optional. |
| ecdsa | 0.19.2 | 1 | Transitive via python-jose; no fix release; resolved by PyJWT migration. |

No production-proven path exists to fix all of these without a coordinated, tested dependency round
(starlette/FastAPI and the JWT stack). None are immediate zero-day exploit paths exposed by this app's
usage. Recommended as a dedicated, test-gated maintenance phase (§14).

---

## 10. Backup / Restore Documentation (B1 — Design + Docs)

`docs/Backup_Restore.md` was created. It covers the **consistent online snapshot** (SQLite `.backup`
API / `VACUUM INTO` — not a raw copy under WAL), what to back up (DB, `uploads/`, encrypted `.env`),
a recommended schedule + retention + restore verification, restore-onto-fresh-host via
`alembic upgrade head`, and corruption recovery. Implementation of an automated scheduler/off-box
storage is intentionally deferred (no cloud/SaaS per hard limits).

---

## 11. Production Deployment Documentation (F1, F2, CSP1, H1a)

- `docs/Production_Deployment.md` — reverse-proxy blueprint (Nginx example): TLS termination, `/api` +
  `/uploads` proxying, **SPA fallback** (`try_files … /index.html`), **HSTS** (post-TLS), **document-level
  CSP**, asset caching, and a systemd service example with the hardened env.
- `docs/Security_Headers_CSP_HSTS.md` — clarifies the split: the FastAPI middleware sets API/upload
  headers (`nosniff`, `DENY`, `Referrer-Policy`, `Permissions-Policy`) while CSP + HSTS live on the HTML
  document at the proxy; includes a verification checklist.
- Together these close the Phase 8B "host-layer not defined" blocker for a production deployment,
  without changing application code.

---

## 12. Continuous Integration Documentation (CI1 follow-on)

- `docs/CI_CD.md` — the exact CI commands (install, `pytest tests -q`, `compileall`, `npm ci`,
  `npm run lint`, `npm run build`), isolation notes, and a release checklist.
- `.github/workflows/ci.yml` — a ready-to-use GitHub Actions workflow (backend tests + frontend lint/build
  on separate jobs). Creating/registering the workflow in a CI provider is deferred (per hard limits);
  the file is provided as the documented artifact.

---

## 13. Production Blockers Status

| # | Blocker (from 8B) | Status in 8C |
|---|-------------------|--------------|
| 1 | CC1 capacity oversubscription race | **FIXED** (atomic capacity insert + concurrency tests) |
| 2 | B2 migrations git-ignored (+ E1 zero commits) | **B2 fixed**; E1 (initial commit) still **open — needs explicit go-ahead** |
| 3 | B1 no backup/restore | **Documented** procedure; automated scheduling deferred |
| 4 | CI1 no DB-isolated tests | **FIXED** (50 passing isolated tests) |
| 5 | Host layer not defined (F1/F2/CSP1/H1a) | **Documented** runbook + CI workflow |

Remaining open items are the **initial VCS commit**, a **controlled dependency-maintenance round**
(starlette/FastAPI + JWT), and **provider-based** work (contact email, off-box backups, MFA) — all
deferred or pending explicit authorization.

---

## 14. Deferred & Recommended Items

1. **Make the first VCS commit** (E1) and set `.gitignore`/`gitattributes` — awaiting explicit approval.
2. **Controlled dependency round** (test-gated): `python-multipart ≥0.0.30`, `python-dotenv 1.2.x`;
   plan starlette/FastAPI major upgrade and python-jose→PyJWT migration as a dedicated effort.
3. **Concurrent-duplicate guard** (P4/low): extend the atomic guard's `WHERE` to also exclude an active
   same-(email,date,time) row, closing the residual duplicate race.
4. **Off-box / scheduled backups** and **contact-form provider**, **MFA** — deferred (hard limits /
   provider decisions).
5. **PostgreSQL readiness** — still deferred; CC1 is now PG-safe, which unblocks it later if desired.

---

## 15. Auth / Contact / Deferred Production Requirements Status

- **Auth: unchanged.** No JWT redesign, no httpOnly cookies, no MFA, no rotation changes. The `alg=none`
  forged-token and malformed-token tests confirm rejection.
- **Contact form: unchanged** (mock) per hard limits; provider integration deferred.
- **CSP/HSTS:** not added to the app layer (correctly — they belong at the HTML document/host layer);
  now fully documented with a ready-to-apply proxy config.

---

## 16. Quality Gates (Run This Phase)

| Gate | Command | Result |
|------|---------|--------|
| Backend tests | `venv python -m pytest tests -q` | **50 passed**, 0 failed |
| Backend syntax | `python -m compileall -q app tests` | exit 0 |
| Alembic | `alembic heads` / `current` / fresh-temp `upgrade head` | single head `007`, linear, clean 001→007 |
| Frontend lint | `npm run lint` | exit 0 (warnings only, pre-existing) |
| Frontend build | `npm run build` (`tsc -b && vite build`) | **exit 0**, `dist/` produced |
| Dependency audits | `npm audit` / `pip-audit` | 0 npm / 23 pip (classified) |

---

## 17. Regression Baseline Re-Verification (data-safe)

Production DB read-only re-check — **identical to the pre-8C baseline**:

- Reservations: **0 active / 68 soft-deleted** (total 68).
- Categories **5**, menu items **20**, allergens **14**, featured **9**, users **1**, restaurant **1**
  (capacity **40**), `alembic_version` **`007_allergen_system`**.
- `uploads/menu/` empty (0 files) — no test residue.
- Backend `.env` auth **unchanged**; no secrets committed; `.env` still git-ignored.

---

## 18. Final Sign-off

Phase 8C is **complete and stopping for approval**. All P1/P2 code and documentation items from the
accepted Phase 8B scope were implemented, quality-gated, and data-safety-verified:

- **CC1 fixed** with proof (concurrency suite: no overbooking at capacity).
- **Isolated pytest suite added** (50 passing; concurrency + reservation regressions included).
- **Migrations made trackable**; **Alembic head unchanged** (`007`); no new migrations.
- **Config hardened** (`APP_ENV`, absolute paths); **`.env.example`** corrected.
- **Dependency + npm audits recorded** (classify-only).
- **Backup/restore, production deployment, CSP/HSTS, CI docs + CI workflow** created.
- **Frontend build restored** (removed two unused-import TS errors); lint green.
- **Auth unchanged; contact deferred; production DB and uploads baseline fully intact; no test residue.**

**Do not auto-proceed to Phase 8D** — awaiting approval and direction (notably: authorize the initial
VCS commit, and/or queue the controlled dependency-maintenance round).

---

## APPENDIX A — Complete Action/Findings Table (consolidated)

| ID | Item | Severity | Phase 8C action | Result |
|----|------|----------|-----------------|--------|
| CC1 | Capacity race (SAVEPOINT/unlocked SELECT-insert) | P1 | Atomic `INSERT…SELECT…WHERE(capacity_ok)` | FIXED; concurrency test A/B prove no overbooking |
| CI1 | No DB-isolated tests | P1 | `backend/tests/*` + `pytest.ini` | FIXED; 50 tests pass |
| B2 | Migrations git-ignored | P1 | Remove `alembic/versions/*.py` from `.gitignore` | FIXED (files trackable) |
| B1 | No backup/restore | P1 | `docs/Backup_Restore.md` | Documented; scheduling deferred |
| F1/F2 | Proxy routing + SPA fallback | P1/Req | `docs/Production_Deployment.md` | Documented runbook |
| CSP1/H1a | Document-level CSP + HSTS | P1/Req | `docs/Security_Headers_CSP_HSTS.md` + proxy config | Documented |
| E1 | Zero VCS commits | P1 | Reviewed; NOT committed | Open — needs authorization |
| C4/C2 | Relative paths / no `APP_ENV` | P2/P3/P1 | Absolute-path resolution + `APP_ENV` | FIXED |
| C3 | `.env.example` expiry 480 | P3 | Already 60 (8A); verified; added `APP_ENV` | FIXED |
| Deps | pip-audit advisories | P4 | Classified; no upgrades | Documented (see §9) |
| Deps | npm audit | P1/P3 | Run | 0 findings |
| Concurrent-dup | Residual duplicate race (low) | P4 | Not changed (out of CC1 scope) | Documented (§14) |

## APPENDIX B — Production Blocker List (post-8C)

1. **No initial VCS commit** (E1) — the safety net for change-tracking is still absent. **Recommendation:
   authorize the first commit.**
2. **Dependency advisories** (starlette/FastAPI coordinate + JWT stack) — require a test-gated
   maintenance round (not an emergency; no exposed zero-day path in this app's usage).
3. **Provider-dependent items** — contact form, off-box/scheduled backups, MFA, and any real
   email/SMS/payment/cloud integration remain undelivered by design.

None of these block a single-host production launch given the now-fixed concurrency + the documented
reverse-proxy deployment; the strongest remaining recommendation is the initial VCS commit.

## APPENDIX C — Exact Files Created / Modified

**Created:**
- `backend/tests/` — `conftest.py`, `test_auth.py`, `test_menu.py`, `test_reservations.py`,
  `test_security.py`, `test_concurrency.py`
- `backend/pytest.ini`
- `docs/Backup_Restore.md`, `docs/Production_Deployment.md`, `docs/Security_Headers_CSP_HSTS.md`,
  `docs/CI_CD.md`
- `.github/workflows/ci.yml`
- `Phase8C_Report.md` (this file)

**Modified:**
- `backend/app/services/reservation_service.py` — CC1 atomic capacity insert + helpers
- `backend/app/core/config.py` — `APP_ENV`, `BACKEND_ROOT`, path-resolution validator
- `backend/.env.example` — added `APP_ENV=development`
- `.gitignore` — removed `backend/alembic/versions/*.py`
- `frontend/src/pages/AdminPage.tsx` — removed unused `Navigate` import (build fix)
- `frontend/src/pages/ContactPage.tsx` — removed unused `ErrorMessage` import (build fix)

**Unchanged (intentionally):** `backend/casa_aurelia.db`, `backend/.env`, `backend/requirements.txt`,
`frontend/package.json`/`package-lock.json`, `alembic/versions/*.py` (files unchanged, only un-ignored),
all auth code, all models/schemas/migrations.

## APPENDIX D — Exact Commands / Tests Executed

- `python -m pytest tests -q` → 50 passed.
- `python -m compileall -q app tests` → exit 0.
- Scratch SQL compile + sequential capacity sanity (temp engine) → valid, no overbooking.
- `alembic upgrade head` / `heads` / `current` / `history` (fresh temp DB) → linear 001→007, single head.
- `git status --short` / `git log --oneline` / `git check-ignore ...007_allergen_system.py` → zero commits;
  migration no longer ignored.
- `npm run lint` (exit 0, warnings only) and `npm run build` (exit 0, `dist/` produced).
- `npm audit --json` → 0 vulnerabilities. `python -m pip_audit -r requirements.txt` → 23 advisories / 6 pkgs.
- Read-only production DB query: 0/68/5/20/14/9/1/1/40 + `007_allergen_system`; `uploads/menu/` empty.

## APPENDIX E — Final git status

Repository still has **zero commits** (branch `main`). `git status --short`:
```
?? .env.example
?? .gitignore
?? Phase8A_Report.md
?? Phase8B_Report.md
?? backend/
?? frontend/
```
No secrets are tracked (`.env*` remains git-ignored), and no migration file is ignored anymore.
An initial commit is recommended but has **not** been created (awaiting explicit authorization).

---

**PHASE 8C COMPLETE — STOPPING FOR APPROVAL.**

**CC1 FIXED** (atomic capacity guard; concurrency tests prove no overbooking).
**50 ISOLATED TESTS PASS.**
**ALEMBIC HEAD UNCHANGED** at `007_allergen_system`; no new migrations; migrations now trackable.
**CONFIG HARDENED** (`APP_ENV`, absolute paths). **BUILD RESTORED** (frontend `build` exit 0).
**DEPENDENCY AUDITS RECORDED** (classify-only; no blind upgrades).
**FOUR DOCS + CI WORKFLOW CREATED.**
**AUTH UNCHANGED. CONTACT DEFERRED. PROD DB BASELINE INTACT** (0/68/5/20/14/9/1/1/40, uploads empty).
**NO TEST RESIDUE.**
**PHASE 8D NOT STARTED.**
