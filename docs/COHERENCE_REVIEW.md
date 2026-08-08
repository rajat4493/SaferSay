# SaferSay — Coherence Review

**Type:** Step 1 of the Coherence Directive. Independent, source-verified read of the product as it exists today — not as it's intended to exist. Every claim below is traced to a specific file, and re-verified directly against source in this pass (not carried over from memory of prior sessions).

**Sources read for this review:** `FEATURE_SCREEN_REFERENCE.md`, `src/lib/permissions.ts`, `src/components/InviteOutboxPanel.tsx`, `src/app/app/page.tsx`, `src/app/api/super-admin/switch/route.ts`, `src/app/console/tenants/[id]/page.tsx` + `src/components/console/TenantDetailPanel.tsx`, all four `src/app/app/workspace/*` screens, `src/lib/server/authSession.ts` (`resolveUserRecord`), `src/lib/server/surveyCycleService.ts`, `db/migrations/0001_confidential_spine.sql` + `0002_tenant_bootstrap.sql`, `src/components/ImpersonationBanner.tsx`, `src/components/PilotGuide.tsx` / `src/lib/server/pilotStateService.ts`.

---

## Section A — What works end to end (verified)

Journeys traced start-to-finish through actual source, not assumed:

1. **First sign-in → workspace created.** `resolveUserRecord()` (`src/lib/server/authSession.ts:122-156`): no existing auth-subject match, no existing email match → auto-creates a tenant + a `customer_admin` user, no separate signup screen exists or is needed. Works for both real OAuth (Google/Microsoft via Supabase) and the non-production dev-login bypass.
2. **Import employees.** `/app/people` → `EmployeeCsvImport` → `POST /api/employees/import` → `IdentityRepository.importEmployees()`. CSV validated client-side first (`src/lib/csvEmployees.ts`) and re-validated server-side. Directory (`EmployeeDirectory`) reflects new rows immediately via a refresh-key callback. Complete, no dead ends.
3. **Create and send a survey — *given employees already exist*.** `/app/surveys/new` → pick template → `CreateSurveyCycle` → `POST /api/cycles/create` → `createTenantSurveyCycle()` issues one token per active employee and prepares outbox rows in the same call → redirects to `/app/{id}/send`. On that screen: Prepare invites → Queue invites → Send test invites (requires `RESEND_API_KEY`; without it, `sendQueuedInviteDeliveries()` returns a clean `0 sent / N failed` with an explicit "RESEND_API_KEY is not configured" error, not a silent failure) → real respondent link produced (`respondentPath` on each outbox row). Every step of this chain was exercised live against the real database during the prior session's design-directive verification pass, including a full 8-question submission.
4. **Survey Taker, start to finish.** `/s/[token]` → session load → confidentiality screen → all question types (Likert-5 with A–E keyboard select, eNPS-0-10 mouse-only, open-text with optional-skip) → submit → done screen. Exactly two network calls total (`GET` session, `POST` submit). Verified live, not just read.
5. **Results, once unlocked.** `/app/[id]/results` correctly gates on `n >= min_group_size` before calling `report_question_scores()`; "Commit to one change" round-trips through `identity.cycle_actions`; Close survey works and is idempotent (`closeCycle()` only updates rows where `status <> 'closed'`).
6. **Owner platform views.** Every `/console/*` read screen (Overview, Tenants list, Usage & Health, Plans & Features, Support & Alerts, Settings) resolves to a real, working `IdentityRepository` query — none of these are stubs. Tenant Detail's plan/feature/threshold edits (`PATCH /api/super-admin/tenants/[id]`) apply immediately and correctly.
7. **Owner creates a tenant shell.** "Create tenant" on `/console/tenants` → `POST /api/super-admin/tenants` → real row. Note: this produces a tenant with **zero users** — nobody can sign into it, because nothing creates a matching `identity.users` row. Not itself one of the five gaps below, but the exact same missing mechanism (pre-seeding a user row for someone who hasn't signed in yet) is what Gap 4 needs to solve, so it's worth having in view.

**Everything in this section is real and traceable — no part of the "happy path" is fake or hardcoded demo data**, once its precondition (usually: employees already imported) is met.

---

## Section B — What is broken or incomplete (verified)

### B1. New tenant → first survey attempt → hard server error (P0)

- **User tries to:** Sign in for the first time, click "New survey" from the empty Surveys home (`src/app/app/page.tsx` — the empty state's only affordance is a black "+ New survey" pill, unconditional, no employee-count check).
- **Where they get stuck:** They get *surprisingly far* before failing — the template picker and question editor on `/app/surveys/new` are pure static/client-side data, so all of that renders and works fine regardless of employee count. The failure only happens on clicking **Create**: `POST /api/cycles/create` → `createTenantSurveyCycle()` (`src/lib/server/surveyCycleService.ts:25-26`) throws literally `"Upload employees before creating a survey cycle."` The route catches it and returns `{ok:false, error}` at 400; `CreateSurveyCycle.tsx` shows it as both an inline red-ish status line and a toast. So the failure mode is: invest two steps of effort, then get a raw exception message with no link back to People.
- **What exists but isn't reachable:** `PilotGuide` (`/app/pilot`, `src/components/PilotGuide.tsx` + `src/lib/server/pilotStateService.ts`) already computes real step-completion from real data (employees > 0, cycle exists, tokens issued, etc.) and would tell a user exactly this. But it's an **opt-in page reached by a small "First-run guide" topbar link** — not shown automatically, not gating anything, easy to never notice.
- **Severity: P0.** Every single new tenant hits this exact wall unless they happen to discover the Pilot Guide link first.

### B2. Send tab exposes internal pipeline mechanics as the primary UI (my rating: P1; directive frames it as P0-equivalent for the target persona)

- **User tries to:** Send their survey to their team.
- **Where they get stuck:** Not literally stuck — I re-read `InviteOutboxPanel.tsx` in full again for this review and confirm all seven buttons work correctly and in the right order (Prepare → Queue → Send, ×2 for invites/reminders, plus Refresh). Nothing is broken. The problem is conceptual: the screen asks a non-technical HR user to understand and correctly sequence a three-stage delivery pipeline (prepare/queue/send) across two delivery types, when the actual decision they have is one of: "send now" or "remind the people who haven't answered." There is no state-aware guidance — a user who clicks "Send test invites" without first clicking "Prepare invites" and "Queue invites" gets 0 sent, 0 failed, no rows, and no explanation of why, because `sendQueuedInviteDeliveries()` only ever operates on rows already in `queued` status.
- **My independent severity call:** this doesn't block a technical or determined user (I completed it correctly on the first attempt during verification), so it isn't P0 in the strict "hard-blocked" sense the way B1 is. But for the actual target persona (non-technical HR, per the product's own positioning), getting a silent 0/0 result on the wrong button order is very likely to read as "broken" rather than "wrong order," which is functionally a P0 for adoption even though it's a P1 by strict blocking-severity. I'm flagging both readings rather than picking one, since they lead to different urgency judgments.

### B3. Owner cannot enter a tenant workspace (P0 — confirmed exactly as the directive states)

- Re-read `src/app/api/super-admin/switch/route.ts` in full: `POST` with `{tenantId}` validates the tenant exists, calls `logSuperAdminAccess()`, and sets an 8-hour httpOnly cookie (`superAdminTenantCookieName`) — this is a complete, correct implementation.
- Re-read `TenantDetailPanel.tsx` and its wrapping `src/app/console/tenants/[id]/page.tsx` in full: **confirmed zero buttons, links, or fetch calls reference `/api/super-admin/switch` anywhere in either file.**
- Re-read `ImpersonationBanner.tsx` (the only caller of that endpoint anywhere in the codebase): it calls the endpoint with an **empty body** (`JSON.stringify({})`) — per the route's own logic, an empty/omitted `tenantId` *clears* impersonation rather than starting it. So the only wired-up caller of this endpoint is the exit path, not an entry path.
- **Current banner copy, exactly as rendered today** (differs slightly from what the directive assumes — worth correcting before Step 2, not silently matching it): `"Viewing {tenantName} as SaferSay Owner"` with a button reading `"Return to my workspace"`. The directive's suggested copy is `"You're viewing [Tenant Name]'s workspace — Return to console"`. Neither is wrong, but they're not currently the same string, and Step 2 should pick one deliberately rather than assume the current one already matches.
- **Severity: P0**, confirmed. The backend is complete and correct; the entire gap is a single missing button.

### B4. No teammate/role UI — and the failure mode is sharper than "missing feature" (P1, but worth restating precisely)

- Re-read `resolveUserRecord()` (`src/lib/server/authSession.ts:122-156`) line by line for this review. The relevant branch: `findUserByEmail(email)` — this only returns a match if an `identity.users` row **already exists** for that email. Nothing anywhere in the current codebase creates such a row ahead of a person's first sign-in (no invite table, no pending-user insert path). So `findUserByEmail` will return `null` for every second person at a company, unconditionally, today.
- **The precise, verified consequence:** it's not that a second teammate is blocked or denied — **they succeed**, silently, into their *own separate, empty tenant*, as `customer_admin` of a workspace nobody intended to create. No error, no "this email looks like it might belong to an existing company" prompt, nothing. This is a sharper and more surprising failure than "no invite flow exists" — it's an unintended default outcome that a founder could hit by accident just by having a cofounder sign in normally.
- Confirmed via schema (`db/migrations/0001_confidential_spine.sql:11-21`): `identity.users.auth_provider` and `.provider_subject` are both `not null` with a `unique(auth_provider, provider_subject)` constraint — so representing a "pending invite, no OAuth identity yet" row in the current schema isn't just a missing feature, it requires a schema change (nullable columns or sentinel values) to even be representable. Relevant for Step 2's complexity estimate.
- Confirmed via `src/app/app/workspace/*` (all four files re-read for this review: settings, billing, security, go-live): **no team/member management UI exists in Workspace at all**, matching the directive's claim exactly.
- **Severity: P1** — doesn't block a single-person pilot (the primary near-term use case per the existing product docs), but blocks any second real person from ever correctly joining an existing workspace.

### B5. Owner has no per-tenant member visibility (P1, confirmed)

- `TenantDetailPanel.tsx`, re-read in full: Metadata / Survey activity / Plan & features / Billing cards, plus Support notes. No member list, no email/role table anywhere on the page.
- `GET /api/super-admin/tenants/[id]` (`src/app/api/super-admin/tenants/[id]/route.ts`) returns `IdentityRepository.getTenantDetail()`'s shape, which has no user/member field in its `TenantDetail` type (`src/lib/server/repositories/types.ts`) today.
- **Severity: P1**, confirmed exactly as stated. Small in isolation, but has no data to show until B4 exists.

---

## Section C — What is disorienting (UX gaps)

Rated independently against "does the product tell the user where they are / what happened / what's next":

1. **Empty Surveys home gives no reason the create flow will fail** (P0) — directly upstream of B1. The empty state's copy ("No surveys yet. Create your first survey to get started.") actively invites the exact click sequence that leads to the hard error.
2. **Send tab's "0 sent, 0 failed" outcome on an out-of-order click gives no explanation** (P1) — directly the interaction-level symptom of B2. A result of zero-and-zero reads as "nothing happened," not "you need to prepare and queue first."
3. **A second teammate signing in gets no signal they've landed somewhere new/wrong** (P1) — the interaction-level symptom of B4. They land on an empty Surveys home identical in every way to a legitimate first-ever signup, with nothing distinguishing "you just created a new company" from "welcome back."
4. **PilotGuide exists but nothing points a brand-new user to it** (P2) — it's a real, working answer to B1/C1, just undiscoverable. Worth noting as the cheapest possible partial mitigation if Gap 1's full build is deprioritized relative to the others.
5. **Impersonation banner copy inconsistency** (P2, cosmetic) — see B3's copy note. Not disorienting on its own, just worth deciding deliberately rather than by accident once Gap 3 adds the entry button.

---

## Section D — Role and access gaps (specific)

Cross-checked directly against `src/lib/permissions.ts` (re-read in full for this review) and every gating layout (`src/app/app/people/layout.tsx`, `src/app/app/workspace/layout.tsx`, `src/app/console/layout.tsx`).

| Role | Can reach today | Should reach per `permissions.ts` but can't | Missing UI to assign/manage it |
|---|---|---|---|
| `customer_admin` | Everything — Surveys, People, Workspace, all of `/app`. This is the *only* role any real user can ever be assigned today. | N/A — full access is correct and complete. | N/A |
| `survey_creator` | **Nothing distinct** — no code path ever assigns this role to a real user. `canAccessPeople()`/`canCreateSurvey()`/`canRunSurvey()` all correctly return `true` for it in `permissions.ts`, and `AppShell.tsx`'s nav-filtering would correctly hide Workspace for it — the *logic* is complete and would work today if a user ever had this role. | Everything the spec describes (Surveys + People, no Workspace) — because no user can ever be assigned it. | No invite flow, no role-change UI anywhere. This is exactly Gap 4. |
| `auditor` | Nothing. `getVisibleNavZones("auditor")` (`permissions.ts:73-76`) explicitly returns `[]` — the nav-hiding logic itself has never been extended to show this role anything, even in principle. | Per `permissions.ts`'s own doc comment: view-only Surveys results, read-only Workspace/security-proof access, audit-log access (`canAccessAuditLog`, `canAccessSecurityProof` both already correctly implemented). | No invite flow (same as `survey_creator`) **and** no screens exist to view even if a user had the role — this is a strictly larger gap than `survey_creator`'s. Explicitly out of scope per this directive's guardrails ("Do not build the auditor role UI... surface it only when a customer asks") — noting the gap for completeness, not proposing to close it. |
| `employee` | Token-link only, `/s/[token]`, never signs in, never has an `identity.users` row at all. | Nothing — this is correct and complete as designed; employees are respondents, not accounts. | N/A |

**One structural note relevant to Gap 4's design:** `survey_creator`'s permission *logic* is already fully correct and unit-testable today — the entire gap is "no code path ever sets `role = 'survey_creator'` on a real row." This means Gap 4's backend work is narrower than it might first appear: it's an invite/assignment mechanism, not a permissions rewrite.

---

## Section E — Proposed fix list

Independent prioritization, cross-referenced against the directive's own five gaps (all five are legitimate and correctly scoped against what I verified above — I'm not proposing to add or remove any of them, just stating my own severity read alongside the directive's where they differ, per B2 above):

| # | What to build | Why (which gap it closes) | Complexity | Dependencies |
|---|---|---|---|---|
| 1 | Owner "Enter workspace" button on Tenant Detail | B3 — backend is 100% done, this is the single smallest fix on the list | **Small** (hours) | None |
| 2 | Smart single-action Send button, dev-mode panel collapsed behind it | B2/C2 — replaces 7-button pipeline exposure with 1 state-aware action | **Medium** (a day) | None technically, but should land before Gap 1's first-run flow references the Send step |
| 3 | Guided first-run sequence (People → Survey → Send), server-persisted completion | B1/C1 — the single highest-impact fix; every new tenant hits this today | **Medium** (a day) | Cleanest if built after #2, so the guided Step 3 points at the new smart button, not the old 7-button screen |
| 4 | Team invite-with-role (Workspace/Team screen + backend + schema change for a "pending invite" user state) | B4/D — closes the sharper-than-stated silent-new-tenant issue found in this review | **Large** (multiple days — includes a schema migration to make `auth_provider`/`provider_subject` nullable or otherwise representable pre-signup, plus email delivery, plus `resolveUserRecord()` changes) | Benefits from #1 existing first (so an Owner can verify an invite lands correctly by entering the tenant) |
| 5 | Owner-side read-only member list on Tenant Detail | B5 — small addition, but literally has no data to show until #4 exists | **Small** (hours) once #4's data model exists | Hard dependency on #4 |

This matches the directive's own proposed build order (§Step 3) exactly — I re-derived it independently from the severity/dependency evidence above rather than copying it, and it converges on the same sequence, which I take as a good sign the ordering is sound rather than arbitrary.

---

**Step 1 complete.** Per the directive's gate ("Do not start Step 2 until `COHERENCE_REVIEW.md` is written and committed"), this document will be committed next, and `COHERENCE_PLAN.md` (Step 2) follows in the same pass. Per the directive's separate, explicit gate on Step 3 ("Do NOT start building until Step 2 is complete **and acknowledged**"), no code will be written until you've reviewed the plan.
