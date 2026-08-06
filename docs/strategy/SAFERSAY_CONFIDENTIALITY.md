# SAFERSAY — FINAL ARCHITECTURE RECOMMENDATION

**For:** Claude Code
**Purpose:** The settled decisions on multi-tenancy, the three-layer confidentiality model, roles, and the hard bright lines. This supersedes ambiguity in earlier docs. Read fully. Flag anything you believe is wrong before building.
**Status:** Directional spec. Some items are already built (noted); some are fixes to existing code; some are new.

---

## 0. THE THREE LAYERS (the whole mental model)

Three planes, each walled off from the one above. This is the product.

1. **Company (SaferSay = the operator).** Manages tenants, plans, features, licensing, tokens, usage, billing, health. **Sees which customers exist and how much they use. NEVER sees any tenant's response content.**
2. **Client (one tenant = one customer company).** Owns their instance; controls their settings, branding, enabled features; decides who on their side can run surveys and view which reports. **Sees their own org's AGGREGATES only — never individual answers.**
3. **End users (survey takers / employees).** Receive a token link, answer. **See only their own submission.**

The one line that governs everything:
> **Company sees tenants but never answers. Client sees aggregates but never individuals. Employee sees only their own submission.**

---

## 1. MULTI-TENANCY ARCHITECTURE

### 1.1 The model: shared-schema, `tenant_id`-scoped, RLS-enforced

- ONE codebase, ONE app. Not a copy of the app per customer.
- Each customer = one **tenant**. All tenant data lives in shared tables, partitioned by `tenant_id` on every tenant-scoped row.
- **Do NOT use database-per-tenant or schema-per-tenant.** For the ICP (many small companies, thin margins, solo maintainer), physical DB-per-tenant would break both the economics and operational bandwidth (hundreds of DBs to patch/back up/migrate alone). Logical isolation, engine-enforced, is the correct choice.

### 1.2 Isolation must be DB-ENFORCED, not code-discipline (URGENT FIX)

- **Current state:** tenant isolation relies on application-code `WHERE tenant_id = $1` discipline. RLS is enabled on some tables but **no policies are defined**, and the app connects via a single Postgres role that likely bypasses RLS.
- **This is the top structural risk.** A shared-schema design's catastrophic failure mode is the cross-tenant leak — one missing `WHERE` clause and Customer A sees Customer B's data. For a confidentiality product this is existential, not a bug.
- **Required now (foundational, cannot be cheaply retrofitted):**
  1. Define real **RLS policies** on every tenant-scoped table, keyed to the request's tenant context.
  2. Connect the app via a **non-superuser DB role** that RLS actually applies to (not a role that bypasses it).
  3. Add tests proving a query executed in tenant A's context cannot return tenant B's rows.
- Do this before onboarding real customers and before more schema grows around the current model.

### 1.3 Per-tenant customization: keep it SHALLOW

