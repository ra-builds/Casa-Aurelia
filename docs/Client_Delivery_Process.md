# Casa Aurelia — First Client Delivery Process

Original Phase 23 of the Casa Aurelia roadmap.

> **PHASE 23 — First Client**
> When someone says "I like it," don't immediately code. First:
> Requirements → Design direction → Price → Timeline → Agreement → Deposit →
> Development → Review → Deployment

This document turns that sequence into an operational, ordered hand-off process
for the **first real client**. It must NOT be confused with Phase 24 ("Client
Delivery System") — the repeatable, standardized platform used once client
delivery scales. Phase 23 is the *first* client, handled step by step in this
exact order.

It reuses the Phase 21 sales materials rather than duplicating them:
- `docs/Client_Questionnaire.md` — requirements capture.
- `docs/Sales_Materials.md` — demo, packages, pricing, honest capability framing.
- `docs/Proposal_Template.md` — quote / timeline / what's included.
- `docs/Client_Agreement.md` — the agreement and deposit (Phase 23 steps).
- `docs/Demo_Guide.md` — the demonstration.
- `docs/Deployment_Runbook.md` / `docs/Production_Deployment.md` — deployment
  (deployment is an operator action; see Phase 20).

---

## 1. Rule that governs this phase

> **Don't immediately code.**

When a prospect says "I like it," do **not** start building. Work through the
nine steps in order first. Skipping or reordering any of them creates scope
creep, unclear pricing, unpaid risk, or rework. Each step has a "complete when"
so you know it's done before moving on.

---

## 2. The nine steps (roadmap order — do not reorder)

| # | Step | Owner | Output | Tools | Complete when |
|---|------|-------|--------|-------|---------------|
| 1 | **Requirements** | You + client | Confirmed scope & content list | `Client_Questionnaire.md` | Questionnaire filled; top goals + must-haves confirmed |
| 2 | **Design direction** | You + client | Design direction approved | Demo + `Sales_Materials.md` (packages/style) | Client picks a style direction & localized to their brand |
| 3 | **Price** | You | Price agreed | `Sales_Materials.md` (packages), `Proposal_Template.md` | Package + extras priced; budget OK |
| 4 | **Timeline** | You | Delivery date agreed | `Proposal_Template.md` (cadence) | Start & delivery dates set and mutually confirmed |
| 5 | **Agreement** | You + client | Signed agreement | `Client_Agreement.md` | Both sign (scope, price, timeline, terms) |
| 6 | **Deposit** | Client | Deposit received | `Client_Agreement.md` (payment terms) | Deposit clears (e.g. 50%) before development starts |
| 7 | **Development** | You | Complete site | Casa Aurelia template + questionnaire content | Site built & content loaded per scope |
| 8 | **Review** | You + client | Approved site | `Proposal_Template.md` (review round) | Client reviews; corrections made; approval given |
| 9 | **Deployment** | You (operator) | Live site / handover | `Deployment_Runbook.md`, `Production_Deployment.md` | Site live at real domain; handover + admin access |

---

## 3. Step-by-step detail

### Step 1 — Requirements
Use `docs/Client_Questionnaire.md`. Confirm the restaurant's core identity,
hours, branding, images, menu, languages, reservations needs, contact setup and
hosting preference. **Record the two or three most important goals** and the
must-have vs. nice-to-have features. Do not guess content — the questionnaire is
the contract for what you'll build from.

### Step 2 — Design direction
Reuse the Casa Aurelia demo to agree a style: classic / modern / elegant / bold
(see `docs/Sales_Materials.md` Part 2 talking points). Confirm brand colours,
fonts, logo, and any inspiration sources. The client approves a *direction*
before any build. Keep within the template's customization boundary — bespoke
pages that are not part of the template are priced as extras (Step 3).

### Step 3 — Price
Map the agreed scope to a package (Starter / Professional / Premium) using
`docs/Sales_Materials.md`. Price any extras separately. Starting examples in the
materials are **not** a commitment — set actual numbers for your market and
delivery costs. Agree the one-time build and any ongoing hosting/care fee.

### Step 4 — Timeline
Set a start date and a delivery date using the roadmap's cadence (see
`docs/Proposal_Template.md` "Timeline": Day 1 requirements → Day 11 deployment;
adjust to the client). Agree **when the client provides content** — the build
schedule depends on it. A start date that awaits content is not green to start.

### Step 5 — Agreement
Document the agreed scope, price, timeline, included/not-included, and terms in a
signed agreement — use `docs/Client_Agreement.md`. Both parties sign. This is
distinct from the proposal: the proposal proposes; the agreement commits.

### Step 6 — Deposit
Collect the deposit (e.g. **50%** up front to begin) as defined in the agreement
and the proposal's Payment terms. **Development (Step 7) does not begin until the
deposit clears.** This protects against unpaid risk and confirms seriousness.
Record the deposit so it offsets the final invoice.

### Step 7 — Development
Only now build — configure the Casa Aurelia template to the restaurant's brand
and load the content collected in Step 1. Follow the customization boundary
(aligned with Phases 17–18). The reservation admin uses the single-owner login.
Do **not** add features outside the agreed scope without a change request.

### Step 8 — Review
Hand the site to the client for review (see `docs/Proposal_Template.md`
"What's included" — one review round with corrections). Collect feedback, make
the agreed corrections, and obtain written approval. No further scope changes
without a change request.

### Step 9 — Deployment
Deploy to the client's real domain and hand over access. This is an **operator
action** — follow `docs/Deployment_Runbook.md` and `docs/Production_Deployment.md`.
Confirm the site is live, DNS/TLS work, the admin login works, and go-live is
confirmed by the client. Final payment is typically collected on completion
before/at deployment, per the agreement.

---

## 4. Payment / deposit hygiene (honest, no fabrication)

- Quote real, chosen values only — never invent revenue, conversions, or leads.
- Deposit and balance terms live in `docs/Client_Agreement.md`; amounts are the
  client's real agreed values.
- If there is no client yet, there is **no deposit, no agreement, no signed
  scope** — put nothing fabricated in the tracker; the process simply has no row.

---

## 5. Single-client delivery tracker (Phase 23, not Phase 24)

A lightweight tracker for the **first client only**. Keep it local and do not
publish real client data in the repository. (A reusable, repeatable client-delivery
system — days, roles, checklists per client — is **Phase 24** and is explicitly
NOT built here.)

| Step | Status | Notes / date |
|------|--------|--------------|
| 1 Requirements | not started | |
| 2 Design direction | not started | |
| 3 Price | not started | |
| 4 Timeline | not started | |
| 5 Agreement | not started | |
| 6 Deposit | not started | |
| 7 Development | not started | |
| 8 Review | not started | |
| 9 Deployment | not started | |

---

## 6. Change requests

If the client asks for something not in the agreed scope, use a simple change
request: describe the change, the impact on price and timeline, and get written
approval before doing it. This keeps Steps 3/4/8 honest when scope shifts.

---

## 7. Ready to use

When a prospect says **"I like it"**: run the demonstration if not already shown
(`docs/Demo_Guide.md`), then Step 1 → Step 9 in order. Each step's tool is
already prepared. No engineering work is needed to run this phase — it is a
process with an agreement and a tracker.

> **Honest note:** the deployment step depends on the environment being capable
> of hosting a real domain. Until Phase 20 deployment provisioning is complete,
> Step 9 is an operator action to be performed when the client is ready.
