# Casa Aurelia — Client Delivery System

Original Phase 24 of the Casa Aurelia roadmap — the **repeatable** delivery
process for every restaurant client after the first (which was handled
step-by-step in Phase 23). This is a reusable operating procedure: run it the
same way for Client #2, #3, and so on, without reinventing the workflow each
time.

> **PHASE 24 — Client Delivery System**
> A repeatable process (timeline depends on the client):
>
> | Day | Activity |
> |-----|----------|
> | Day 1 | Requirements |
> | Day 2–3 | Design/customization |
> | Day 4–7 | Development |
> | Day 8 | Testing |
> | Day 9 | Client review |
> | Day 10 | Corrections |
> | Day 11 | Deployment |
>
> The timeline is a **framework, not a promise** that every client takes exactly
> 11 calendar days. It depends on how quickly the client provides content and
> approvals.

This document reuses the earlier phases rather than duplicating them:

- `docs/Client_Questionnaire.md` — requirements capture (Day 1).
- `docs/Sales_Materials.md` — packages / pricing / honest capability framing.
- `docs/Proposal_Template.md` — quote / what's included / review round.
- `docs/Client_Agreement.md` — signed scope, price, deposit, payment terms.
- `docs/Client_Delivery_Process.md` — the Phase 23 first-client walkthrough this
  system generalizes.
- `docs/Deployment_Runbook.md` / `docs/Production_Deployment.md` —
  deployment (Day 11).
- `docs/Demo_Guide.md` — the demonstration/presentation.

---

## 1. What this system is (and is not)

**Is:** a standardized, repeatable daily delivery workflow for building and
shipping a restaurant website, with per-stage checklists, responsibilities,
approval gates, and completion criteria.

**Is not:**
- NOT a software platform, SaaS dashboard, CRM, or client portal.
- NOT Phase 25 (Maintenance/Recurring Revenue) — no recurring billing or
  subscription system here; deployment/handover ends this phase.
- NOT Phase 26 (Productization/SaaS) — no multi-tenant architecture.
- NOT a promise that every build is exactly 11 days.

Keep it lightweight: a solo developer/small business uses this doc plus the
existing sales/agreement/deployment docs — no new tooling required.

---

## 2. The customization boundary (what you may change per client)

The delivery system works **inside** the boundary established in Phases 17–18.
Per client you customize only the **content/static identity** — you do **not**
rewrite the shared architecture.

### CUSTOMIZABLE per client (fill from the questionnaire)
- Restaurant name / tagline / business-type label
- Branding: colours, typography, logo, style direction
- Address, city, country, phone, email
- Opening hours, closed day(s), capacity
- Social links (Instagram / Facebook / TripAdvisor)
- Menu: categories, dishes, prices, images, availability, dietary/allergen
- Currency
- Supported languages (up to the standard five) + default language
- Restaurant-specific copy / imagery (hero, gallery, story, signature dishes)

**Where (per client):**
- Backend live data — `backend/seed.py` (restaurant record, menu, categories) and
  the `GET /api/restaurant` data the site displays.
- Static brand config — `frontend/src/config/site.ts` (brandName, defaultTitle,
  ogImage/ogImageAlt, businessTypeLabel, defaultCurrency, referenceCodePrefix).
- Visual theme — `frontend/src/index.css` `@theme` tokens (colors, typography),
  the single source of truth for the visual identity.
- UI language strings — `frontend/src/i18n/translations/*.json`.
- Imagery — `frontend/src/utils/constants.ts` / `frontend/src/utils/galleryImages.ts`
  plus admin-uploaded menu images.

### STRUCTURAL / TEMPLATE (do NOT change per client)
- Application architecture, reusable UI components
- API structure (`/api/auth`, `/api/menu`, `/api/reservations`, `/api/restaurant`)
- Reservation architecture (booking, on-screen confirmation, lookup/cancel,
  duplicate handling, capacity)
- Admin architecture (single owner login)
- i18n architecture, authentication, core application behavior, SEO generator

> Do not weaken or bypass this boundary. If a client needs something structural
> that is not part of the template, that is an **extra** — scoped and priced
> separately (see `docs/Sales_Materials.md`), not a silent template change.

---

## 3. Delivery workflow overview (who, when, what)

Roles:
- **Developer (you / operator):** owns the build, testing, deployment, and the
  delivery sequence.
- **Client:** provides content and approvals; reviews the site; pays deposit +
  balance.

| Stage | Days | Produces | Owner | Approval gate |
|-------|------|----------|-------|---------------|
| Requirements | 1 | Confirmed scope + content list | Developer + Client | Client signs off scope |
| Design/customization | 2–3 | Approved design direction & brand config | Developer + Client | Client approves design direction |
| Development | 4–7 | Built & content-loaded site | Developer | (internal) each milestone |
| Testing | 8 | Tested build (checklist passed) | Developer | "Ready for review" |
| Client review | 9 | Client feedback | Developer + Client | Client reviews site |
| Corrections | 10 | Approved final build | Developer | Client approves; corrections accepted |
| Deployment | 11 | Live site + handover | Developer (operator) | Go-live confirmed |

