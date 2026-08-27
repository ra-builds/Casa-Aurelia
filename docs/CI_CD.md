# Continuous Integration — Casa Aurelia

This document is the CI blueprint for Casa Aurelia (addressing the **CI1 — no
isolated tests** finding from Phase 8B). A ready-to-use GitHub Actions workflow is
provided at `.github/workflows/ci.yml`.

## What CI must execute

Every push / pull request, run in an isolated environment (a fresh runner and a
fresh, temporary database):

### Backend (`backend/`)
1. Create/restore the venv and install pinned deps:
   ```bash
   python -m venv .venv && . .venv/bin/activate
   pip install -r requirements.txt
   ```
2. Run the isolated test suite (never touches `casa_aurelia.db`):
   ```bash
   python -m pytest tests -q
   ```
3. Static sanity check (no configured python linter is pinned yet):
   ```bash
   python -m compileall -q app tests
   ```
4. Deferred by policy (documented, not blocking): `pip-audit -r requirements.txt`
   — results are reviewed/classified, **not** auto-fixed (no blind upgrades).

### Frontend (`frontend/`)
5. Install pinned deps:
   ```bash
   npm ci
   ```
6. Lint: `npm run lint`
7. Type-check + production build: `npm run build` (runs `tsc -b && vite build`)

### Repository / security
8. Ensure no secrets are committed: `.env*` files are git-ignored; treat any diff
   touching `backend/.env` as a hard failure.

## Notes for maintainers

- The pytest suite is fully isolated: conftest sets `DATABASE_URL`,
  `SECRET_KEY`, `ADMIN_*`, `UPLOAD_DIR` to a temp location **before** importing the
  app, so builds and tests never mutate the real database.
- Rate limiting (slowapi) is disabled within tests only, so fast test clients are
  not throttled.
- Frontend build failures (TypeScript `tsc -b` errors) are treated as CI failures —
  they block shipping.

## Release checklist

- [ ] CI green (tests, lint, build) on the target commit.
- [ ] `backend/venv/bin/python -m alembic heads` shows a single `007_allergen_system` head.
- [ ] Fresh DB backup taken (see `Backup_Restore.md`).
- [ ] Deploy per `Production_Deployment.md`; run `alembic upgrade head` if schema changed.
