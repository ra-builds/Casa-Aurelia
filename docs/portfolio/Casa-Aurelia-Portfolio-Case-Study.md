# Casa Aurelia

## Production-Ready Restaurant Website & Reservation Management Platform

---

### 1. Executive Summary

Casa Aurelia is a full-stack restaurant website and reservation-management platform built as a
production-oriented engineering project. It combines a polished, multilingual public website with a
real booking system — date/party-size/time selection driven by live capacity data, deterministic
reservation reference codes, self-service lookup and cancellation — and a staff administration
dashboard for reservations, menu content, closures, contact inbox, and restaurant settings.

This is more than a static restaurant website: the reservation core is engineered around
concurrency safety. A single atomic `INSERT … SELECT … WHERE capacity-ok` statement admits each
booking so the capacity check and the row insert are one write, and the invariant is protected by
an explicit concurrency test suite. The surrounding system carries the same weight: hardened
session handling (in-memory access token + HttpOnly refresh cookie), five-locale internationalization
with enforced key parity, 112 backend tests, a 132-test Playwright suite with axe accessibility and
cross-browser coverage, an Alembic migration chain verified to a single head, and CI that gates every
push to `main`. Scope is deliberate: this is an engineering showcase designed and verified like a
real business application, not a deployed product.

### 2. The Problem

A real restaurant needs more than a brochure page. Customers browse the menu and story, and they
need to reserve a table — and a reservation system has to be *correct*: availability ticks down as
real groups book real seats, and two customers must never both get the last remaining seat. Guests
also need self-service lookup and cancellation without calling the restaurant. On the operations
side, staff need to see today's bookings, manage the menu and content, and handle closures.

Beyond the functional core, several practical concerns shape the work:

- Availability and capacity must be handled correctly under concurrency.
- Menu, pricing, allergens, and hours should be data-driven, not hard-coded in markup.
- Multilingual guests (this project targets an Italian restaurant with international visitors)
  need more than one language.
- Staff access needs real authentication and operational safeguards — not a hidden admin route.
- The whole system must be verifiable: automated tests, accessibility checks, and CI so changes
  cannot silently break booking correctness.

### 3. Goals

- Deliver a professional, editorial-quality restaurant UX (home, menu, signatures, about, gallery, contact).
- Implement a complete reservation workflow: date → party size → time (with live availability) → details → confirmation with a reference code → lookup / cancel.
- Guarantee capacity correctness under concurrent booking (no overselling the last seat).
- Provide staff administration: reservation management, menu/category/allergen/content management, closures, contact inbox, restaurant settings.
- Support five locales (EN/IT/FR/DE/ES) with enforced key parity and fallback.
- Meet accessibility and responsive standards with automated verification.
- Harden security: session handling, host allow-lists, secret validation, upload validation, rate limiting.
- Back the product with layered automated testing (pytest, Playwright, plain-Node specs) and CI.
- Reach a production-ready engineering state with runbook-based deployment prepared but honestly not yet live.

### 4. Solution

Casa Aurelia is a data-driven React + FastAPI application. All restaurant content — menu categories,
items, prices, allergens, hours, capacity, closures — lives in the API and is rendered by the
frontend, so content changes without redeploying markup.

Public journey:

```
Home → Menu / Signatures / About / Gallery / Contact
     → Reservations wizard (date → party size → time + availability → details → review)
     → Confirmation with reference code
     → Lookup / Cancel (self-service)
```

Admin journey:

```
Login (JWT) → Dashboard (KPIs + today's table) → Reservations (search/filter/confirm/cancel/delete)
     → Menu / Categories / Images / Allergens → Closures → Contact messages → Restaurant settings
```

Each journey is covered by end-to-end tests and, where the flow is deterministic, by screenshot
evidence captured against the running application.

### 5. Key Features

