# Casa Aurelia — Acquisition / Outreach

Original Phase 22 of the Casa Aurelia roadmap. This document turns the Phase 21
sales materials into a practical, honest client-acquisition process for the
restaurant-website service.

Reference: the original `Casa_Aurelia_Project_Roadmap.pdf` (Phase 22),
`docs/Sales_Materials.md` (portfolio / demo / packages),
`docs/Client_Questionnaire.md` (discovery),
`docs/Proposal_Template.md` (quote), and `docs/Demo_Guide.md` (the demonstration).

---

## 1. Roadmap objective (verbatim intent)

> **PHASE 22 — First Client Acquisition**
> **Target:** Local restaurants — especially those with no website, outdated
> websites, only Instagram/Facebook, poor mobile websites, or no online
> reservations.
> **Approach:** Don't spam "BUY MY WEBSITE." Instead:
> "Hi, I build modern websites for restaurants. I created a demo restaurant
> website to demonstrate what I can offer. I'd be happy to show you and create
> something customized for your restaurant."
> Then show Casa Aurelia.

---

## 2. Target audience

Focus on **local restaurants** that most clearly benefit:

| Target signal | Why it matters |
|---|---|
| No website at all | Highest need — they have zero online presence. |
| Outdated / dated website | They know they need to improve but haven't. |
| Only Instagram / Facebook | They have social but no owned website or booking. |
| Poor mobile website | Most people browse on phones; a broken mobile site loses guests. |
| No online reservations | They still take bookings only by phone/email. |

Good first targets: independent restaurants, trattorias, pizzerias, bistros,
cafés, and family-run places in your local area — especially those with an active
local following but a weak web presence.

---

## 3. Why the demo-first approach (don't spam)

The whole premise is to **show value, not push a sale**. "BUY MY WEBSITE" spam
is impersonal and ignored. Instead, you position yourself as someone who
*builds modern restaurant websites* and offers a **live demonstration** of what
that looks like (Casa Aurelia). This is far more powerful than a local build
(see Phase 20) and far more personable than a hard sell.

**Guiding principle:** build curiosity and demonstrate value first; let the
restaurant decide it wants one.

---

## 4. The outreach script (use as a template)

Open, personal, low-pressure. Adapt to the channel (in-person, email, Instagram
message, phone). Keep it short and focused on offering a demonstration.

> "Hi [Name], I build modern websites for restaurants. I created a demo
> restaurant website to show what I can offer — online reservations, a live
> menu, and a multilingual, mobile-friendly design. I'd be happy to show it to
> you and create something customized for your restaurant. Would you be open to
> a quick look?"

Key points to keep:
- **"I build modern websites for restaurants"** — what you do.
- **"I created a demo restaurant website"** — proof, not just a claim.
- **"to demonstrate what I can offer"** — value-first.
- **"I'd be happy to show you and create something customized"** — tailored, not
  a one-size-fits-all pitch.
- **"Would you be open to a quick look?"** — a low-commitment ask.

### Honesty guard (audit-improvement safeguard)

Do **not** claim anything the product does not actually do. In particular:

- **Reservation confirmation**: the guest sees a **reference code on-screen** and
  can look up / cancel their booking. **Email notifications are NOT yet sent** —
  the backend currently logs a "mock" confirmation email. Frame it as
  *"guests get an instant on-screen confirmation and reference code"*, not
  *"guests receive a confirmation email."*
- **Contact form**: the contact **page and form exist**, but the form currently
  demonstrates a successful submission (mock) and does **not** send an email.
  Frame the contact page as *"address, phone, email, map, opening hours, and a
  contact form"*, not *"contact-form emails reach the restaurant."*
- **Testimonials** on the demo homepage are **sample/demo content**, not real
  customer testimonials. Do not present them as genuine.
- **Live demo URL**: the demo is not yet deployed publicly (Phase 20 is operator
  required). For now the demonstration runs locally; do not hand out a public
  demo link that does not exist.

Keeping these honest protects your credibility with every prospect and prevents
an awkward "actually, that doesn't work" discovery later.

---

## 5. The demonstration (show Casa Aurelia)

After the prospect agrees, run the demonstration. Full script in
`docs/Demo_Guide.md`. Recommended flows:

**Desktop:** Homepage → Menu → Reservation → Admin
1. **Homepage** — hero, the restaurant story, signature dishes, hours, location,
   the reservation call-to-action.
2. **Menu** — categories, prices, availability, dietary/allergen badges.
3. **Reservation** — walk the booking: date → guests → time → details → review →
   confirmation with a reference code. (Optionally show lookup/cancel too.)
4. **Admin** — at `/admin`, sign in to show reservations and menu management.

**Mobile:** Homepage → Menu → Language selector → Reservation
Show the phone layout: hamburger menu, scrollable menu, the language selector
(switch English → Italian live), and the touch-friendly booking form.

### Talking points

- *"Every restaurant gets a version of this, customized to them."*
- *"The menu and reservations are managed in a private dashboard — you don't
  need me for every update."*
- *"Languages can be added or removed depending on your guests."*
- *"It's SEO-ready and works beautifully on phones."*
- *"Reservations show an instant on-screen confirmation and reference code so
  guests (and you) can manage them."*

---

## 6. First conversation → discovery

If the prospect is interested, move to discovery (do **not** start coding yet —
this is the Phase 23 discipline, but have the tool ready here):

1. Use `docs/Client_Questionnaire.md` to capture restaurant details, branding,
   menu, languages, reservation needs, and any special features.
2. Identify their two or three most important goals and any budget/timeline.
3. Confirm which package fits (Starter / Professional / Premium) — see
   `docs/Sales_Materials.md`.

---

## 7. Process / tracking

Keep outreach organised and respectful. A lightweight, honest spreadsheet or list
(track the contact; a full CRM is Phase 24+/out of scope):

| Column | Purpose |
|---|---|
| Restaurant name | Target identity |
| Contact | Name / email / phone / channel |
| Target signal | no site / outdated / IG-only / poor mobile / no bookings |
| Status | new → contacted → demo shown → interested → quoted → won / not now |
| Date contacted | For respectful follow-up timing |
| Notes | Goals, preferences, package |

Approach cadence: follow up once or twice politely (e.g. a few days, then a week)
and stop if there's no interest — never pressure.

---

## 8. Follow-up

A short, friendly follow-up is fine:

> "Hi [Name], just following up on the restaurant-website demo — no pressure at
> all. If now isn't a good time, I'm happy to stay in touch. Happy to show it
> whenever works for you."

If they decline, keep them on a "future" list and move on. Respectful, consistent
outreach beats spamming.

---

## 9. Ready to use

You now have: the target audience, the script, the honest-framing guardrails, the
demonstration flow, the discovery tool, and a lightweight tracking approach.
Next (Phase 23) starts only once a prospect says "I like it."

> **Honest note:** the strongest sales proof is a **live, public demo** (Phase 20).
> Until Casa Aurelia is deployed to a real URL, the demo is shown locally via
> `docs/Demo_Guide.md`, and outreach should set that expectation accurately.
