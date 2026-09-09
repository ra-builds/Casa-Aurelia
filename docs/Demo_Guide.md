# Casa Aurelia — Portfolio / Demo Guide

> This guide turns Casa Aurelia into a **portfolio demonstration** you can show to a potential
> client. It explains what the project demonstrates, the two recommended demonstration flows
> (desktop and mobile), local setup, and how to prepare an admin login for the demo — without
> publishing credentials.

---

## Project

**Casa Aurelia — Modern Restaurant Website**

A complete, data-driven restaurant website: a responsive public site, five languages, online
reservations, a dynamic menu, an administration dashboard, mobile optimization, and SEO-ready
metadata.

### What it demonstrates

| Capability | Evidence |
|---|---|
| **Responsive** | Fluid layout (Tailwind breakpoints `sm`→`xl`), mobile nav drawer, responsive grids/cards/tables |
| **Multilingual** | 5 locales (EN, IT, FR, DE, ES), identical key parity (538×5), language selector in the navbar on every screen |
| **Online reservations** | 5-step flow (date → guests → time → details → review), real-time availability check, confirmation + lookup + self-service cancel |
| **Dynamic menu** | Menu, categories, items, prices, images, availability, dietary/allergen info — all loaded from the API |
| **Admin dashboard** | Secure login → KPI stats, reservation management (search/filter/confirm/cancel/delete), menu + category management |
| **Mobile optimized** | Touch targets, hamburger menu, thumb-friendly reservation form, horizontal-overflow-safe tables |
| **SEO ready** | Per-page titles/descriptions, canonical URLs, Open Graph, Twitter cards, `robots.txt`, `sitemap.xml`, Restaurant JSON-LD, `noindex` on private pages |

---

## Demonstration flow (Desktop)

```
Homepage  →  Menu  →  Reservation  →  Admin
```

1. **Homepage** — Show the full-screen hero, editorial sections, and the live restaurant
   identity (name, city, hours) which comes from the backend API.
2. **Menu** — Show categories as tabs, the lead plates, available/unavailable states, prices,
   dietary/allergen badges, and the “reserve” call-to-action.
3. **Reservation** — Walk the 5-step form: pick a date (future), the guests, a time, your
   details, review; submit and land on the **confirmation** screen with a reference code.
   Optionally show **Reservation Lookup** (find / cancel a booking) via the footer.
4. **Admin** — At `/admin`, sign in to the dashboard: KPI cards, reservation search/filter/
   status changes, and menu/category management.

## Demonstration flow (Mobile)

```
Homepage  →  Menu  →  Language selector  →  Reservation
```

1. **Homepage** — Hamburger menu opens the full-screen drawer; hero and sections stack cleanly.
2. **Menu** — Scrollable category tabs (`overflow-x-auto`, no horizontal page overflow).
3. **Language selector** — Open the selector in the navbar and switch language; the whole UI
   (nav, menu, reservation, footer) updates instantly.
4. **Reservation** — Complete the booking flow with touch-friendly buttons and inputs.

---

## Required local setup / prerequisites

1. **Backend** — FastAPI + SQLAlchemy; run from `backend/`:
   - `python -m venv venv` + activate, `pip install -r requirements.txt`
   - Copy `.env.example` → `.env`; set `SECRET_KEY` and `ADMIN_PASSWORD`
   - `alembic upgrade head` to apply migrations
   - `python seed.py` to seed the restaurant record, menu, and admin user
   - `uvicorn app.main:app --reload`
2. **Frontend** — from `frontend/`:
   - `npm ci`
   - `npm run dev` (generates `robots.txt`/`sitemap.xml`, serves `http://localhost:5173`)
3. Both must run together; the frontend reaches the backend via its API base (dev proxy or
   `VITE_API_URL`).

> See `docs/Deployment_Runbook.md` and `docs/Production_Deployment.md` for full deployment
> and production configuration.

---

## Admin demonstration — preparing an account (no secrets published)

The admin login is **environment-configured and seeded**, not hard-coded in the repository:

1. In `backend/.env`, set `ADMIN_EMAIL` (template default `admin@casaaurelia.it`) and
   `ADMIN_PASSWORD` (a value **you** choose — minimum 8 characters).
2. Run `python seed.py` — it creates the admin user from those environment values (it will not
   overwrite an existing user with the same email).
3. Sign in at `http://localhost:5173/admin` with those credentials.

The repository does **not** contain a usable admin password. For a client demo, use a
throwaway demo password set only in your local `.env`, and rotate/clear it afterwards.
`backend/.env` is git-ignored; never commit it.

---

## Visual QA / screenshots

Automated visual and responsive QA is implemented and runs through CI: the Playwright suite
covers full-page visual snapshots and viewport-related checks (`tests/visualResponsive.spec.ts`),
and a cross-browser smoke runs across Chromium, Firefox, and WebKit. For portfolio presentation,
do the following as a **supplemental** operator pass:

- Run both demonstration flows above in a real browser (desktop + a mobile viewport /
  device tools).
- Capture representative screenshots for the portfolio if you want visual material.
- Verify the homepage hero shows the live city, the reservation flow completes end-to-end, and
  the language switch is instant across all pages.

**Operator required:** a visual pass on the completed presentation is still recommended on top of
the automated QA.