- **Restaurant homepage** — editorial hero and sections (story, philosophy, signatures, hours/location, testimonials) rendered from live data.
- **Menu** — categories, items, pricing, images, availability, and feature toggles, all API-driven.
- **Menu categories** — admin-managed categories with slugs and sort order.
- **Allergen information** — per-item allergen details with an admin-maintained allergen catalog.
- **Reservation wizard** — 5-step flow (date → guests → time → details → review) with live availability per step.
- **Availability checking** — real-time per-slot remaining capacity from the API; full slots are refused before submission.
- **Reservation confirmation** — creates a unique `CASA-…` reference code; best-effort confirmation email is reported honestly.
- **Reservation lookup** — reference code + email returns the booking.
- **Reservation cancellation** — self-service cancel with a guarded state machine (already-cancelled → 409, missing → 404).
- **Admin dashboard** — KPIs (total, today count/guests, upcoming, pending, confirmed, cancelled) and a reservation table.
- **Admin reservation management** — server-side search, filter, pagination, status transitions (pending/confirmed/cancelled), soft delete.
- **Menu/content management** — CRUD for items, categories, images (validated uploads), allergens, availability.
- **Restaurant closures** — admin-managed blackout dates that block booking and are surfaced in the UI.
- **Contact messages** — public contact form persisted to the database and shown in an admin inbox.
- **Five-language support** — EN, IT, FR, DE, ES with enforced 538-key parity and `en` fallback.
- **Responsive/mobile experience** — fluid layout, mobile navigation drawer, mobile-tested wizard and admin experience.
- **Accessibility** — automated axe scans, semantic forms, and validation errors exposed as `role=alert`.
- **Error/edge-case handling** — publication of edge cases (past date, full slot, duplicate booking, colliding reference codes, missing/cancelled reservation) as HTTP statuses with user-safe messages instead of 500s.

### 6. Architecture

**Frontend**

| Concern | Choice |
|---|---|
| UI framework | React 19 + TypeScript |
| Build | Vite 8 |
| Styling | Tailwind CSS 4 |
| Routing | React Router (react-router-dom v7) |
| Internationalization | i18next + react-i18next |
| Motion/Icons | Framer Motion, lucide-react |
| Linting | oxlint |

**Backend**

| Concern | Choice |
|---|---|
| API framework | FastAPI 0.141 / Starlette 1.6 |
| ORM | SQLAlchemy (DeclarativeBase models) |
| Validation | Pydantic 2 schemas |
| Migrations | Alembic (9 revisions, single head) |
| Database | SQLite (WAL) by default, configurable `DATABASE_URL` |
| ASGI server | Uvicorn |

**Security**

- JWT access token (HS256) held in memory only on the client.
- Refresh token in an HttpOnly, SameSite=Lax cookie scoped to `/api/auth`; rotated on every refresh.
- `TrustedHostMiddleware` host allow-list with a production boot guard on `ALLOWED_HOSTS`.
- Production startup refuses to run with placeholder secrets.
- API docs (`/docs`, `/redoc`, `/openapi.json`) disabled in production; `/api/health` stays available.
- Security headers (`X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`).

**Infrastructure**

- Deployment is prepared (not yet executed): nginx reverse proxy + systemd under Linux, persistent
  SQLite data and upload volumes, and documented backup/restore, rollback, and HTTPS/HSTS/CSP plans
  under `docs/`. The VPS has not been provisioned, so deployment is paused (out of scope for this phase).
- Same-origin deployment (one domain serving the SPA and the `/api` through a reverse proxy) is
  preferred because it keeps the refresh-token cookie SameSite=Lax compatible (no cross-site
  cookie sends), removes the need to loosen CORS in production, and lets `TrustedHostMiddleware`
  enforce a single canonical host. In development the Vite proxy mirrors this same-origin topology.

### 7. The Most Important Engineering Challenge: Concurrency-Safe Reservations

The core correctness problem is the **last available seat**. If two customers book the final two
seats at the same time, a naive handler fails:

```
CHECK capacity   ← both requests read "2 seats free"
INSERT row       ← both insert a 4-guest (or 2×2-guest) row
```

Both read the same snapshot, both pass, and the restaurant is oversubscribed. In a reservation
system this is a real operational failure, not a theoretical one — overbooking forces walk-ins or
difficult refunds.

Casa Aurelia avoids the race at the database level with a single atomic write:

- SQLite runs in **WAL mode** with a 5 s `busy_timeout`; writers are serialized, so there is
  exactly one writer at a time and a concurrent `INSERT` only evaluates against committed rows.
- Booking is performed as **one statement**: `INSERT … SELECT … WHERE capacity-ok AND duplicate-ok`.
  The capacity check reads the restaurant's capacity and the currently booked guest sum through
  correlated scalar subqueries *inside the same write statement*. The insert and the check cannot
  be observed mid-flight: the second concurrent request re-reads committed state after the first
  commits, the `WHERE` evaluates false, and exactly one booking succeeds with `rowcount == 0`.
