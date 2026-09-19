# Portfolio Evidence Selection — Casa Aurelia

This document recommends the **final, curated evidence set** for the Casa Aurelia case study from
the existing 44-shot capture pack (`artifacts/portfolio/screenshots/`). No screenshots are
regenerated or modified. The user visually reviewed all 44 shots; selection below reflects both the
deterministic readiness data in `evidence-manifest.json` and the documented feature each screenshot
proves. Final visual sign-off still happens by a human — the engineering agent cannot view pixels.

Source of truth for the full pack: `artifacts/portfolio/evidence-index.md` (shot matrix),
`artifacts/portfolio/evidence-manifest.json` (per-shot gate/network/readiness),
`artifacts/portfolio/demo-shot-list.md` (deterministic demo data behind each shot).

---

## Recommended final screenshot set (~14)

| # | File | Type | What it proves | Why include | Confidence |
|---|------|------|----------------|-------------|------------|
| 1 | `desktop/01-home-desktop.png` | Desktop (1440×900) | The storefront: hero, editorial sections, live images | First impression; shows the product is a real website, not a wireframe | High |
| 2 | `desktop/02-home-italian-desktop.png` | Desktop | Multilingual UI — same page in Italian (`documentElement.lang=it`, "Prenota il Tuo Tavolo") | Concrete, visual evidence of the 5-locale i18n claim | High |
| 3 | `desktop/03-menu-desktop.png` | Desktop | Live data-driven menu: categories + dishes with pricing from the API | Proves content is API-driven, not hard-coded | High |
| 4 | `desktop/11-wizard-time-availability-desktop.png` | Desktop | Booking wizard step 3 with live availability resolved **open (28 of 40 seats)** at 2026-09-12 19:00 | Proves real-time availability integration against live API data | High |
| 5 | `desktop/12-wizard-time-capacity-desktop.png` | Desktop | Capacity refusal at **40/40 (0 seats)** on 2026-09-15 19:00 — the UI refuses a full slot | The most important business rule, visibly enforced | High |
| 6 | `desktop/15-confirmation-desktop.png` | Desktop | Wizard-produced confirmation with a real reference code (**CASA-F559ED**) | Closes the booking loop: creates → confirms | High |
| 7 | `desktop/16-lookup-desktop.png` | Desktop | Self-service lookup returning the real booking (`CASA-F559ED`) from the API | Proves the reference-code lookup flow works end-to-end | High |
| 8 | `desktop/18-cancellation-result-desktop.png` | Desktop | Post-cancellation state for a real reservation | Proves the customer cancel journey | Medium |
| 9 | `admin/36-admin-dashboard-desktop.png` | Admin (1440×900) | Admin dashboard: KPIs, status pills, reservation table | Flagship admin evidence; shows operations view of the same data | High |
| 10 | `admin/38-admin-menu-items-desktop.png` | Admin | Menu item management (CRUD, image thumbnails, availability) | Proves content management is a real admin capability | High |
| 11 | `admin/42-admin-closures-desktop.png` | Admin | Blackout-closure management (seeded 2026-10-21 "Private event") | Proves closure handling an operational feature | Medium |
| 12 | `admin/43-admin-restaurant-desktop.png` | Admin | Restaurant settings: capacity 40, closed day Monday, hours | Proves the whole system is driven by configurable settings | Medium |
| 13 | `mobile/20-home-mobile.png` | Mobile (390×844@2x) | Homepage at phone form factor | Responsive-design proof for the storefront | High |
| 14 | `mobile/25-wizard-time-availability-mobile.png` | Mobile | Booking wizard time grid at mobile width (open slot) | Responsive-design proof for the core booking flow | Medium |

## Optional / substitute candidates

| File | Role | Notes |
|------|------|-------|
| `desktop/14-wizard-details-validation-desktop.png` | Error/validation state | Strong proof of accessible form errors (`role=alert`); substitute or add if a validation-evidence slot is wanted |
| `desktop/17-cancellation-dialog-desktop.png` | Cancel booking | Pair with #8 to show the confirm dialog before the result state |
| `admin/37-admin-reservations-search-desktop.png` | Admin search/filter | Proves server-side search (e.g. "Colombo"); use if admin reservations deserve two shots |
| `admin/41-admin-messages-desktop.png` | Contact inbox | Proves the contact-message module; include if operations depth is preferred over closures/settings |
| `desktop/10-wizard-guests-desktop.png` | Wizard party size | Use only if the multi-step wizard deserves more steps shown |
| `mobile/28-confirmation-mobile.png` | Mobile confirmation | Adds a mobile closing of the booking loop (reference **CASA-54D3F8**) |

A lean target is the 14 above (screenshots 1–9 strongly recommended — High confidence); pick from
the optional table to reach the desired emphasis (validation, admin depth, mobile confirmation).

## Recommended diagrams (from `artifacts/portfolio/diagrams/`)

| File | What it proves |
|------|----------------|
| `reservation-concurrency.png` (or `.svg`) | The atomic `INSERT…SELECT…WHERE capacity-ok` booking design — the flagship engineering challenge |
| `architecture.png` (or `.svg`) | End-to-end architecture with test counts |
| `authentication-flow.png` (or `.svg`) | Access-token / HttpOnly refresh-cookie flow |
| `ci-pipeline.png` (or `.svg`) | The three CI jobs and their gates |

## Confidence notes

- **High**: shot content is deterministic by contract (route, seeded data, gate totals, network
  audit in `evidence-manifest.json`), and the feature is core to the narrative (home, desktop menu,
  live availability/capacity, confirmation, lookup, admin dashboard, admin menu, mobile home).
- **Medium**: shot is correct against the manifest but its inclusion depends on visual-aesthetic
  review (cancellation result, closures, settings) or on cosmetic polish that the user flagged as
  not final-quality in some shots.
- Final visual selection is a human step: open each candidate, reject any with visual flaws, and
  re-balance the set. Keep it at 8–15 screenshots; the four diagrams are always strong additions.

## Files NOT recommended for the final set (and why)

- `desktop/19-reservation-notfound-desktop.png` — intentional 404; more of a test-suite artefact than
  a portfolio highlight (the manifest network audit explicitly allows this intended 404).
- `desktop/04,05,06,07,08,09,13` and most mobile/admiration duplicates — overlapping coverage with the
  chosen set; kept in the pack as alternates.