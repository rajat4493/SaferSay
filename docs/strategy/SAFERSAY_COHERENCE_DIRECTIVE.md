# SAFERSAY — COHERENCE REVIEW & GAP-FILL DIRECTIVE

**For:** Claude Code
**Type:** Review-first, then plan, then build. Do NOT start building until Step 2 is complete and acknowledged.
**Source of truth:** `FEATURE_SCREEN_REFERENCE.md` (verified against source), plus the five structural gaps identified by the product owner below.

---

## STEP 1 — DEEP REVIEW (do this first, produce a written output)

Before proposing anything, read and understand the following. Your job here is to form an independent picture of the product as it actually exists — not as it is intended to exist.

### 1.1 Read these sources in full

1. `FEATURE_SCREEN_REFERENCE.md` — every screen, every API route, every known gap. This is ground truth.
2. `src/lib/permissions.ts` — the full role model. Understand exactly what each role can and cannot reach.
3. `src/components/InviteOutboxPanel.tsx` — the seven-button invite screen. Read every button, every API call, every state.
4. `src/app/app/page.tsx` — the surveys home. Understand the empty state, the loading state, and the first-login path.
5. `src/app/api/super-admin/switch/route.ts` — the impersonation endpoint. Confirm it works and what it expects.
6. `src/app/console/tenants/[id]/` — the tenant detail panel. Confirm the "Enter workspace" button does not exist.
7. `src/app/app/workspace/` — every settings screen. Confirm there is no invite-a-teammate UI.

### 1.2 Produce `COHERENCE_REVIEW.md`

Write a document with these exact sections. Be specific — name files, routes, and component names. Do not describe what the product *should* do; describe what it *actually* does right now.

**Section A — What works end to end (verified)**
List every user journey that a real person can complete today without hitting a dead end, a missing screen, or a broken state. Be conservative — only include flows you can trace all the way from entry to completion in the source.

**Section B — What is broken or incomplete (verified)**
For each broken/incomplete item:
- What the user tries to do
- Where they get stuck (exact route, component, or missing element)
- What exists in the backend/code that is not yet reachable from any UI
- Severity: Blocks pilot (P0) / Blocks multi-user (P1) / Polish (P2)

**Section C — What is disorienting (UX gaps)**
List every place where the product fails to tell the user:
- Where they are
- What just happened
- What to do next
Rate each: P0 / P1 / P2.

**Section D — Role and access gaps (specific)**
For each of the four roles (`customer_admin`, `survey_creator`, `auditor`, `employee`):
- What they can reach today
- What they should be able to reach per the spec but cannot
- What UI is missing to assign or manage that role

**Section E — Your proposed fix list**
Based on Sections A–D, propose a prioritised fix list. Each item:
- What to build
- Why (which gap it closes)
- Estimated complexity: Small (hours) / Medium (day) / Large (days)
- Dependencies (what must exist first)

Do not start Step 2 until `COHERENCE_REVIEW.md` is written and committed.

---

## STEP 2 — PLAN (produce before any code)

After completing Step 1, write `COHERENCE_PLAN.md` covering the five structural gaps below. For each gap, your plan must include: exact screens affected, exact components to create or modify, exact API routes to create or modify, and acceptance criteria (how you know it is done).

### Gap 1 — First-run setup sequence (P0 — blocks every new tenant)

**The problem:** A new admin signs in, lands on the Surveys home, sees an empty state, clicks "New survey," and immediately gets a server error: "Upload employees before creating a survey cycle." The product teaches by failing. There is no guided path from signup to first live survey.

**What to build:** A linear three-step first-run flow that appears on first login and disappears permanently once all three steps are complete.

Step 1 — Import your people (People zone)
Step 2 — Create your survey (Surveys/New)
Step 3 — Send invites (Survey Send tab)

Rules:
- Step 2 is unreachable until Step 1 is complete (at least 1 active employee exists).
- Step 3 is unreachable until Step 2 is complete (a draft cycle exists).
- Completing Step 3 (invites queued/sent) marks first-run as done. The sequence never reappears.
- Completion state persists server-side (not localStorage) — a `first_run_completed_at` column on `identity.tenant_settings` or equivalent. If the user closes the browser mid-setup, they resume where they left off.
- After first-run completion, the Surveys home is the permanent home — no setup banner, no wizard.

Design register: calm, not alarming. One step visible at a time. Progress indicator showing Step N of 3. Same card/button components as the rest of the admin. No confetti, no celebration beyond a plain "You're set up — your first survey is live."

### Gap 2 — Invite/Send page → one smart button (P0 — blocks clean survey delivery)

**The problem:** The Send tab (`/app/[surveyId]/send`) shows seven independent action buttons (Prepare invites, Queue invites, Send test invites, Prepare reminders, Queue reminders, Send test reminders, Refresh). This is the internal pipeline surfaced as the user's job. A non-technical HR person cannot use this screen.

**What to build:** Replace the seven-button grid with a single context-aware primary action that reads the current invite/send state and shows exactly one thing to do:

| Current state | What the user sees |
|---|---|
| Invites prepared but not sent | "Send invites to N people" (primary black button) |
| Invites sent, survey live, non-responders exist | "Remind N people who haven't responded" (primary black button) |
| Invites sent, survey live, everyone responded | "Everyone has responded" (no action needed, plain text) |
| Survey closed | "Survey closed — no further sending" (no action) |

All prepare/queue mechanics run server-side as part of the send action — invisible to the user. One button triggers the full pipeline. The user never sees the word "queue."

Keep a collapsed "Developer / test mode" section (hidden by default, expandable) that exposes the raw buttons for engineering use. Never visible to a normal HR admin by default.