- **Duplicate prevention** is part of the same guard: no *active* (non-cancelled, non-deleted)
  reservation may already exist for the same email + date + time. This closes the
  concurrent-duplicate race without a schema change and deliberately still allows re-booking after
  a cancellation or soft delete.
- **Unique constraints** back the identifiers: `reference_code` is `UNIQUE`; a colliding freshly
  generated code triggers `IntegrityError`, which is rolled back and retried with a fresh code a
  bounded number of times (`MAX_REFERENCE_CODE_ATTEMPTS = 3`) instead of surfacing a 500.
- **Reactivate guards**: an admin reactivating a cancelled reservation runs the same capacity
  and duplicate checks, closing cancel → rebook → reactivate oversubscription.
- **Concurrency test coverage**: a dedicated backend suite exercises simultaneous booking of the
  final seats and asserts the seat invariant is never broken; Playwright edge-case specs cover the
  final-seat and over-capacity flows through the UI.

Why this matters: correctness here is the product's contract with real people (customers and
restaurant). The implementation deliberately does *not* claim distributed scalability — it is a
single-node SQLite design whose database-level atomicity is exactly the right tool for one
restaurant's booking workload, and the same single-statement semantics are portable to PostgreSQL
if the application ever outgrows SQLite.

### 8. Authentication & Security

- **Access token (short-lived, in-memory)**: after login the JWT access token is returned in the
  response body and kept only in the browser's memory. It is never written to `localStorage` or
  `sessionStorage`. On reload it is reconstructed through the refresh flow.
- **Refresh token (HttpOnly cookie)**: the refresh token never reaches JavaScript. It is set as an
  `HttpOnly` cookie (`casaaurelia_refresh`), `SameSite=Lax`, scoped to `path=/api/auth`, and marked
  `Secure` in production (HTTPS).
- **Refresh rotation**: each `/api/auth/refresh` re-issues a fresh access token and a fresh refresh
  cookie rather than reusing a long-lived one.
- **Password handling**: bcrypt hashing via passlib; credentials come from the environment, never
  committed.
- **Rate limiting** (slowapi, per remote address): login 5/min, refresh 10/min, logout 30/min,
  availability 30/min, create reservation 10/min, lookup 10/min, customer cancel 10/min,
  contact submission 5/min.
- **CORS**: an explicit origin allow-list, credentials enabled, restricted methods/headers. In the
  preferred same-origin topology the API does not rely on CORS at all.
- **Host validation**: `TrustedHostMiddleware` rejects requests whose `Host` header is not in
  `ALLOWED_HOSTS` (development falls back to localhost/loopback/testserver; production requires the
  explicit list and refuses to boot without it).
