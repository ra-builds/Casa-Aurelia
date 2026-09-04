# Casa Aurelia — Maintenance & Recurring Revenue

Original Phase 25 of the Casa Aurelia roadmap — the process by which the
restaurant-website business becomes **sustainable** through an ongoing hosting,
care, and support offer to delivered clients.

> **PHASE 25 — Maintenance / Recurring Revenue**
> This is where the business becomes sustainable.
> **Offer:** Hosting, backups, security updates, menu updates, content changes,
> bug fixes, technical support.
> **Example pricing:** €20–€50/month depending on what's included.
> (Starting examples only — actual pricing depends on market and delivery costs.)

This document is an **operational process**, not a software platform. There is no
subscription system, no customer portal, no SaaS dashboard, no recurring-billing
engine built here — those would be Phase 26 territory. This is the go-to-market
and delivery process for a recurring maintenance offer, ready to run per client.

It reuses (does not duplicate) the Phase 0–24 material that already covers the
mechanics:

- `docs/Sales_Materials.md` — the €20–€50/mo "Hosting & care" starting figures and
  package pricing to align against.
- `docs/Proposal_Template.md` (Hosting & maintenance §7, Payment terms) — quoting
  ongoing care.
- `docs/Client_Agreement.md` — terms for ongoing care where agreed.
- `docs/Client_Delivery_System.md` — the delivery process this phase extends with
  post-launch care.
- `docs/Backup_Restore.md` — backup/restore procedure (a maintenance duty).
- `docs/CI_CD.md` — CI + release checklist (update/ship duty).
- `docs/Deployment_Runbook.md` — monitoring/log-review checks (§22) and backup
  schedule (§21).
- `docs/Security_Headers_CSP_HSTS.md`, `docs/Rollback_Procedures.md` — security
  and rollback during changes.

---

## 1. What this phase is (and is not)

**Is:** a repeatable maintenance & support process with defined scope, a pricing
model, responsibilities, triggers, procedures, escalation rules, and completion
criteria — so each delivered client has a clear recurring care relationship.

**Is not:**
- NOT a software platform, SaaS dashboard, CRM, or automated client portal.
- NOT Phase 26 (Productization/SaaS) — no multi-tenant platform or self-serve
  dashboard.
- NOT a committed price (figures are starting examples only, per the roadmap).
- No fabricated clients, payments, incidents, uptime, metrics, or testimonials.

---

## 2. The offer (scope of care)

Depending on what is included (tier/pricing), a care plan covers all or a subset
of:

| Service | Description |
|---|---|
| **Hosting** | Hosting the client's site (domain/DNS/TLS/app) as agreed. |
| **Backups** | Scheduled backups + restorable snapshots (`docs/Backup_Restore.md`). |
| **Security updates** | Applying security updates to dependencies/platform; reviewing headers and secrets. |
| **Menu updates** | Menu add/change/remove on the client's behalf (if they don't self-serve via admin). |
| **Content changes** | Text, images, hours, contact, gallery updates within the existing scope. |
| **Bug fixes** | Fixing defects in the delivered site that are within the agreed scope. |
| **Technical support** | Answering the client's support questions; guidance on using the admin. |

**Pricing model (starting examples only):**

| Level | Monthly fee (example) | Typical inclusion |
|---|---|---|
| Basic care | €20/mo | Hosting + backups + security updates |
| Standard care | €30/mo | + menu/content updates + bug fixes + support |
| Premium care | €50/mo | everything + priority response + more changes |

> Per the roadmap: **"€20–€50/month depending on what's included. (Starting
> examples only — actual pricing depends on market and delivery costs.)"** Set
> real numbers for your market; do not quote these as committed.

**What is NOT included by default:** new pages, new features, large content
overhauls, online payments on site, staff accounts, or anything outside the
delivered site's scope. These are change requests / separate quotes.

---

## 3. Responsibilities

| Duty | Owner |
|---|---|
| Host the site and keep it reachable | Operator |
| Run backups and verify restorability | Operator |
| Apply security/dependency updates and verify | Operator |
| Action menu/content change requests | Operator |
| Fix in-scope bugs | Operator |
| Provide technical support | Operator |
| Report issues and approve changes | Client |
| Pay the recurring fee | Client |

---

## 4. Triggers (when maintenance fires)

| Trigger | Response |
|---|---|
| Scheduled backup (daily) | Run backup per `Backup_Restore.md`; weekly/monthly retention + verify. |
| Dependency/security advisory | Review, apply update, re-test, deploy (see `CI_CD.md` release checklist). |
| Menu/content change request | Confirm scope, apply, re-test the affected area, notify client. |
| Bug report | Triage severity; fix in-scope, or route out-of-scope to a change request. |
| Support question | Answer; document if it reveals a recurring issue. |
| Site down / performance issue | Diagnose via runbook monitoring checks (§22); restore/rollback as needed (`Rollback_Procedures.md`). |
| Client feedback at check-in | Review satisfaction; renew/adjust plan. |

---

## 5. Procedures

### 5.1 Routine maintenance rhythm

- **Daily:** verify site/API health (see `Deployment_Runbook.md` §22 checks);
  run backup.
- **Weekly:** restore-test a backup in a scratch copy (`Backup_Restore.md`);
  review logs for errors.
- **Periodic (on advisory/before release):** run the `CI_CD.md` release checklist —
  tests, lint, build, single Alembic head — before shipping any change.