The participation summary (who has responded, who hasn't — from the participation store only, never from the response store) stays visible as a read-only count, not as a button cluster.

### Gap 3 — Owner "Enter workspace" button (P0 — owner cannot support tenants)

**The problem:** `POST /api/super-admin/switch` exists and works. `ImpersonationBanner` (the exit path) exists and works. But there is no button anywhere in `/console` that calls switch with an actual `tenantId`. An Owner literally cannot enter a tenant's workspace through the UI.

**What to build:** On the Tenant Detail panel (`/console/tenants/[id]`), add a single "Enter workspace →" button. On click: POST to `/api/super-admin/switch` with `{ tenantId }`, then redirect to `/app`. The `ImpersonationBanner` handles the exit. Nothing else needed — the backend is already complete.

Placement: top-right of the tenant detail page, secondary button style (not primary — entering a tenant is a support action, not the primary thing an Owner does on this screen).

Copy on the button: "Enter workspace →"
Copy when impersonating (already in `ImpersonationBanner`, verify it says): "You're viewing [Tenant Name]'s workspace — Return to console"

### Gap 4 — Team access: invite with role (P1 — blocks any multi-user company)

**The problem:** Every OAuth sign-in becomes a `customer_admin`. There is no UI to invite a teammate, assign a role, or create a Viewer-only account. A founder who wants their HR manager to run surveys, or their CEO to view results, has no path to set that up.

**What to build:** A "Team" section in Workspace settings (`/app/workspace/team`).

**Member list view:**
- Table: Name / Email / Role / What they can access / Actions (remove)
- Shows all users on the tenant (`identity.users` for this tenant)
- Role shown as a human-readable label: "Admin (full access)" / "Survey creator (surveys + people)" / "Viewer (reports only)"

**Invite flow:**
- "Invite teammate" button → inline form (not a modal): Email field + Role selector (three options: Admin / Survey creator / Viewer) + "Send invite" button
- Backend: create a pending invite row in `identity.users` with `status='invited'` and the specified role. Send an invite email via Resend. When the invited person signs in via OAuth for the first time, `resolveUserRecord()` finds the pending invite row, uses its role instead of defaulting to `customer_admin`, and marks it accepted.
- If no pending invite exists for an email: existing behaviour (new `customer_admin`) unchanged.

**Access clarity:** Below the member list, a plain read-only table showing what each role can access:

| | Surveys | People | Reports | Workspace |
|---|---|---|---|---|
| Admin | Full | Full | Full | Full |
| Survey creator | Full | Full | Full | — |
| Viewer | — | — | View only | — |

This table is informational only — not interactive. It answers "what will Sarah see when she logs in?" before sending the invite.

### Gap 5 — Per-tenant access visibility for the Owner (P1)

**The problem:** The Owner console Tenant Detail screen shows plan, features, usage counts, and billing — but not who has access to the tenant and with what role. An Owner helping a tenant debug an access problem has no way to see their member list.

**What to build:** Add a "Members" card to the Tenant Detail panel (`/console/tenants/[id]`). Read-only. Shows: email, role, joined date, for every user in `identity.users` for that tenant. No editing from the Owner side — role changes happen inside the tenant's own Workspace/Team screen. The Owner can see; only the tenant admin can change.

Backend: extend `GET /api/super-admin/tenants/[id]` to include the member list in its response.

---

## STEP 3 — BUILD (only after Step 2 is reviewed)

Build the five gaps in this exact order. Complete and test each before starting the next — they have dependencies (Gap 4 depends on Gap 3 existing; first-run flow depends on invite/send being clean).

**Order:**
1. Gap 3 (Owner enter workspace button) — smallest, unblocks Owner support capability, no dependencies
2. Gap 2 (Smart invite button) — unblocks clean survey delivery, needed before first pilot
3. Gap 1 (First-run setup sequence) — needs clean invite flow to exist first
4. Gap 4 (Team access / invite with role) — needs Gap 3 (owner can enter to verify) and Gap 1 (clean onboarding) to exist first
5. Gap 5 (Owner member visibility) — needs Gap 4's data to exist

**For each gap, after building:**
- `npm run lint` — must pass
- `npm test` — must pass including confidentiality severance tests (never skip these)
- `npm run build` — must pass
- Manual walkthrough of the full user journey for that gap end to end
- Update `FEATURE_SCREEN_REFERENCE.md` to reflect what changed

---

## GUARDRAILS

- Do not change the confidentiality architecture. Severed stores, RLS, k-threshold, token hashing — untouched.
- Do not add new colours outside the approved token system (`SAFERSAY_DESIGN_IMPLEMENTATION.md`).
- Do not build the auditor role UI — it is defined in permissions.ts and that is enough for now. Surface it only when a customer asks.
- Do not add employee-level survey targeting — every cycle still goes to all active employees.
- Do not add Stripe — billing remains a placeholder.
- The invite email (Gap 4) uses Resend. It goes through the participation store only — no response data is included in any email at any point.
- Audit log every role-changing action (invite sent, role assigned, member removed) to `identity.audit_logs` with actor, action, target — no PII of respondents, same rules as existing audit logging.

---

## WHAT DONE LOOKS LIKE

A single non-technical founder can:
1. Sign in for the first time and be guided to operational (people imported, survey created, invites sent) without hitting a dead end or a server error.
2. Send a survey and have it reach their team with one button press.

A founder with an HR manager can:
3. Invite that HR manager with the Survey Creator role so the manager can run surveys without seeing billing or changing settings.
4. Invite their CEO with the Viewer role so the CEO can read reports without being able to touch anything else.

The SaferSay owner (you) can:
5. Enter any tenant's workspace from the console to provide support.
6. See who has access to a tenant and with what role.

When all six of those are true, this sprint is done.
