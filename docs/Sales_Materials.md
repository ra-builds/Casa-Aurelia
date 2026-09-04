# Casa Aurelia — Sales Materials

Original Phase 21 of the Casa Aurelia roadmap. This document bundles the three
**sales-facing** deliverables: (1) the portfolio page, (2) the demo website pitch,
and (3) the service packages. The other two Phase 21 deliverables are separate
documents:

- `docs/Client_Questionnaire.md` — the client discovery questionnaire.
- `docs/Proposal_Template.md` — the proposal / quote template.

Reference: `docs/Demo_Guide.md` (the demonstration script), `frontend/README.md`
(the portfolio presentation), and the original `Casa_Aurelia_Project_Roadmap.pdf`.

> Pricing values below are **starting examples only**, per the roadmap
> ("Starting examples only - actual pricing depends on market and delivery
> costs."). Adjust to your market before use.

---

## Part 1 — Portfolio Page (your work)

Intent: a short, confident summary that lets a potential client immediately see
what you build and whether it matches what they want. Use this as the copy for a
portfolio site / LinkedIn / a shared PDF, and as the opening of your first
conversation.

### One-liner

> **Casa Aurelia** — a modern restaurant website: responsive, multilingual,
> online reservations, a live menu, and an admin dashboard.

### What it does (capability summary)

| Capability | What it means for a restaurant |
|---|---|
| **Responsive design** | Looks great on a phone, tablet, and desktop — no squinting or broken layouts. |
| **Multilingual** | English, Italian, French, German, Spanish out of the box. Your guests see your site in their language. |
| **Online reservations** | Guests book a table online — date, time, party size, details — with instant on-screen confirmation and a reference code they can use to look up / cancel. |
| **Dynamic menu** | A menu the restaurant can update: dishes, prices, images, availability, dietary/allergen info. |
| **Admin dashboard** | A private area to manage reservations and the menu — no developer needed for daily updates. |
| **Mobile optimized** | Touch-friendly navigation and booking designed for the way people actually browse. |
| **SEO ready** | Page titles, descriptions, search engines, social-share previews, and structured restaurant data. |

### Built with

A modern, reliable stack: React, TypeScript, FastAPI, a real database with schema
migrations, and production hardening (security headers, rate limiting, CORS,
authentication).

### Scope of one build

- A custom restaurant website based on the proven **Casa Aurelia template**.
- Your branding: name, colours, fonts, logo, tagline.
- Your business data: address, phone, email, opening hours, social links, map.
- Your menu: categories, dishes, prices, images, availability.
- Your languages: choose the languages to support (up to the standard five).
- Online reservations and the admin dashboard.
- Optional extras (see Service Packages): hosting, maintenance, contact form →
  email, photo guidance.

> **Honest framing (current implementation):** several "nice-to-have" claims are
> not yet real in the demo, so present them accurately:
>
> - **Contact form** — the contact *page* and *form* exist. However, submitting
>   the form currently demonstrates a success state (mock) and does **not** send
>   an email yet. Present it as "a contact page with form", not "contact emails
>   reach the restaurant."
> - **Reservation confirmation email** — guests get an **instant on-screen
>   confirmation and reference code**; the backend still logs a "mock"
>   confirmation email rather than sending one. Do not claim emails are
>   delivered. (Roadmap Phase 8 flags the contact form → email as an eventual
>   feature.)
> - **Testimonials** on the demo homepage are **sample/demo content**, not real
>   customer testimonials — don't present them as genuine.
>
> Keeping these exact maintains credibility with every prospect.

> **Honest note (demo = not yet deployed):** the roadmap's Phase 20 (deploy the
> demo publicly) is the natural complement to this portfolio page. Until Casa
> Aurelia is live at a real URL, present the portfolio and run the demonstration
> locally (see `docs/Demo_Guide.md`).

---

## Part 2 — Demo Website (Casa Aurelia)

The demo is your proof. Per the roadmap, the pitch is:

> "I build modern websites for restaurants. I created a demo restaurant website
> to demonstrate what I can offer. I'd be happy to show you and create something
> customized for your restaurant."

(That wording is the Phase 22 approach — the demo *materials* you prepare here in
Phase 21 make it ready to present.)

### How to present the demo

**Recommended flow — desktop:** Homepage → Menu → Reservation → Admin