- **Security headers**: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`,
  `Referrer-Policy: strict-origin-when-cross-origin`, and a restrictive `Permissions-Policy`.
- **Production secret validation**: in `production` the app refuses to start while `SECRET_KEY` or
  `ADMIN_PASSWORD` is a placeholder value or while `ALLOWED_HOSTS` is unset — it reports which
  setting is invalid without logging values.
- **API documentation disabled in production**: `/docs`, `/redoc`, and `/openapi.json` return 404;
  `/api/health` remains available for monitoring.
- **Upload validation**: menu images are restricted to JPEG/PNG/WebP, validated by magic bytes (the
  client filename and Content-Type are never trusted), capped at 5 MB, persisted under UUID names,
  and deletes are confined to the managed upload directory.

**Why localStorage was avoided for JWTs**: a token in `localStorage` is readable by any same-origin
script, so a single XSS can exfiltrate a long-lived credential. Keeping the access token in memory
and the refresh token in an HttpOnly cookie means the refresh credential is invisible to JavaScript:
XSS cannot read it, and its scope is limited to `/api/auth`. The tradeoff — a session that does not
survive a full browser restart without re-authentication via the refresh flow — is the accepted cost
of substantially reducing credential-exposure risk.

### 9. Database & Migrations

- **ORM + schema**: SQLAlchemy declarative models (User, Reservation, Restaurant, MenuItem,
  Category, Closure, Message, RestaurantSetting).
- **Alembic migrations**: a 9-revision chain `001_initial_schema` → `009_closures`, verified to have
  exactly one head. CI upgrades a fresh disposable database and fails on a fork or a second head.
- **SQLite configuration**: WAL journal mode (concurrent readers with a single writer), a 5 s
  `busy_timeout` (writers wait rather than failing), and `foreign_keys=ON`.
- **Reservation semantics**: gifts of unique reference codes, a `deleted_at` soft delete column
  (listings and capacity counts exclude soft-deleted rows), and indexes on date/time, status,
  and the unique reference code.
- **Seed behavior**: `backend/seed.py` deterministically seeds restaurant settings, menu data
  (categories/items), staff user, and demo reservations — intentionally idempotent so the evidence
  pack and demos are reproducible. Application startup uses `create_all` only in non-production
  environments; in production the schema is owned exclusively by Alembic.
- Scope honesty: this is a **SQLite** (configurable `DATABASE_URL`) design. PostgreSQL is not
  advertised as currently supported; the same atomic single-statement booking semantics are
  PostgreSQL-portable, which is noted as future work if scale requires it.

### 10. Internationalization

- **Five locales**: English, Italian, French, German, Spanish.
- **Coverage**: 538 leaf keys per locale, identical keys across all five (`538 × 5`).
- **Parity enforcement**: a regression spec fails if any locale drifts from the canonical key set,
  so translations cannot silently fall out of sync.
- **Fallback**: `en` acts as the fallback locale when a key is missing in a non-English locale.
- **UX details**: language is auto-detected, persisted (`restaurant_language` in browser storage),
  and applied to `documentElement.lang` so assistive tech and translation expectations match the
  visible language.

Why this matters: an internationally visible restaurant serves mixed-language guests. i18n done as
a first-class, parity-enforced subsystem (rather than the last-minute wrapping of a few labels)
is what makes the site genuinely usable abroad and keeps the menu/reservation copy consistent.

### 11. Testing Strategy

| Layer | Count (verified) | Notes |
|---|---|---|
| Backend unit/integration | 112 pytest tests | isolated disposable SQLite DB; includes dedicated concurrency, auth, and security tests |
| E2E (primary browser) | 132 Playwright tests on Chromium | covers public journeys, wizard, availability, reference-code lifecycle, admin, errors, auth |
| Accessibility | 13 accessibility tests | `accessibility.spec.ts` (includes the automated axe audit), inside the E2E suite |
| Visual / responsive | 20 checks | `visualResponsive.spec.ts`, inside the E2E suite |
| Cross-browser smoke | 15 checks (5 per engine) | re-run under Chromium, Firefox, WebKit |
| Plain-Node regression specs | 10 specs | `spec/*.test.mjs` (getMinDate, reserved/closed-day, slot groups, responsive layout, formatting, SEO, performance, production guards, customization, template) |

Precision about overlapping counts: the **132 E2E tests already include** the 13 accessibility tests
and 20 visual/responsive checks — they are specifications inside the suite, not independent numbers.
The 15 cross-browser smoke checks are the same cross-browser spec executed in three browser
projects. The layers are therefore **not summed** into one grand total.

Why different layers exist (the pyramid): plain-Node specs lock down pure logic (date math, slot
grouping, SEO output) and run in milliseconds; backend tests verify business rules and database
invariants at the HTTP/DB boundary; Playwright E2E proves the shipped UI against a disposable real
backend — the only layer that can catch a typo in an aria label, a broken route transition, or a
capacity refusal rendered as a dead button. Each layer exists because the lower layers cannot see
the others' failure modes.

### 12. CI/CD

`github/workflows/ci.yml` gates every push to `main` and every pull request with three read-only jobs:

| Job | Steps |
|---|---|
| Backend | `compileall` syntax check → `pytest` (112) → Alembic migration integrity (fresh DB, single head) |
| Frontend | `npm ci` → oxlint → plain-Node specs (10) via `npm test` → Type-check + production build |
| E2E | Install Playwright browsers → Chromium E2E suite (132) → cross-browser smoke (Chromium + Firefox + WebKit) → artifact upload |

The pipeline is CI-only: there is **no automated deployment job**; production rollout is
runbook-based (`docs/Deployment_Runbook.md`, `docs/Rollback_Procedures.md`). Permissions are pinned
to `contents: read`, and superseded runs are cancelled. Dependabot is configured
(`.github/dependabot.yml`) for weekly npm, pip, and GitHub Actions dependency updates and generated
the pull requests addressed in the P2-3 remediation. Branch-protection settings are managed in the
GitHub repository settings (not exposed through the unauthenticated API, so not asserted
numerically in this document).

### 13. Accessibility & Responsive Design

- **Automated axe scans**: `@axe-core/playwright` runs color-contrast, landmark, button-name,
  mandatory-content, and focus-order style checks across the suite (13 tests inside the E2E layer).
- **Forms and errors**: validation state is presented accessibly (`role=alert` error messages,
  semantic inputs) and asserted by E2E tests.
- **Responsive verification**: layout is verified at desktop and mobile viewports, with a
  `390×844@2x` device for the mobile evidence (rendered at `780×1688`), and a dedicated
  `visualResponsive.spec.ts` (20 checks) plus cross-browser smoke across Chromium, Firefox, and WebKit.
- **Evidence**: the full desktop/mobile walkthrough pack (`artifacts/portfolio/`) captures the same
  journeys at desktop and mobile widths; readiness gates at capture time asserted no spinners,
  loaded images, settled animations and fonts.

### 14. Production Hardening

Implemented in the application:

- `TrustedHostMiddleware` with an explicit `ALLOWED_HOSTS` allow-list; empty is refused at boot in production.
- Production startup rejects placeholder `SECRET_KEY`/`ADMIN_PASSWORD` and missing host allow-list.
- `/docs`, `/redoc`, `/openapi.json` disabled in production; `/api/health` (with DB connectivity check) remains.
- Security headers on all API responses; rate limiting on authentication and booking endpoints; validated image uploads.
- Session handling designed for HTTPS: HttpOnly + SameSite=Lax refresh cookie, `Secure` flag in production.

Documented-but-not-yet-deployed (infrastructure):

- nginx reverse proxy + systemd unit, TLS (HTTPS), HSTS and CSP applied at the nginx layer
  (`docs/Security_Headers_CSP_HSTS.md`).
- Persistent SQLite data and upload volumes, backup/restore (`docs/Backup_Restore.md`) and rollback
  procedures (`docs/Rollback_Procedures.md`).
- The `Infrastructure_VPS_Plan.md` and `Production_Deployment.md` runbooks await VPS provisioning
  (deployment is paused — P2-0C CONDITIONAL).

The distinction is deliberate: application hardening is implemented and verified by tests; the
transport/infrastructure layer is prepared as documentation until a VPS and domain exist.

### 15. Engineering Decisions & Tradeoffs

| Decision | Why | Tradeoff |
|---|---|---|
| SQLite instead of PostgreSQL | Zero-ops, file-based, correct for a single restaurant's workload; WAL gives atomic single-writer semantics | Single-node only; needs a migration path (already documented) if traffic/scale ever requires it |
| Same-origin deployment | Keeps SameSite=Lax cookies valid, removes production CORS looseness, single canonical host for TrustedHost | Couples SPA and API to one domain; requires a reverse proxy to route both |
| HttpOnly refresh cookie + in-memory access token | XSS cannot read the refresh credential; minimizes token persistence | Session does not survive a full browser restart without the refresh flow |
| Atomic `INSERT … SELECT … WHERE capacity-ok` | Capacity check and insert are one write; no oversell even under races | Requires thinking in single-statement terms; slightly less obvious than conditional-with-rollback logic |
| Local filesystem uploads (validated) | Simple, fully owned, no external dependency; validated by magic bytes | Not horizontally shareable; a future moving to multiple app servers would need object storage |
| Build-time SEO (generated meta/structured data) | Fast, no prerender service; deterministic, tested | Content changes require a rebuild rather than an edge render |
| Five-locale parity enforced by a spec | Prevents silent translation drift | Commits the project to maintaining five dictionaries |
| nginx/systemd deployment model | Standard, auditable, runbook-driven | Manual rollout rather than automated CD |

### 16. Dependency & Security Remediation

P2-3 performed a full dependency audit and remediation:

- Upgraded **FastAPI 0.115.6 → 0.141.1** and made **Starlette 1.6.0** an explicit pin (resolving the
  transitive version that had been silently drifting).
- Upgraded **python-jose 3.3.0 → 3.5.0**, **python-multipart 0.0.20 → 0.0.32**,
  **python-dotenv 1.0.1 → 1.2.2**, **pytest 8.3.4 → 9.0.3**, and **pytest-asyncio 0.24.0 → 1.4.0**
  (tooling only), and the virtual environment pip. No application code changed.
- `npm audit` reports **0 vulnerabilities** (including the production-only dependency view).
- `pip-audit` reports a single remaining advisory: **`ecdsa 0.19.2`** (CVE-2024-23342, retained as
  documented technical debt).

The ecdsa advisory explained accurately: it is **transitive via python-jose** and has **no upstream
fix** published at the time of this phase. The application signs and verifies tokens exclusively
with **HS256** (a shared secret); the ECDSA code path — the one affected by the advisory — is
**never invoked** by this application. The dependency is retained only because python-jose pulls it
in, and the appropriate long-term fix is to **migrate to a maintained JWT library** (tracked in the
Future Roadmap). The advisory is explicitly not hidden, and the residual risk is documented rather
than dismissed.

### 17. Evidence

A curated set of roughly 14 final screenshots plus 4 architecture diagrams is recommended from the
existing 44-shot pack. Screenshots are **not regenerated**: selection uses the files already
captured. See **`docs/portfolio/Portfolio-Evidence-Selection.md`** for the full candidate table with
per-shot rationale and confidence levels; the 44-shot source of truth is
`artifacts/portfolio/evidence-index.md` (and the machine-readable `evidence-manifest.json`), and the
demo data behind each shot is documented in `artifacts/portfolio/demo-shot-list.md`.

At a glance, the recommended set covers: homepage (desktop + mobile), Italian language proof, live
data-driven menu, availability result (28/40), full-slot refusal (0/40), confirmation with a real
reference code, lookup, cancellation result, admin dashboard, admin menu management, admin closures,
admin restaurant settings, and the mobile wizard.

### 18. Challenges & Solutions

- **Reservation concurrency** — the naive CHECK-then-INSERT oversells under races. Solution: a
  single atomic `INSERT … SELECT … WHERE` under SQLite WAL single-writer semantics, proven by a
  dedicated concurrency suite. Lesson: database-level atomicity beats application-level locking.
- **Authentication architecture** — balancing security with a restore-on-reload UX. Solution:
  memory-only access token + rotating HttpOnly refresh cookie, with honest tradeoffs documented.
- **Deterministic E2E testing** — E2E against a real backend threatens flakiness. Solution: a
  disposable backend launcher with fixed admin credentials supplied via environment, idempotent
  seed data, and readiness gates.
- **Admin session handling** — the admin UI must survive reloads and token refresh without storing
  secrets. Solution: a refresh flow that transparently re-issues the access token.
- **Lazy-loaded image readiness during capture** — screenshot evidence once caught spinners or
  half-loaded images. Solution: deterministic readiness gates (no spinner, images loaded, animations
  settled, network audit clean) before every capture.
- **Mobile screenshot/device configuration** — pixel-perfect evidence at a phone form factor.
  Solution: a `390×844@2x` device definition with PNG signature and dimension verification.
- **Production security hardening** — guards that must not break development. Solution: guards gated
  on `app_env`, production-only boot refusal for placeholders and missing host lists.
- **Migration integrity** — schema drift silent failure mode. Solution: a CI job that upgrades a
  fresh database and fails on a forked or multi-head history.

### 19. Results

Verified outcomes:

- **Automated coverage**: 112 backend tests, 132 Playwright E2E (Chromium), 10 plain-Node specs,
  all green.
- **Cross-browser**: smoke coverage across Chromium, Firefox, and WebKit.
- **Accessibility**: 13 axe tests inside the E2E suite.
- **i18n parity**: 538 keys × 5 locales with `en` fallback, enforced by spec.
- **Security hardening**: host allow-list, production secret guards, disabled API docs in
  production, security headers, upload validation, rate limiting.
- **CI**: pipeline green across backend/frontend/E2E jobs on push/PR.
- **Release**: repository tagged `v1.0.0` with full commit/version history preserved.
- **Deployment readiness**: runbook-based nginx/systemd/VPS plan prepared; provisioning is pending
  and explicitly not claimed as live.

Deliberately not claimed (not verified / out of scope): real-world production usage, uptime,
customer or revenue numbers, scalability benchmarks, or a deployed restaurant instance.

### 20. What I Learned

- **Transactional business logic** is about invariants. Designing the booking path around one
  atomic statement forced me to reason about *what a correct database state is* rather than about
  making a single write work.
- **Concurrency** changed how I read code: available capacity is not a number you compute and then
  insert against — it must be re-evaluated at write time under the writer's serialization.
- **Security is a set of deliberate choices with tradeoffs**, from where a token lives to what a
  failing host header means; each choice should be documented alongside its cost.
- **Testing depth comes from layers**: fast unit tests, semantic backend tests, and real-browser
  E2E catch different classes of mistakes, and none replaces the other.
- **CI is a discipline**, not a convenience: gates for migrations and locale parity catch drift
  that a unit test run alone would miss.
- **Accessibility and i18n are engineering requirements**, with tooling (axe, parity specs) that
  makes them verifiable instead of aspirational.
- **Production engineering is mostly honesty**: documenting the difference between what is
  implemented, what is prepared, and what is deployed keeps the project trustworthy.
- **Feature work and maintainability must be balanced** — this meant accepting a field-validated
  local upload store, a documented single-node database, and a deliberate release boundary (`v1.0.0`)
  rather than chasing an ever-growing scope.

### 21. Future Roadmap

Clearly labeled future work:

- **VPS deployment** — provision the VPS, run nginx + systemd, and deploy per the runbooks (currently paused).
- **Domain + HTTPS** — register the domain, obtain TLS, apply HSTS/CSP at the nginx layer.
- **Production monitoring** — health checks, logging, and alerting for the live instance.
- **Off-server backups** — automate SQLite and upload backups off the host.
- **PostgreSQL consideration** — revisit if the workload ever outgrows SQLite; the atomic booking
  statement is already portable.
- **JWT library migration** — replace python-jose (and its transitive `ecdsa` dependency) with a
  maintained library as the long-term fix for the documented advisory.
- **Productization** — further commercial work (onboarding, theming, tenant setup) building on the
  reusable platform.

### 22. Commercial/Product Potential

The architecture was built to be product-shaped: most of a restaurant platform is already modeled
as data and APIs rather than bespoke pages. Reusable modules for a future multi-restaurant or
per-client offering:

| Module | Status in Casa Aurelia |
|---|---|
| Restaurant branding/content | restaurant profile via API |
| Menu management | items/categories/images/allergens admin CRUD |
| Reservations | atomic capacity-safe booking + reference codes |
| Availability/capacity | live per-slot checking |
| Admin dashboard | KPIs + reservation management |
| Closures | blackout-date management |
| Contact messages | inbox + owner notifications |
| Multilingual content | 5-locale parity infrastructure |
| Deployment templates | nginx/systemd runbooks |

Casa Aurelia is **not** a SaaS product and does not claim to be; the platform is a credible
foundation from which a productized offering (white-label restaurant sites with tenant settings and
deployment templates) could be built.

### 23. Conclusion

Casa Aurelia demonstrates the ability to build a **complete business application**, not just a
frontend: a product with a real entity (reservations) that has real invariants (capacity), real
users (guests and staff), real operational needs (administration, closures, notifications), and
real engineering obligations (concurrency, security, internationalization, accessibility,
automated verification). It shows product thinking and engineering discipline applied end to end.

### 24. Links / Evidence

Placeholders to be filled when the live artifacts exist (no URLs are invented in this document):

- **GitHub repository**: `github.com/ra-builds/Casa-Aurelia` (current remote; repository visibility
  to confirm before publishing a case-study link).
- **GitHub release**: `v1.0.0` (release URL to be added).
- **Future live demo**: to be linked after VPS deployment.
- **Future personal portfolio case study**: to be linked when the portfolio site exists.
- **Future demo video**: to be added.

Supporting evidence lives in the repository:

- `README.md` — overview, engineering highlights, testing/CI matrix.
- `docs/` — CI/CD, deployment runbooks, backup/restore, rollback, security headers, demo guide.
- `artifacts/portfolio/evidence-index.md`, `evidence-manifest.json`, `demo-shot-list.md`,
  `P2-2.1-capture-correction-report.md` — the 44-shot capture and its determinism contract.
- `docs/portfolio/Portfolio-Evidence-Selection.md` — recommended final evidence set.