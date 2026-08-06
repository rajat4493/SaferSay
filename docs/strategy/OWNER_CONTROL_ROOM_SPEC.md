# SAFERSAY — OWNER CONTROL ROOM SPEC

**For:** Claude Code
**Focus:** Build the Company/Platform-Owner console (the SaferSay operator's command centre). One surface, built properly. This is the current single focus — structure is settled, now we build this one thing right.
**Pattern:** Standard SaaS operator/admin console (Stripe / Vercel / Supabase shape). Not bespoke — follow the convention.

---

## 0. WHAT THIS IS

The SaferSay operator's command centre. Three jobs in one console:
1. **Monitor health** — who's active, usage, live surveys, alerts.
2. **Run the business** — billing, plans, revenue, churn.
3. **Operate tenants** — create, configure, enable/disable features, support.

**Stance inside a client's tenant: SUPPORT-ONLY.** The Owner is hands-off by default and steps in when a client raises an issue. The Owner can view operational status and config to help, and can toggle plan/features — but can NEVER see response content, alter a client's survey content, or unmask a respondent.

**The one hard rule for every screen here:** show counts, rates, statuses, revenue. NEVER response content, never a report, never a single answer. If a number would require reading answers, it does not belong in this console.

---

## 1. LAYOUT (standard SaaS console)

- **Left sidebar nav** (persistent): Overview, Tenants, Billing, Usage & Health, Plans & Features, Support & Alerts, Settings.
- **Top bar:** SaferSay logo, environment indicator, global search (find a tenant fast), Owner account menu.
- **Main area:** the selected section. Landing = Overview.
- **Aesthetic:** the calm, data-dense "app" register from the design direction — typography-led, clean tables, stat cards, small CSS charts. Function-first but crafted. No heavy animation. This is an internal operator tool: legible over flashy.

---

## 2. OVERVIEW (the landing screen — what greets you at login)

Standard SaaS dashboard: a KPI stat-card row, then panels below.

**KPI stat-card row (top):**
- Active tenants (with ▲/▼ vs last period)
- Live surveys running now
- MRR / current revenue
- Total employees under management (seats across all tenants)
- Trials ending / at-risk tenants (count)

**Panels below:**
- **Attention feed** (left, primary): what needs action NOW — failed payments, support issues raised, tenants near plan limits, trials ending soon, delivery/email failures. Each item is a click-through to the relevant tenant or billing record.
- **Recent activity** (right): new signups, new surveys launched, plan changes, cancellations. A running operational log.
- **Trend chart** (bottom): tenants over time OR MRR trend — one small, lightweight line chart. Pick MRR for the business pulse.

Every tile shows a number or status. None shows an answer.

---

## 3. TENANTS (the client list + drill-in)

**Tenant list:** searchable, sortable table. Columns:
- Client name
- Plan tier
- # employees
- Survey status (Live / Draft / None / Closed)
- Health (OK / Attention / At-risk)
- Joined date
- Last active

Row click → **Tenant detail**.

**Tenant detail (SUPPORT-ONLY view):**
- **Metadata:** name, plan, joined date, primary contact, region/data residency.
- **Plan & features:** what their plan includes; toggles to enable/disable features per plan. (This is the one place the Owner *acts on* a tenant.)
- **Employee count** and import status (numbers only — never the list of names/answers).
- **Survey activity:** cycles running/closed, response COUNTS and completion RATES (e.g. "17 of 30 responded") — never response content, never the report.
- **Billing status:** subscription state, last payment, failed payments.
- **Support:** issues raised by this tenant, notes, a "assist" action that surfaces operational status to help — NOT a path to their data.

**Explicitly absent from tenant detail:** any report, any answer, any unlock-and-view, any "enter workspace to see results." The Owner's old ability to see a tenant's unlocked report is removed and must not return here. Assisting = seeing config/status/counts, never content.

**Create tenant:** provisioning flow — name, plan, primary contact, region → creates the isolated tenant.

---

## 4. BILLING / REVENUE

- MRR, revenue trend, churn rate.
- Per-tenant subscription status; plan distribution.
- Invoices, failed payments, upcoming renewals, cancellations.
- (Wires to Stripe when Stripe lands; scaffold now with the data model.)

---

## 5. USAGE & HEALTH

- Platform usage: surveys created, tokens issued/consumed, response counts (aggregate numbers), email (Resend) delivery status.
- System health: error rate, uptime signal, background job status (reminders, imports).
- Bug/issue reports surfaced here.
- All aggregate operational metrics — no content.

---

## 6. PLANS & FEATURES

- Define plan tiers and what each includes (the feature template each tenant is provisioned from).
- Enable/reduce features per tenant (drives the tenant-detail toggles).
- This is where "each customer gets a standard feature template based on their plan" is configured.

---

## 7. SUPPORT & ALERTS

- Issues raised by tenants (the support-only stance's inbox).
- System alerts: failed payments, delivery failures, tenants near limits, trials ending.
- Each alert links to its tenant/record for action.

---

## 8. SETTINGS

- SaferSay platform settings.
- Platform admin users (who on the SaferSay side has Owner/operator access).
- Global config.

---

## 9. CONFIDENTIALITY GUARDRAILS (must hold across the whole console)

1. **No response content, anywhere.** Every metric is a count, rate, status, or revenue figure. If building a tile would require reading answers, do not build it.
2. **No report access, no unlock, no "enter workspace to view results."** The removed Owner→report path must not reappear in any support flow.
3. **Support = operational status only.** Assisting a tenant surfaces their config, plan, counts, and delivery status — never their people's data.
4. **Counts are safe; content is not.** "17 of 30 responded" is fine. Any glimpse of *what* the 17 said is not.

---

## 10. BUILD ORDER (for this surface)

1. Console shell + left nav + top bar (the standard layout).
2. Tenants list + tenant detail (support-only) — the operational core.
3. Overview dashboard (KPI row + attention feed + recent activity + one trend chart).
4. Plans & Features (so tenant provisioning and feature toggles work).
5. Usage & Health + Support & Alerts (operational monitoring).
6. Billing (scaffold now; live when Stripe lands).

Build 1–3 first — that's a usable command centre. 4–6 layer on.

*This console shows the business, never the answers. Every screen respects the wall Claude Code just enforced: the operator runs the platform and sees nothing anyone said.*
