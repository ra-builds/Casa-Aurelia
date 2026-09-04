# Casa Aurelia — Productization / SaaS Strategy

Original Phase 26 of the Casa Aurelia roadmap.

> **PHASE 26 — Only Later: Productization / SaaS**
> **Not now.** After building several restaurant websites and discovering common
> requirements, then ask: "Which parts can become a platform?"
> **Possible direction:**
> Restaurant Dashboard → Manage website → Manage menu → Manage reservations →
> Manage translations → Manage branding
> **A SaaS makes sense once there are real customer requirements — not before.**

The roadmap's own Big Picture (page 9) sequences it: Build demo → production →
deploy → portfolio → show restaurants → "Want one like this?" → CUSTOM CLIENT #1 →
CUSTOM CLIENT #2 → CUSTOM CLIENT #3 → **Identify repetition** → Reusable platform →
**SaaS - maybe**.

---

## 1. What Phase 26 actually is (per the roadmap)

Phase 26 is titled **"Only Later: Productization / SaaS"** and opens with
**"Not now."** It is a **decision framework**, not a mandate to build a SaaS this
phase. The roadmap's sole instruction is:

> After building **several restaurant websites** and discovering common
> requirements, **then ask** "Which parts can become a platform?"

And its hard condition:

> **A SaaS makes sense once there are real customer requirements — not before.**