- Safe/allowed: branding (logo, name, theme), plan-based feature enablement, `min_group_size` within a safe band (see §3).
- **Do NOT** let tenants diverge structurally (custom report logic, custom fields, custom question types) as product features. Deep per-client customization silently turns "one codebase" into "one product per customer" and destroys the multi-tenant advantage.
- Client-specific report layouts (e.g. matching one customer's designs) are a **separate internal customization layer**, never a core product feature.

---

## 2. THE CONFIDENTIALITY BRIGHT LINE (non-negotiable, existential)

### 2.1 Severance — the foundation (already built, must never get an exception)

- Identity/participation and response content live in **severed schemas** with no foreign key and no join path. Already real and tested. Keep it.
- **Severance must never get an exception — not a toggle, not "for the CEO," not "only when legally needed."** The moment the architecture *can* join identity to answers, the product's entire claim ("we cannot identify who said what, even if compelled") becomes a lie one switch away. Employees assume such switches get used → honest answers stop → data quality dies → the product is worthless.
- The confidentiality wall sits ABOVE every role, including the tenant's own Workspace Admin/Owner. **No role in any layer sees individual responses.**

### 2.2 FIX: Platform Owner currently violates this (do FIRST)

- **Current state:** the Super Admin "Enter workspace" flow lets the Company/Owner see a tenant's unlocked report once k≥5 is met — same access as an HR Admin.
- **Required:** the Company layer must have **zero path to response content**, threshold or not. "Enter workspace" shows tenant metadata, settings, and health only — never a report, never answers.
- This is not hardening; it's a correctness fix to a currently-false product claim. **Do this before the RLS work** — a false public claim outranks a latent risk. Both this week.

### 2.3 "Who said what" is a DIFFERENT PRODUCT, never a toggle

- If a tenant wants attributable feedback, that is a separate, clearly-labelled **Identified Survey** mode where employees are told UP FRONT "this is NOT anonymous; your name is attached."
- **Never** build a confidential survey with a hidden unmask capability. In confidential mode, unmasking must be **architecturally impossible**, not permission-gated.
- The employee must always know, before answering, which mode they are in. (Identified mode is future/optional — do not build in v1; just never contaminate confidential mode with an exception.)

---

## 3. MINIMUM GROUP SIZE (k) — configurable WITH A HARD FLOOR

- `min_group_size` is a **per-tenant setting**, default **5**, adjustable — because a 10-person startup with 3-person teams may see almost nothing at 5.
- **Hard floor the tenant CANNOT override: never below 3. Never 1.** At k=1 it stops being a confidential survey and becomes a form with names — product claim collapses.
- The tenant tunes within a safe band (e.g. 3–10). They can NEVER disable the wall.
- Enforce k at the reporting/query layer: no report node renders below the tenant's threshold. (Already partly built at k≥5 — make the value a guarded setting.)

### 3.1 Sub-threshold handling: ROLL UP, don't just suppress

Simple suppression ("hide teams under k") is not enough. The correct rule protects identity better AND keeps the data useful:

- A report node (team, department, org) renders **only if its response count ≥ `min_group_size`.**
- A sub-threshold team's responses are **NOT discarded and NOT shown in isolation** — they **roll UP the `manager_email` hierarchy** to the nearest ancestor node that clears the threshold, and are aggregated there.
- If the immediate parent is also sub-threshold, keep rolling up until a node clears — potentially all the way to Org level.
- Org-wide always renders (assuming total ≥ k).
- **Rationale:** a manager with only 3 reports should never get a 3-person report (they could infer who said what). Those 3 responses instead count inside their parent manager's larger, ≥k aggregate. The data is preserved at a level where the group is large enough to protect identity.

### 3.2 CRITICAL: guard against the DIFFERENCING ATTACK

Checking each visible cell individually is INSUFFICIENT. A viewer can reconstruct a hidden sub-k group by subtraction (e.g. sees a rollup of 8, knows 3 are their own direct team, infers the other 5 — or the reverse). The enforcement rule is therefore:

- **No COMBINATION of views/cells a single viewer can access may allow a sub-k group to be derived by arithmetic.** Not just "each cell ≥ k" — "no subtraction across accessible cells yields a group < k."
- Practically: when a sub-k team rolls up, do NOT simultaneously expose any other breakdown to that same viewer that lets the hidden group be backed out. Suppress across the FULL SET of views a viewer can reach, checking that no difference reconstructs a sub-k cell.
- This is what makes the confidentiality claim real rather than cosmetic. It is the harder, correct implementation.

### 3.3 Timing

Roll-up + differencing protection is a **v1.1 concern** (Manager/Department scoped views are deferred). But the **data model must support it now** — the `manager_email` hierarchy (§5) and scope-parameterised reporting (§4) already do. Capture the rule now; build enforcement when scoped manager/department views ship. v1 (Org scope only) needs just the single org-level ≥k check.

---

## 4. ROLES — capability × scope (not a flat list)

Model client-side roles as two composable dimensions, so the hierarchy scales without sprawl.

- **Capability (what they can DO):** Admin (run everything) / Operator (run surveys) / Viewer (read only).
- **Scope (what slice they SEE):** Org / Department / Team / Self.

Named roles are just points on the grid:

| Role | Capability | Scope |
|---|---|---|
| Workspace Admin / Owner | Admin | Org |
| HR / People Ops | Operator | Org |
| CPO | Admin | Org |
| CXO / Exec | Viewer | Org |
| Department Head | Viewer | Department |
| Manager / Team Lead | Viewer | Team |
| Employee / Survey Taker | Respond | Self |

- **Scope is driven by the employee CSV:** `department` → Department scope; `manager_email` → Team scope. No org-chart builder; hierarchy falls out of the upload.
- **Build reporting to take a SCOPE PARAMETER now** ("return aggregate for scope X, enforce k"), even though v1 only ever passes scope = Org. If reports are built as "admin sees everything," adding Department Head / Manager later is a full reporting rewrite. Scope-parameterised = every future role is just a new capability+scope row.
- Confidentiality invariant sits above the whole grid: **every role sees aggregates ≥k only, scoped to their slice; nobody sees individuals; Company sees no content at all.** Sub-threshold slices roll up per §3.1 and must satisfy the differencing guard in §3.2.

---

## 5. CSV / HIERARCHY

- Employee import columns: `name, email, team/department, manager_email, location`.
- **Add `manager_email` NOW even though Manager role is v1.1** — capturing it now costs little; re-importing every customer's list later to add it is real pain.
- `manager_email` = the org chart. `department` + `manager_email` together drive the two future scope levels (Department, Team).

---

## 6. WHAT TO BUILD vs DEFER

### Build / fix NOW (foundational or broken):
1. **Fix Platform Owner → response-content access** (§2.2). First. Broken trust claim.
2. **RLS policies + non-superuser DB role + isolation tests** (§1.2). This week.
3. `tenant_id` scoping on every tenant row (if not already universal).
4. `min_group_size` as a guarded per-tenant setting, floor 3 (§3).
5. Reporting built **scope-parameterised** (§4), shipping Org scope only.
6. Add `manager_email` column to CSV import, unused (§5).
7. **Hide `/viewer` manager pages from nav until Manager role is real** — shipping that UI ahead of the permission model risks leaking a sub-k team.

### v1 ships only TWO roles:
- **Workspace Admin** (Admin × Org) and **Employee** (Respond × Self). At 10–60 people the founder is the admin; no separate managers to scope yet.

### Defer to v1.1+:
- People Manager (Viewer × Team) and Department Head (Viewer × Department) scoped views.
- HR-separate-from-Owner, CPO/CXO distinctions.
- Identified Survey mode (§2.3) — separate product, never an exception to confidential mode.

---

## 7. SINGLE-POINT-OF-FAILURE / SEGREGATION — where it actually applies

"No single point of failure / full segregation" = **DB-enforced logical isolation**, NOT physical database-per-tenant.

- The real requirement: a failure or leak in one tenant **cannot reach another**, enforced by the engine (RLS), not by code discipline. → §1.2.
- The severance (identity↔response) must never get an exception. → §2.1.
- **Backups count:** severance and tenant isolation must hold in backups/exports too. A leak-proof live DB with an unprotected dump is a fake wall.
- Physical DB-per-tenant is NOT required and is the wrong call for the economics/bandwidth. Do not build it.

---

## PRIORITY ORDER (do in this sequence)

1. Fix Platform Owner response-content access (§2.2) — today.
2. RLS policies + non-superuser role + isolation tests (§1.2) — this week.
3. `min_group_size` guarded setting (§3) + `manager_email` column (§5) + hide unbuilt `/viewer` nav (§6) — cheap, do alongside.
4. Reporting scope-parameterised (§4).
5. Then resume the live-cycle critical path: CSV production import → Resend invites → Stripe.

*Everything here protects one thing that cannot be rebuilt: employees believing the wall is real. Every exception, toggle, or shortcut that touches severance, k, or tenant isolation deletes the product's only moat. When in doubt, choose the stricter option and flag it.*