1. **Homepage** — hero, the restaurant story, signature dishes, hours and
   location, the reservation call-to-action.
2. **Menu** — categories (Antipasti, Primi, Secondi, Dolci, Drinks), prices,
   availability, dietary/allergen badges.
3. **Reservation** — walk the booking: date → guests → time → details → review →
   confirmation with a reference code. (Optionally show lookup/cancel too.)
4. **Admin** — at `/admin`, sign in to see reservations and menu management.

**Recommended flow — mobile:** Homepage → Menu → Language selector → Reservation

Show the phone layout: the hamburger menu, scrollable menu, the language
selector (switch English → Italian live), and the touch-friendly booking form.

### Talking points

- *"Every restaurant gets a version of this, customized to them."*
- *"The menu and reservations are managed in a private dashboard — you don't need
  me for every update."*
- *"Languages can be added or removed depending on your guests."*
- *"It's SEO-ready and works beautifully on phones."*

### Demo prerequisites

See `docs/Demo_Guide.md` for setup (backend + frontend) and the admin-login
preparation (environment-configured, seeded — **no credentials are published**).
For a client demo, use a throwaway demo password set only in your local `.env`
and rotate/clear it afterwards; `backend/.env` is git-ignored and never committed.

---

## Part 3 — Service Packages

Three tiers so a restaurant can choose the level that fits. Adjust pricing to
your market and delivery costs — these are **starting examples**.

### Starter — the essential restaurant website

*Perfect for a restaurant that just needs an online presence.*

- Responsive website (up to 5 pages: Home, Menu, About, Contact, Gallery)
- Online reservations (booking flow + confirmation + lookup/cancel)
- 1 language (of the standard five)
- Mobile optimized
- SEO-ready metadata
- Menu built from your data
- Browser-based testing & delivery

**Typical price (starting example):** €1,200 one-time + €20/month hosting & care

### Professional — the most popular choice

*The full Casa Aurelia experience a restaurant can grow with.*

- Everything in **Starter**
- Multilingual: up to 3 languages (e.g. EN + IT + your choice)
- Full admin dashboard (reservations + menu management)
- Dynamic menu with images, availability, dietary/allergen info
- Contact page (address, phone, email, map, hours, contact form)
- Social links + map
- Production hardening (security headers, rate limiting)

**Typical price (starting example):** €2,400 one-time + €30/month hosting & care

### Premium — fully customized

*For a restaurant that wants a distinctive, tailored site.*

- Everything in **Professional**
- Up to 5 languages (EN, IT, FR, DE, ES)
- Full branding & design customization (colours, typography, imagery)
- Photo guidance / image sourcing
- Priority support and preferred turnaround
- Extended maintenance & content updates

**Typical price (starting example):** €4,500 one-time + €50/month hosting & care

### Service packages — what's in/out of scope (per tier)

| Item | Starter | Professional | Premium |
|---|---|---|---|
| Pages | up to 5 | full set | full set + extras |
| Languages | 1 | up to 3 | up to 5 |
| Online reservations | yes | yes | yes |
| Admin dashboard | — | yes | yes |
| Menu management | — | yes | yes |
| Contact page (form) | — | yes | yes |
| Branding customization | basic | standard | full |
| Hosting & care | €20/mo | €30/mo | €50/mo |

> **Out of scope for all tiers (deferred):** online payments, staff accounts /
> roles, a full CMS, multi-restaurant (SaaS) platform. These are documented in
> the roadmap as later phases (25–26) and are not part of a Phase 21 website
> build.
>
> **Also honest-to-flag (current demo):** the **contact form** and the
> **reservation "confirmation email"** do not yet send real email — the form
> shows a success state (mock) and the backend logs a mock confirmation. Quote
> them as on-screen behavior, and treat contact-form mail as an optional
> add-on to scope, not a built-in.

### Hosting & maintenance (Phase 25 future offer)

For reference, hosting and care cover: hosting, backups, security updates, menu
updates, content changes, bug fixes, and technical support. The €20–€50/month
figures above are **starting examples only** per the roadmap.

---

## Ready to use

These three pieces (portfolio text, demo presentation, service packages) together
form the sales materials asked for in Phase 21. Pair them with
`docs/Client_Questionnaire.md` (to scope a real client) and
`docs/Proposal_Template.md` (to quote one).
