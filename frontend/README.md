# Casa Aurelia — Modern Restaurant Website

A polished, production-grade restaurant website built as a **portfolio demonstration**. It
showcases a complete, data-driven restaurant platform: a responsive public website, a
multilingual interface, online reservations, a dynamic menu, and an administration dashboard.

> This is the frontend package of the Casa Aurelia project. See the repository
> [`README.md`](../README.md) for the full project context and `docs/Demo_Guide.md` for a
> step-by-step demonstration script.

---

## What it demonstrates

| Capability | Where to see it |
|---|---|
| **Responsive design** | Every page adapts from desktop to mobile; a mobile navigation menu, fluid typography and grids |
| **Multilingual** | 5 languages (English, Italiano, Français, Deutsch, Español) via a language selector in the nav |
| **Online reservations** | 5-step booking flow (date → guests → time → details → review) + confirmation + lookup/cancel |
| **Dynamic menu** | Menu, categories, items, prices, images, availability and allergen info fully data-driven from the API |
| **Admin dashboard** | Secure login → KPI stats, reservation management, and menu/category management |
| **Mobile optimized** | Touch-friendly navigation, language selector and reservation form on small screens |
| **SEO ready** | Per-page titles/descriptions, canonical URLs, Open Graph, Twitter cards, robots.txt, sitemap, Restaurant JSON-LD |

See `docs/Demo_Guide.md` for the recommended **desktop** and **mobile** demonstration flows.

---

## Tech stack

- **React 19** + **TypeScript** + **Vite 8**
- **react-router 7** (route-level code splitting via `React.lazy` + `Suspense`)
- **i18next** (5 locales, identical key parity, `en` fallback)
- **Tailwind CSS 4** (design tokens in `src/index.css` `@theme`)
- **framer-motion** (page transitions, reduced-motion aware)

The companion backend (FastAPI + SQLAlchemy + Alembic) lives in `../backend`.

---

## Getting started

### Prerequisites

- Node.js 20+
- The backend API running (see `../docs/Demo_Guide.md` and `../docs/Deployment_Runbook.md`),
  with the restaurant and menu data seeded (`backend/seed.py`).

### Install & run

```bash
npm ci
npm run dev
```

`npm run dev` generates `robots.txt` + `sitemap.xml` (from `VITE_SITE_URL`, if configured) and
starts the dev server. Open the printed URL (default `http://localhost:5173`).

### Environment

| Variable | Purpose | When required |
|---|---|---|
| `VITE_SITE_URL` | Production origin used for canonical URLs, robots/sitemap | Production / deployment |
| `VITE_API_URL` | Backend base URL | When not using the dev proxy default |

No secrets belong in `VITE_*` values.

---

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Start dev server (generates SEO files first) |
| `npm run build` | Type-check + generate SEO + production build |
| `npm run preview` | Preview the production build (generates SEO files first) |
| `npm run lint` | Run oxlint |
| `npm test` | Run the plain-Node regression specs |
| `npm audit` | Dependency vulnerability audit |

---

## Project structure (frontend)

```
src/
  App.tsx                    # Route table + code-splitting (Original Phase 15)
  main.tsx                   # i18n init, ErrorBoundary
  config/site.ts             # Static brand config — the template customization point (Phase 17/18)
  contexts/RestaurantContext.tsx  # Live restaurant data (GET /api/restaurant)
  hooks/                      # useAuth, usePageTitle/usePageSeo, useFeaturedDishes
  i18n/translations/         # en, it, fr, de, es locale files (538×5 parity)
  layouts/MainLayout.tsx     # Navbar + Footer + Suspense + page transitions
  pages/                     # Home, Menu, Signatures, About, Gallery, Reservations,
                             #   Confirmation, ReservationLookup, Contact, Admin, 404
  components/
    home/                    # Homepage sections
    layout/                  # Navbar, Footer
    admin/                   # MenuManager, CategoryManager
    seo/                     # Restaurant JSON-LD
    ui/                      # Button, Container, PageLoader, ImageReveal, Reveal, ...
  utils/                     # helpers, date, locale, galleryImages, constants, seo
  services/api.ts            # API client
spec/                        # Plain-Node regression specs (incl. SEO, Performance, Template)
scripts/generate-seo.mjs     # Build-time robots.txt + sitemap.xml generator
```

---

## Customization boundary

`src/config/site.ts` is the single source for the **static brand identity** (brand name, default
title, OG image, business-type label, default currency, reference-code prefix). Live restaurant
data (name, address, phone, currency, hours, menu, …) is served by the backend and consumed via
`RestaurantContext`. See the config file comment block for the full customization architecture.

---

## Testing, lint & build status

- `npm test` — plain-Node specs: date helpers, time slots, responsive layout, formatting, SEO
  (74 assertions), performance (40), production hardening (9), customization (27), template
  boundary (34).
- `npm run lint` — oxlint.
- `npm run build` — TypeScript type-check + Vite production build (route-split chunks).
- `npm run test:e2e` — Playwright E2E suite (132 tests) against a disposable backend
  (`backend/run_e2e.py`); requires `E2E_ADMIN_EMAIL` / `E2E_ADMIN_PASSWORD`.
- `npm run test:e2e -- --config=playwright.crossbrowser.config.ts --project=chromium
  --project=firefox --project=webkit` — cross-browser smoke (Chromium, Firefox, WebKit).
- `npm audit` — dependency audit (0 vulnerabilities at last run).

### Browser, accessibility & visual QA

Automated browser, accessibility, visual/responsive, and cross-browser QA are covered by the
Playwright suite and run through CI:

- **Accessibility** — axe-based checks (`tests/accessibility.spec.ts`).
- **Visual / responsive** — full-page visual snapshots and viewport-related QA
  (`tests/visualResponsive.spec.ts`).
- **E2E** — end-to-end user flows: smoke, public navigation, reservation, auth, admin
  reservations, error edge cases.
- **Cross-browser** — representative smoke scenarios run across Chromium, Firefox, and WebKit
  (`playwright.crossbrowser.config.ts`).

GitHub Actions CI (`../.github/workflows/ci.yml`) runs the full E2E suite and the cross-browser
smoke on every push to `main` and on pull requests. A manual visual review is still useful for
portfolio presentation, but it is supplemental to the automated QA described above.