- **On change:** apply the change to a staged/isolated build, run the relevant
  tests, verify, then deploy and confirm health.

### 5.2 Handling a menu/content change

1. Receive the client's requested change in writing (email is fine).
2. Confirm it is in scope; if not, quote as a change request.
3. Apply via the admin dashboard (menu) or a content edit.
4. Re-test the affected area (menu renders, image loads, dietary/availability
   correct).
5. Notify the client that the change is live.

### 5.3 Handling a bug / incident

1. Triage severity (critical = site down/data loss; high = feature broken; low =
   cosmetic).
2. Critical: check health → restore from backup or roll back per
   `docs/Rollback_Procedures.md` → notify client.
3. High/low: reproduce, fix in scope, re-test, deploy, confirm.
4. Record the resolution for the client's care history.

### 5.4 Handling a security concern

- Review dependencies (e.g. `pip-audit -r requirements.txt` for the backend) and
  apply/classify per `CI_CD.md` (deferred-by-policy: reviewed/classified, not
  blind auto-upgraded).
- Verify security headers/secrets per `docs/Security_Headers_CSP_HSTS.md` and the
  runbook; confirm no secrets are committed (`.env*` git-ignored).

### 5.5 Escalation rules

- **Out of scope / larger change** → stop, write a change request, quote, get
  approval, then proceed. Never fold unbudgeted work into the recurring fee.
- **Cannot resolve / environment limitation** → document the blocker, mark it
  **DEFERRED TO APPROPRIATE ROADMAP PHASE**, and be honest with the client about
  what the current product does and does not do.
- **Payment/relationship** → follow the agreement terms; do not fabricate payment
  status.

---

## 6. Completion criteria

| Task | Completed when |
|---|---|
| Backup | Snapshot taken, retention respected, restore-test passed (weekly) |
| Security update | Advisory reviewed; applied + tested + deployed if warranted; logged |
| Menu/content change | Change live, verified, confirmed to client |
| Bug fix | Fixed in scope, re-tested, deployed, client notified |
| Support request | Answered, resolved, logged |
| Care check-in | Client satisfied; plan renewed or adjusted as agreed |

---

## 7. Audit-improvement integration (safeguards/checkpoints only)

The engineering improvements identified in the product audit are incorporated here
only as **verification/checklist points that belong to maintenance**, not as new
implementation:

- **Backups/restore** → covered (supported by the original Phase 25 "backups"
  offer) via `Backup_Restore.md`; verify restore-ability.
- **Monitoring/error tracking** → covered as an operator checkpoint
  (`Deployment_Runbook.md` §22 health/log checks). The runbook already notes a full
  monitoring platform is out of scope; an error-tracking service is optional at the
  operator's discretion.
- **CI** → maintenance verification: any change ships only after the `CI_CD.md`
  checks pass.
- **Security/dependency audit** → verification/checkpoint (`pip-audit`
  reviewed/classified per `CI_CD.md`).
- **Production secret guard** → verification checkpoint: confirm `.env*` is
  git-ignored and no secrets committed before/after changes.
- **Real reservation email, contact-form email** → verification point: do **not**
  claim the current product sends real emails (both are mock/log-based today).
  If a client needs real email, mark it:
  **DEFERRED TO APPROPRIATE ROADMAP PHASE** (Phase 8 covers contact form → email),
  and do not implement it in Phase 25.
- **HttpOnly refresh-token hardening, holiday/blackout dates, static SEO fallback,
  route error boundary, admin CSV/calendar, Playwright tests** → maintenance
  verifications/deferred items; do not build them here. Verified behavior is
  claimed; anything not present is honestly flagged.

---

## 8. Honest-capability guardrails

- Only claim maintenance capabilities that the current product actually supports.
- The **contact form does not send email** and the **reservation "confirmation
  email" is mock/log-based** — do not imply real email delivery in support
  materials.
- **Testimonials** are sample/demo content — do not present as genuine.
- Do not fabricate clients, payments, incidents, uptime, metrics, or business
  results anywhere in this process or its records.

---

## 9. Operator-required work

- Set real, market-appropriate care pricing (the €20–€50 figures are starting
  examples only).
- Offer and agree a care plan with each delivered client (via proposal/agreement);
  collect the recurring fee per the agreement.
- Run the routine maintenance rhythm for each care client (backups, security,
  changes, support, monitoring).
- Keep care records, client data, payments, and incident/deployment logs **local**
  and confidential — do not publish real client/financial information to the
  repository.

---

## 10. Ready to use

After Phase 24 delivers a client, extend to this Phase 25 process: agree the care
scope and fee (§2), then run the rhythm and procedures (§5) with responsibilities
(§3), triggers (§4), escalation rules (§5.5), and completion criteria (§6). This is
where the business becomes sustainable — one care client at a time, honestly and
operationally, without building a platform.

---

> **Deferred (not implemented in Phase 25):** real email delivery, HttpOnly
> refresh-token hardening, production secret-guard automation, holiday/blackout
> dates, static SEO fallback, route error boundary, CI restoration, admin
> CSV/calendar, Playwright coverage, and a full monitoring/error-tracking service —
> each recorded as **DEFERRED TO APPROPRIATE ORIGINAL ROADMAP PHASE**, to be
> addressed in the phase that naturally owns it.
