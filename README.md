# Casa Aurelia — Restaurant Website & Reservation Management Platform

Casa Aurelia is a **production-oriented full-stack restaurant website and reservation-management
platform** built as a portfolio engineering project. It is a complete, data-driven implementation:
a responsive public website, a multilingual interface, online reservations, a dynamic menu, an
administration dashboard, and a hardened backend API with an automated migration chain and CI/CD
pipeline.

> **Status:** release-ready portfolio engineering project. This repository is not a publicly
> deployed production system; it is an engineering showcase with production-oriented design.

---

## Engineering Highlights

- **Atomic, concurrency-safe capacity control** — reservations are admitted through a single
  `INSERT … SELECT … WHERE capacity-ok` statement evaluated against a correlated capacity
  subquery, so the capacity check and the row insert are one atomic write. A dedicated
  concurrency test suite exercises the race and confirms the seat invariant is never broken.
- **Hardened session handling** — the JWT access token is held in memory only on the client;
  refresh tokens rotate through an HttpOnly, SameSite=Lax cookie scoped to `/api/auth`, and
  logout clears the cookie so no token is ever persisted to browser storage.
- **Comprehensive automated testing** — 112 backend tests (pytest, isolated disposable
  database), 132 Playwright end-to-end tests, and 10 plain-Node regression specs, all wired
  into a read-only-permission GitHub Actions pipeline.
- **Cross-browser and accessibility coverage** — a Playwright smoke suite across Chromium,
  Firefox, and WebKit, plus axe-based accessibility scans and automated visual/responsive QA
  inside the E2E suite.
- **Alembic migration integrity** — a 9-revision chain (`001` → `009`, single head) with a CI
  gate that upgrades a fresh database and fails if the history forks or ever has more than one
  head.
- **Five-locale i18n parity** — 538 translation keys in each of `en`, `it`, `fr`, `de`, `es`
  with identical key parity and `en` fallback, enforced by a regression spec.
- **Production hardening** — `TrustedHostMiddleware` host allow-list, startup guards that
  refuse to boot with placeholder secrets or a missing `ALLOWED_HOSTS`, and API docs/OpenAPI
  disabled in production while the health endpoint stays available.

---

## Features

Verified against the current implementation:

- **Restaurant website** — home, menu, signature dishes, about, gallery, and contact pages driven by
  live backend data.
- **Multilingual UI** — five supported locales: English, Italiano, Français, Deutsch, Español, with
  identical key parity across all five (538×5) and `en` as fallback.
- **Dynamic menu** — categories, items, prices, images, availability, and dietary/allergen
  information fully data-driven from the API.
- **Reservation flow** — a 5-step booking flow (date → guests → time → details → review) with
  real-time availability checks, confirmation with a reference code, and self-service lookup/cancel.
- **Reservation management** — an authenticated admin dashboard with KPI statistics and full
  reservation management (search, filter, confirm, cancel, delete).
- **Authentication / admin** — JWT-based staff/admin login; environment-configured credentials,
  never hard-coded.
- **Capacity / concurrency protection** — date/guest capacity rules, closed-day handling, and
  rate-limited reservation submission.
- **Backend API** — FastAPI service with health endpoint, structured routers, validation, and
  security headers.
- **Database & migrations** — SQLAlchemy 2 ORM with an Alembic migration chain (001→009, single
  head), SQLite by default with a configurable `DATABASE_URL`.
- **Responsive UI** — desktop-to-mobile adaptation, mobile navigation drawer, fluid typography/grids.
- **Accessibility testing** — axe-based automated accessibility checks.
- **Visual / responsive testing** — automated full-page visual snapshots and viewport-related QA.
- **Cross-browser testing** — Playwright smoke coverage across Chromium, Firefox, and WebKit.

---

## Technology stack

**Frontend** (`frontend/`)