**Blocking rules (what holds a stage open):**
- Development cannot start until the **deposit clears** (Step 6 of Phase 23) and
  the client has provided the required content.
- Design/customization cannot be considered done until the client approves the
  direction *in writing*.
- Testing begins only when development produces a complete, content-loaded build.
- Client review requires a test-ready build handed to the client (staging or
  preview URL, or local demo if not yet deployed).
- Corrections only cover agreed items from the review round; new scope requires a
  change request.
- Deployment requires: testing passed, client approvals collected, real domain +
  TLS + secrets provisioned, and (per agreement) the balance payment on
  completion.

---

## 4. Day-by-day checklist

### DAY 1 — Requirements

Goal: a complete, agreed requirements pack.

- [ ] Run `docs/Client_Questionnaire.md` with the client (in person or, if varying
      scope for a new client, via a call/email).
- [ ] Record the restaurant's core identity + contact/social details.
- [ ] Collect opening hours, closed day, capacity, reservation rules.
- [ ] Collect branding (logo, colours, fonts, style, inspiration links).
- [ ] Collect content: menu (dishes, prices, descriptors, availability, dietary/
      allergen), photos, story/About copy, translations required.
- [ ] Record supported languages and default language.
- [ ] Confirm the **two or three most important goals** and must-have vs
      nice-to-have.
- [ ] Confirm hosting/care preference and any extras.
- [ ] Complete when: scope + content list are confirmed **and signed off** (the
      questionnaire is the build contract).

**Blocks Day 2 if:** the client has not confirmed scope, or key content
decisions (languages, pages, reservations on/off) are unresolved.

### DAY 2–3 — Design / customization

Goal: an approved design direction and the brand/frame configured.

- [ ] Present the Casa Aurelia demo (`docs/Demo_Guide.md`) and agree a style
      direction (classic / modern / elegant / bold).
- [ ] Confirm brand colours, typography, logo, and imagery choices.
- [ ] Decide which customization points change (see §2): site config, theme
      tokens, imagery, i18n strings, languages.
- [ ] Confirm any non-template extras and price them (no unpriced surprises).
- [ ] Get **written approval** of the design direction.
- [ ] Complete when: client approves the design direction in writing; no scope
      ambiguity remains.

**Blocks Day 4 if:** the client has not approved the direction, or the final
content/images are not committed for development.

### DAY 4–7 — Development

Goal: a complete, content-loaded site within the customization boundary.

- [ ] Configure static brand config (`src/config/site.ts`) for the client.
- [ ] Apply theme tokens (colors/typography) for the client's brand.
- [ ] Load restaurant live data (backend `seed.py` / restaurant record): identity,
      hours, capacity, social links.
- [ ] Load menu (categories, dishes, prices, images, dietary/allergen,
      availability, signatures).
- [ ] Set supported languages + default; provide/localize UI strings
      (`src/i18n`) and translations.
- [ ] Swap imagery (hero, gallery, story) for client assets.
- [ ] Configure reservation settings per the questionnaire (capacity, slots,
      rules).
- [ ] Do NOT modify the shared structural components, API, reservation/admin
      architecture, or auth.
- [ ] Note anything outside the template as a scoped extra or a change request.
- [ ] Complete when: all customized content is loaded and the site is
      feature-complete per the agreed scope.

**Blocks Day 8 if:** any agreed content is missing or any in-scope feature is not
actually working.

### DAY 8 — Testing

Goal: a tested build that is "ready for client review."

- [ ] **Mobile/responsive:** verify phone and tablet layouts (nav, menu,
      booking form) render correctly.
- [ ] **Reservations:** book a future slot → on-screen confirmation + reference
      code; lookup and cancel work; duplicate (same email+date+time) rejected;
      capacity respected.
- [ ] **Menu:** categories/items/prices/images/dishes available, dietary/allergen
      correct, availability toggles respected.
- [ ] **Admin:** login works; reservation + menu management function; upload works
      (≤5 MB image).
- [ ] **Languages:** switch every supported language; confirm i18n parity and no
      missing strings.
- [ ] **Contact:** verify the contact page details, map link, and opening hours.
      Confirm contact form behavior is what was scoped — do **not** claim the
      form sends email (it currently shows a success state without sending).
- [ ] **SEO:** titles/descriptions/preview present; URL structure and social
      preview correct.
- [ ] **Honest-capability check:** only claim what actually works (see §8).
- [ ] Complete when: the testing checklist passes and the build is handed to the
      client for review.

**Blocks Day 9 if:** any blocker in the checklist fails — do not hand over a
build claiming working features that are not verified.

### DAY 9 — Client review

Goal: structured client feedback.

- [ ] Give the client access to the test-ready build (staging/preview URL, or
      local demo if production is not yet provisioned).
- [ ] Ask the client to review against their agreed goals and scope.
- [ ] Capture feedback as an explicit list of requested changes.
- [ ] Separate **corrections** (fixes to the agreed scope) from **new scope**
      (requires a change request/pricing).