Per the current project state, **no real restaurant client has been delivered**
(Phases 21–25 produced the process, materials, and delivery/maintenance systems —
but no CUSTOM CLIENT #1/#2/#3, and no "identify repetition" step has run). The
roadmap's precondition ("several restaurant websites + real customer
requirements") is **not yet met**.

**Therefore, faithful Original Phase 26 is a productization strategy/decision
document — not a SaaS implementation.** No multi-tenancy, billing, Stripe,
customer portals, automated provisioning, tenant databases, subscription
management, SaaS auth, CMS, or full admin platform is built now. Building those
would violate the roadmap's own "Not now" and its customer-requirements gate.

---

## 2. The productization question

> "What exactly needs to change for Casa Aurelia to move from a one-off reusable
> restaurant website/template into the productized offering described by the
> original roadmap?"

This section answers it using the roadmap alone, separating what is already
reusable from what needs standardization/automation/technical work — and what the
roadmap says should remain until real requirements exist.

### A. Already reusable (from Phases 17–25)

- **The restaurant template** (Phases 17–18): one codebase, per-client
  customization via `frontend/src/config/site.ts` + `src/i18n` + theme tokens +
  imagery + backend live data (`GET /api/restaurant`, seed/menu).
- **Reusable delivery process** (Phase 24): Day 1–11 repeatable workflow.
- **Reusable maintenance process** (Phase 25): hosting/backups/security/menu/
  content/bugs/support + recurring-revenue model.
- **Sales materials** (Phase 21), acquisition (Phase 22), first-client handoff
  (Phase 23): target/approach/proposal/questionnaire/agreement.

### B. Needs standardization (to make repeatable, but only after real demand)

- A single shared way to represent "which parts of the template change per
  client" — already partially provided by the questionnaire + site config, but
  not yet exercised across multiple real clients.
- Standardized per-client configuration/copy consistently applied by the delivery
  process (already scripted by process, not yet proven at scale).

### C. Needs automation (candidates, all gated on real requirements)

Per the roadmap's "possible direction" for the eventual platform:

| Potential automation | Roadmap note |
|---|---|
| Restaurant Dashboard: manage website | "Manage website" |
| Manage menu | "Manage menu" |
| Manage reservations | "Manage reservations" |
| Manage translations | "Manage translations" |
| Manage branding | "Manage branding" |

These are the **eventual** platform dashboard capabilities — explicitly a
direction to be pursued **only once real customer requirements exist**. None is
built in this phase.

### D. Needs technical implementation (only when the roadmap gate is met)

- A multi-client dashboard/tenant layer (single-owner admin today is per-client,
  not multi-tenant).
- Automated provisioning of a new client site from the template.
- Billing/subscription management (Stripe, etc.).
- Tenant-aware data separation, SaaS authentication, customer portal.
- Full admin platform / CMS.

All are **deferred** — the roadmap says "A SaaS makes sense once there are real
customer requirements — not before" and the project has no real delivered clients.

### E. Should remain manual / operator-controlled (for now)

- Individual client delivery (Phase 24) and maintenance (Phase 25) — run per
  client by the operator.
- Client acquisition, quoting, agreements, deposits, payments.
- Per-client content capture and approval gates.
- Deployment/provisioning of a real domain for each site (Phase 20 operator
  action).

### F. Explicitly out of scope for Phase 26

- Any SaaS **implementation** (multi-tenancy, billing, Stripe, customer portal,
  automated provisioning, tenant DBs, subscription mgmt, SaaS auth, CMS, full
  admin platform). The roadmap does not require these "now."
- Phase 27+ (none defined in the roadmap; not invented here).

---

## 3. The productization gate (when to proceed)

Following the roadmap's Big Picture, productization proceeds only when ALL of:

1. **CUSTOM CLIENT #1, #2, #3** have been delivered (each via Phase 23/24).
2. **"Identify repetition"** — the common requirements across those real clients
   are documented (menu mgmt, reservations, translations, branding — or whatever
   actually recurs).
3. A genuine template/platform decision is reached **after** those real
   requirements exist — not before.

Until then, this phase records the decision framework and keeps the existing
reusable template + delivery + maintenance model as the product. This is the
roadmap-faithful position: the "Reusable platform" and "SaaS - maybe" steps come
**after** real clients identify repetition.

---

## 4. Does Casa Aurelia qualify as "productized" now?

Answer based on actual implementation, not marketing claims:

**Yes (standardized today):**
- One reusable restaurant **template** and **customization boundary** (single
  codebase, per-client config).
- A **repeatable delivery process** (Phase 24) and **repeatable maintenance
  process** (Phase 25).
- Centralized, documented customization points and material/process docs.

**No (still manual / not productized):**
- **No multi-client/SaaS layer** — each site today is a configured instance; there
  is no tenant separation, no self-serve dashboard, no automated provisioning.
- **No real delivered client validates the process** — the template and process
  are prepared but not yet proven across multiple real restaurants.
- **Automation/billing/portal SaaS** is not built (correctly deferred per the
  roadmap).

So the answer to "can Casa Aurelia now be offered repeatedly as a standardized
product rather than rebuilt from scratch?": **at the template/process level, yes
(reusable template + repeatable delivery + maintenance); at the SaaS level, no —
and that is exactly what the roadmap prescribes "not now."**

---

## 5. Client-template boundary (preserved)

Phase 26 does not weaken the established boundary:

- **CLIENT-SPECIFIC** (per restaurant): branding, identity, imagery, menu,
  contact details, hours, languages, reservation configuration, restaurant
  content — customized via `src/config/site.ts`, `src/i18n`, theme tokens,
  imagery, and backend live data, per the delivery process.
- **TEMPLATE/PRODUCT** (shared): architecture, components, standard workflows,
  delivery process, maintenance process, shared engineering standards.

`src/config/site.ts` and its customization boundary/tests remain untouched.

---

## 6. Deliverable of this phase

Because the roadmap frames Phase 26 as "Only Later … Not now" and gates any SaaS
on real customer requirements that do not yet exist, the deliverable is this
**productization strategy document** (decide-and-defer), plus the Phase 26 report.
No SaaS code is written.

---

## 7. Deferred technical improvements (not owned by Phase 26)

The product-audit engineering items are not productization concerns and are not
implemented here. They remain:

**DEFERRED TO APPROPRIATE ORIGINAL ROADMAP PHASE** —
real reservation email delivery; contact form → email (Phase 8); HttpOnly
refresh-token hardening; production secret guards; holiday/blackout dates; static
SEO fallback; route error boundary; CI restoration; admin CSV/calendar tools;
Playwright critical-path tests; monitoring/error-tracking service.

A candidate future SaaS dashboard (manage website/menu/reservations/translations/
branding) is recorded as the roadmap's **possible direction**, deferred until the
productization gate (§3) is met.

---

## 8. Honest status / no fabrication

- No SaaS customers, subscriptions, revenue, tenants, deployments, conversion
  rates, automation results, or business metrics are claimed or invented.
- The roadmap's precondition (several real restaurant websites + real customer
  requirements) is **not yet met**, so productization/SaaS remains a documented
  future direction, not an implemented product.