- **React 19** + **TypeScript** with **Vite 8**
- **React Router 7** (route-level code splitting via `React.lazy` + `Suspense`)
- **i18next** + react-i18next (5 locales)
- **Tailwind CSS 4** (design tokens via `@theme`)
- **framer-motion** (reduced-motion-aware transitions)
- **oxlint** (linting)
- Build-time SEO generation (`robots.txt`, `sitemap.xml`)

**Backend** (`backend/`)

- **Python** (CI uses 3.12)
- **FastAPI** + Uvicorn
- **SQLAlchemy 2** ORM
- **Alembic** migrations
- **Pydantic 2** / pydantic-settings (validation + configuration)
- **Slowapi** (rate limiting on reservation submission)
- SQLite by default; other SQLAlchemy-supported databases via `DATABASE_URL`

**Testing**

- **pytest** — backend unit/integration suite (112 tests)
- **Playwright** — 132 end-to-end tests
- **axe (via `@axe-core/playwright`)** — accessibility
- Plain-Node regression specs — frontend util/SEO/performance/hardening specs
- **GitHub Actions** — CI/CD pipeline (backend, frontend, E2E)

---

## Architecture

```
Browser
  │
  ▼
React/Vite frontend (public site + admin SPA)
  │  /api, /uploads
  ▼
FastAPI backend (routers: auth, reservations, menu, restaurant, closures, contact)
  │
  ▼
Database (SQLite by default; configurable via DATABASE_URL)
```

During local development, Vite serves the frontend on `http://localhost:5173` and proxies `/api`
and `/uploads` to the backend running on port `8000`. In production, the same relative `/api` paths
keep the frontend origin-agnostic (reverse proxy / same-origin serving), so no per-environment code
changes are required.

---

## Repository structure

```
backend/                 # FastAPI application, models, routers, tests, Alembic migrations
frontend/                # React/Vite application, Playwright suites, specs
docs/                    # Technical and deployment documentation
deploy/                  # Deployment reference templates (.example files only)
.github/workflows/       # CI/CD pipeline (GitHub Actions)
```

---

## Local setup

### Prerequisites

- Python 3.12+
- Node.js 20+
- Git

### Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate          # Windows; use `. venv/bin/activate` on Linux/macOS
pip install -r requirements.txt
copy .env.example .env         # then edit .env — see "Environment variables"
alembic upgrade head           # apply migrations (001 → 009)
python seed.py                 # seed restaurant record, menu, and admin user
uvicorn app.main:app --reload  # serves http://127.0.0.1:8000
```

### Frontend

```bash
cd frontend
npm ci
npm run dev                    # generates robots.txt/sitemap.xml; serves http://localhost:5173
```

Open `http://localhost:5173`. The dev server proxies `/api` and `/uploads` to the backend on port
`8000`. Both processes must run together.

---

## Environment variables

Credentials and environment-specific values come from environment variables / local `.env` files;
no real secrets live in the repository.

- **Backend:** copy `backend/.env.example` → `backend/.env` and set at minimum `SECRET_KEY`
  (32+ characters) and `ADMIN_PASSWORD` (8+ characters). Options include `ADMIN_EMAIL`,
  `DATABASE_URL`, and `APP_ENV`.
- **Frontend:** `VITE_SITE_URL` (canonical origin for SEO metadata) and `VITE_API_URL` (only needed
  when not using the dev-proxy default). No secrets belong in `VITE_*` values.
- `backend/.env` is git-ignored. **Never commit real credentials or `.env` files.**

In production, `APP_ENV=production` enables startup-time guards (including a check that
placeholder secret values are not in use) and the security header middleware.

---

## Database and migrations

Schema changes are managed with **Alembic**. The migration chain is `001` → `009` with a single
head (`009_closures`), and CI fails if the migration history ever forks or becomes non-single-head.

For local development, `python seed.py` populates the restaurant record, menu, and admin user from
your `.env` values (it will not overwrite an existing admin).

---

## Testing