- [ ] Complete when: the client has returned a written, itemized review; disputed
      items are clarified.

**Blocks Day 10 if:** the client review is incomplete or feedback is vague enough
to guess at.

### DAY 10 — Corrections

Goal: an approved final build.

- [ ] Implement the agreed corrections from the review round.
- [ ] Re-verify changed areas (re-run relevant parts of the Day 8 checklist).
- [ ] Do NOT silently expand scope; route new requests through a change request.
- [ ] Obtain **written approval** from the client that the build is final.
- [ ] Complete when: the client has approved the final build in writing.

**Blocks Day 11 if:** the client has not approved the final build, or approval is
pending an unresolved change request.

### DAY 11 — Deployment

Goal: a live site and a completed handover.

- [ ] Provision/confirm the real domain, host, DNS, TLS, and secrets (operator
      action — see `docs/Deployment_Runbook.md`).
- [ ] Set `VITE_SITE_URL` (SEO) and build the production frontend.
- [ ] Run migrations, deploy backend + frontend, configure nginx/systemd, enable
      HTTPS → HTTP redirect and security headers.
- [ ] Verify: health endpoint, customer pages (deep links not 404), reservation
      flow, admin login, uploads, backups, monitoring/log checks — per the runbook.
- [ ] Confirm go-live with the client; collect **balance payment** per the
      agreement (typically on completion before/at deployment).
- [ ] Hand over: admin login, admin-usage guidance (menu updates), hosting/care
      details, and any agreed support notes.
- [ ] Complete when: the site is live at the real domain, verified, and handed
      over; balance paid; client confirms go-live.

**Blocks handover/close if:** the site is not live/verifiable, or the balance per
the agreement has not been settled.

---

## 5. Completion criteria (stage by stage)

| Stage | "Ready for next stage" means |
|-------|------------------------------|
| Requirements | Scope + content list confirmed and signed off |
| Design/customization | Design direction approved in writing; content committed |
| Development | Full build loaded; no in-scope feature missing |
| Testing | Day 8 checklist passes; only honest, verified features claimed |
| Client review | Written itemized feedback received |
| Corrections | Client approves final build in writing |
| Deployment | Live, verified, handed over, balance paid, go-live confirmed |

**"Ready for deployment"** = testing passed + all client approvals collected +
real domain/TLS/secrets ready + balance settled per agreement.

**"Delivery complete"** = deployed + verified + handed over + balance paid +
client confirms go-live. Only then is the Phase 24 engagement closed (Phase 25
handles ongoing care).

---

## 6. Responsibilities quick-reference

| Responsibility | Developer | Client |
|---|---|---|
| Collect/comfirm requirements | drive | provide answers + content |
| Approve design direction | propose | **approve** |
| Provide content/menu/photos/translations | prompt | **provide** |
| Build within boundary | **own** | — |
| Test (mobile, reservations, admin, i18n, SEO) | **own** | — |
| Review the build | — | **review** |
| Corrections from review | **own** | approve |
| Deploy + verify + hand over | **own** (operator) | confirm go-live |
| Pay deposit + balance | — | **own** |

---

## 7. Change requests

Any request outside the agreed scope uses a written change request: describe the
change, its impact on **price** and **timeline**, and get both parties to approve
before doing it. This is the same rule as Phase 23 §6 and keeps scope and budget
honest.

---

## 8. Honest-capability guardrails (from the Phase 21/22 audit)

Do not claim functionality that is not real. At handover, verify and state only
what works:

- **Reservation confirmation email is NOT sent** — currently only on-screen
  confirmation + reference code is real (backend logs a mock confirmation email).
  Claim "instant on-screen confirmation and reference code", not "email sent."
- **Contact form does NOT send email** — it shows a success state (mock). Claim a
  "contact page/form", not "contact form emails reach the restaurant."
- **Testimonials** on the demo are sample/demo content, not real client quotes —
  don't present them as genuine.
- Verify **actual** reservation, admin, mobile, language, and SEO behavior in
  testing before claiming it in a handoff.

Where a genuine technical fix is needed (e.g. real email delivery), do **not**
fold it into the client delivery build — record it as:

> **DEFERRED TO APPROPRIATE ROADMAP PHASE**

and deliver the client build with the honest capability framing while the fix is
scheduled in its owning phase.

---

## 9. Reuse note

This Phase 24 system generalizes the Phase 23 first-client walkthrough
(`docs/Client_Delivery_Process.md`). Use whichever is appropriate: Phase 23 for
your **first** client; this system for **repeat** clients. Both reference the same
sales/agreement/deployment materials, so there is no duplication of templates.

---

## 10. Ready to use

If you get **Restaurant Client #2 tomorrow**, the answer is yes — run this doc
top to bottom: Day 1 requirements → Day 2–3 design → Day 4–7 development → Day 8
testing → Day 9 review → Day 10 corrections → Day 11 deployment. Every stage has
an owner, a checklist, a blocker, and a completion criterion. No application code
changes are needed to use it.