| Layer | Tool | Command | Notes |
|---|---|---|---|
| Backend suite | pytest | `pytest` (from `backend/`) | 112 tests |
| Frontend regression specs | Node | `npm test` (from `frontend/`) | SEO, performance, hardening, template, etc. |
| Lint | oxlint | `npm run lint` | |
| Type-check + build | tsc + Vite | `npm run build` | |
| Accessibility | Playwright + axe | `npx playwright test tests/accessibility.spec.ts` | |
| Visual / responsive | Playwright | `npx playwright test tests/visualResponsive.spec.ts` | full-page visual snapshots & viewport QA |
| E2E (primary browser) | Playwright (Chromium) | `npm run test:e2e` | 132 tests against a disposable backend |
| Cross-browser smoke | Playwright | `npm run test:e2e -- --config=playwright.crossbrowser.config.ts --project=chromium --project=firefox --project=webkit` | Chromium + Firefox + WebKit |

Playwright E2E launches a **disposable** backend (`backend/run_e2e.py`) and requires the
`E2E_ADMIN_EMAIL` / `E2E_ADMIN_PASSWORD` environment variables. All of these layers run
automatically in CI.

---

## Current verified quality state

At the current release-readiness audit, the GitHub Actions pipeline completed successfully with the
backend, frontend, migration-integrity, Playwright E2E, and cross-browser gates passing:

- 112 backend tests passing in CI
- 132 Playwright E2E tests passing in CI
- cross-browser smoke coverage across Chromium, Firefox, and WebKit
- automated accessibility, visual/responsive, and browser QA in the Playwright suite
- five-locale translation parity (538×5) verified
- `npm audit` currently reports 0 vulnerabilities

These are verified project-state results at a point in time, not a permanent guarantee; the CI
pipeline re-verifies them on every push and pull request.

---

## CI/CD

GitHub Actions (`.github/workflows/ci.yml`) runs on every push to `main` and on pull requests:

1. **Backend job** — installs backend dependencies, validates Python syntax (`compileall`), runs the
   pytest suite, and performs a migration-integrity check (fresh SQLite, `alembic upgrade head`,
   single-head assertion).
2. **Frontend job** — `npm ci`, oxlint, specs, and production build (type-check + Vite).
3. **E2E job** — installs Playwright browsers (Chromium, Firefox, WebKit), runs the full 132-test E2E
   suite, then the cross-browser smoke, and uploads the Playwright report/artifacts.

Workflow permissions are scoped to read-only `contents` for the runner. See `docs/CI_CD.md` for the
full pipeline description.

---

## Security

- All secrets are supplied through environment variables / GitHub Secrets and are never committed.
- The repository ships placeholder-only `.env` templates; a startup guard fails closed if real
  placeholder values are used in production.
- Security-hardening middleware applies `nosniff`, `X-Frame-Options`, `Referrer-Policy`, and
  `Permissions-Policy` headers; private pages emit `noindex`.
- See `docs/Security_Headers_CSP_HSTS.md` for the header/security configuration.

A security posture is documented and hardened by design; no software is "100% secure."

---

## Deployment

Realistic deployment documentation exists under `docs/`:

- `docs/Production_Deployment.md` — production configuration and deployment topology
- `docs/Deployment_Runbook.md` — step-by-step deployment runbook
- `docs/Backup_Restore.md` — backup and restore procedures
- `docs/Rollback_Procedures.md` — rollback procedures
- `deploy/` — reference service and nginx templates (`.example` files only)

Deployment is documented and validated against the project architecture, but Casa Aurelia is **not
currently publicly deployed**; this repository does not claim a live production instance.

---

## Documentation

- `docs/Demo_Guide.md` — portfolio demonstration flows (desktop + mobile) and demo admin setup
- `docs/CI_CD.md` — CI/CD pipeline details
- `docs/Production_Deployment.md`, `docs/Deployment_Runbook.md` — deployment
- `docs/Backup_Restore.md`, `docs/Rollback_Procedures.md` — operations
- `docs/Security_Headers_CSP_HSTS.md` — security configuration
- `frontend/README.md` — frontend-package-specific development details

---

## License

Released under the [MIT License](LICENSE).