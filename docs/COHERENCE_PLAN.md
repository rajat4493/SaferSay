# SaferSay — Coherence Plan

**Type:** Step 2 of the Coherence Directive. Built on `COHERENCE_REVIEW.md`'s findings. For each gap: exact screens, exact components/routes to create or modify, exact acceptance criteria.

**Gate before Step 3:** Per the directive, building does not start until this plan is reviewed and acknowledged. Nothing below has been implemented yet.

**One interpretive decision flagged up front, not buried:** Gap 4's UI describes three invite roles — Admin / Survey creator / **Viewer**. The codebase's actual role enum (`src/lib/server/repositories/types.ts`) is `customer_admin` / `survey_creator` / `auditor` / `employee` — there is no `viewer` value. `permissions.ts`'s `auditor` already implements exactly the access shape Gap 4 describes for "Viewer" (`canViewSurveyResults` true, `canAccessPeople`/`canAccessWorkspace` false). This plan maps the invite UI's "Viewer" label onto the existing `auditor` role value rather than adding a fifth role — reusing correct existing logic instead of fragmenting the permission model. This does **not** conflict with the guardrail "do not build the auditor role UI" — that guardrail is about not building the audit-log-viewing / security-proof-verification screens described in the original role-model spec; it says nothing about withholding the ability to *assign* the role, which Gap 4 explicitly requires. If this reading is wrong, say so before Step 3 — it's the one place this plan made a judgment call rather than following an unambiguous instruction.

---

## Gap 3 — Owner "Enter workspace" button

**Screens affected:** `/console/tenants/[id]` (entry point). `/app` and every `/app/*` screen (destination — no changes needed there, `ImpersonationBanner` already renders app-wide).

**Backend:** None. `POST /api/super-admin/switch` (`src/app/api/super-admin/switch/route.ts`) already accepts `{tenantId}` and does everything needed — validates the tenant, logs `logSuperAdminAccess`, sets the 8-hour `superAdminTenantCookieName` cookie. Confirmed zero changes required here.

**Components to modify:**
- `src/components/console/TenantDetailPanel.tsx` — add a button next to the existing `PlanBadge` in the header row: `.btn-secondary`, label **"Enter workspace →"**. On click: `POST /api/super-admin/switch {tenantId: tenant.id}`, then `router.push("/app"); router.refresh();` — the exact same two-call pattern `ImpersonationBanner.tsx`'s `returnToOwnWorkspace()` already uses for the reverse direction, so both halves of the flow behave identically.
- `src/components/ImpersonationBanner.tsx` — copy update only, no logic change. Current text (verified in review): `"Viewing {tenantName} as SaferSay Owner"` / button `"Return to my workspace"`. Proposed: keep the sentence, change the button label to **"Return to console"** (unambiguous about the destination — "my workspace" could be misread as the tenant's workspace from an impersonating Owner's point of view).

**Mechanic confirmed during this planning pass (relevant to acceptance criteria, not obvious from the directive alone):** `session.role` while impersonating stays the **Owner's own role** (`customer_admin`, from their own home-tenant user row) — it is never re-resolved against the target tenant. Combined with `tenant` being overridden to the target, this means an impersonating Owner sees the **full** three-zone nav (Surveys/People/Workspace) regardless of what roles exist inside that tenant — correct for a support use case, but worth stating explicitly since it's not visible from reading the directive alone. `isPlatformOwnerImpersonating()` (`tenant.id !== homeTenantId`) is what flips `ImpersonationBanner` on and `pureOwnerMode` off — already correct, no changes needed. `/api/report` already independently 403s report content for impersonating Owners regardless of this change — the "even the vendor can't read this" rule holds through the new button, not just around it.

**Acceptance criteria:**
- [ ] From any tenant's detail page, "Enter workspace →" lands the Owner on that tenant's `/app` Surveys home.
- [ ] `ImpersonationBanner` is visible immediately, names the correct tenant, "Return to console" returns the Owner to `/console` (their own home tenant context) in one click.
- [ ] Full Surveys/People/Workspace nav is visible and functional while impersonating.
- [ ] Attempting to view a report's actual score content (not just navigate to the Results screen) while impersonating still 403s — confirms this UI addition didn't accidentally weaken the existing server-side block.
- [ ] `identity.super_admin_access_log` gets a new row on entry (already implemented — just confirm it fires).

**Complexity:** Small (hours). **Dependencies:** none.

---

## Gap 2 — Send tab: one smart action, dev panel collapsed

**Screens affected:** `/app/[surveyId]/send` (primary). `/app/[surveyId]/results` (its own "Send reminders" button becomes a thin call into the same new endpoint, for consistency — see note below).

**New backend route:** `src/app/api/invites/send/route.ts` — `POST {cycleId, deliveryType: "invite"|"reminder"}`. Server-side, in one request: prepare (idempotent — a no-op if already prepared) → queue → send-now, reusing the exact `IdentityRepository` methods `/api/invites/outbox` and `/api/invites/queue` already call (`prepareInviteOutbox`/`prepareReminderOutbox`, `markOutboxQueued`, `getQueuedOutboxDeliveries`, `sendQueuedInviteDeliveries`, `markOutboxSent`/`markOutboxFailed`), then logs the audit event (`logInvitesSent` / `logRemindersSent`). Returns the same `{delivery:{sent,failed,errors}, summary}` shape the existing queue endpoint returns, so the UI's result-handling code doesn't need new branching.

**Why a new endpoint instead of chaining the two existing client-side calls the way the Results page's current "Send reminders" button does:** re-reading that button's implementation during this planning pass surfaced a real latent bug worth fixing while this code is being touched anyway — it fires the `outbox` prepare call and the `queue` send call unconditionally in sequence, without checking whether the first one actually succeeded. A single server-side endpoint removes that partial-failure window entirely (both steps run in the same request; if the first throws, the second never runs).

**Backend addition — participation counts, sourced from the identity store only:** Extend the existing `GET /api/cycles/[id]` response (`src/app/api/cycles/[id]/route.ts` already merges cycle + template + outbox data in one call) with a `participation: {issued, spent}` field, read from `identity.survey_participants` via `IdentityRepository`. The existing `getPilotIdentitySummary()` method already computes adjacent numbers (`issuedTokens`, `spentTokens`) for the Pilot Guide — reuse it (or extract a smaller shared helper if its "pilot"-specific framing doesn't fit cleanly being called from this screen too; a naming cleanup, not new logic). **This must never touch `responses.*`** — "how many haven't responded" is derived purely from token-spend status, never from a submission count, exactly matching the directive's explicit rule ("from the participation store only, never from the response store").

**State derivation (client-side, from `cycle.status` + `participation` + existing outbox `summary`):**

| Condition | Button shown |
|---|---|
| `cycle.status !== 'closed'` and `summary.sentInvites === 0` | **"Send invites to N people"** (`.btn-primary`), N = active employee count |
| `cycle.status !== 'closed'` and `sentInvites > 0` and `participation.issued > participation.spent` | **"Remind N people who haven't responded"** (`.btn-primary`), N = `issued - spent` |
| `cycle.status !== 'closed'` and `sentInvites > 0` and `participation.issued === participation.spent` | plain text: **"Everyone has responded"**, no button |
| `cycle.status === 'closed'` | plain text: **"Survey closed — no further sending"**, no button, overrides all of the above |

**Components to modify:**
- `src/components/InviteOutboxPanel.tsx` — restructured into two tiers. **Tier 1** (always visible): the one dynamic action above, calling `POST /api/invites/send`. **Tier 2**: the existing 7-button grid + row table, moved inside a collapsed `<details>`-style disclosure labeled **"Developer / test mode"**, closed by default. Nothing in Tier 2 is deleted or changed — same buttons, same behavior, same audience (engineering), just not the first thing a non-technical HR admin sees.
- `src/app/app/[surveyId]/send/page.tsx` — needs `cycle.status` and `participation`, both now available from the extended `GET /api/cycles/[id]` call.
- `src/app/app/[surveyId]/results/page.tsx` — its `sendReminders()` function simplifies to a single `POST /api/invites/send {cycleId, deliveryType:'reminder'}` call, replacing its current two-step sequence — fixes the same partial-failure gap noted above in the one other place it exists.

**Acceptance criteria:**
- [ ] A freshly-created survey's Send tab shows "Send invites to N people" as the only visible action (dev panel collapsed), N matching the active employee count.
- [ ] Clicking it sends real emails (or shows a clear "RESEND_API_KEY not configured" error, never a silent no-op) and the button's state updates without a manual page refresh.
- [ ] After some but not all respondents submit, the button becomes "Remind N people who haven't responded" with the correct count, sourced from a query that touches only `identity.*` tables (grep-verifiable, same pattern as the existing severance test).
- [ ] Once every respondent has submitted, no button — "Everyone has responded."
- [ ] Once closed, no button regardless of participation state — "Survey closed — no further sending."
- [ ] Expanding "Developer / test mode" still shows and runs all seven original buttons correctly.
- [ ] `npm run lint`, `npm test` (incl. severance suite), `npm run build` all pass.

**Complexity:** Medium (a day). **Dependencies:** none technically, but should land before Gap 1 so the guided first-run flow's Step 3 points at this new button rather than the old 7-button screen.

---

## Gap 1 — Guided first-run sequence

**Screens affected:** `/app` (Surveys home — hosts the guide). `/app/surveys/new` (gains a guard). `/app/[surveyId]/send` (destination of Step 3, unchanged itself).

**Schema change:** `db/migrations/0016_first_run_tracking.sql`:
```sql
alter table identity.tenant_settings
  add column if not exists first_run_completed_at timestamptz;
```
Safe with no upsert concerns — confirmed in review that `createTenant()` already inserts exactly one `identity.tenant_settings` row per tenant at creation time, so this column is guaranteed present for every tenant from day one.

**Backend:**
- `IdentityRepository.getFirstRunState(tenantId)` — returns `{completed: boolean, steps: [{key:'employees'|'survey'|'invites', done: boolean}]}`. Reuses the same underlying counts `getPilotState()` (`src/lib/server/pilotStateService.ts`) already computes (employee count, latest cycle existence, sent-invite count) — extract a shared internal helper both call rather than duplicating the three queries.
- `IdentityRepository.markFirstRunCompleted(tenantId)`.
- Extend `GET /api/tenants/current` to include `firstRunCompleted` in its response (avoids a second round trip on every Surveys-home load — that endpoint is already fetched there today).
- Completion trigger, server-side: inside `POST /api/invites/send` (Gap 2) — and, for parity, the existing `/api/invites/queue {sendNow:true}` path too, since the dev-mode panel can also trigger a real send — call `markFirstRunCompleted()` whenever `sent > 0` **and** the tenant hasn't completed first-run yet. Hooking this at the server layer (not the guide UI) means completion fires correctly even if someone bypasses the guide entirely and uses the dev panel, matching the directive's literal rule ("Completing Step 3 (invites queued/sent) marks first-run as done") regardless of path taken.

**New component:** `src/components/FirstRunGuide.tsx` — distinct from (and much lighter than) `PilotGuide`: shows **one step at a time**, not a full checklist. "Step N of 3" label, the current step's one-line instruction, one `.btn-primary` pointing at the right screen. On the final step's completion, replaced by a single plain confirmation line — **"You're set up — your first survey is live."** — no confetti, no modal, same `.card` styling as everything else on the page. Rendered at the top of `/app/page.tsx`, above the existing survey list, only while `!firstRunCompleted`; once true, this component is never fetched or rendered again for that tenant.

**Route guard:** `src/app/app/surveys/new/page.tsx` — add a check (employee count = 0 → `router.replace("/app/people")`) so this is a real URL-level guard, not just a hidden nav affordance — a determined user typing the URL directly still gets redirected, not a 400 after filling out the form. The Send-tab guard ("Step 3 unreachable until Step 2 complete") needs no new code — you structurally cannot reach `/app/[surveyId]/send` without a `surveyId`, which only exists once Create has already succeeded.

**Acceptance criteria:**
- [ ] Brand-new tenant, first login: Surveys home shows "Step 1 of 3" pointing at People.
- [ ] Typing `/app/surveys/new` directly into the URL bar with zero employees imported redirects to `/app/people` rather than rendering the form.
- [ ] After importing ≥1 employee, Surveys home shows "Step 2 of 3."
- [ ] Creating a survey advances to "Step 3 of 3," pointing at the new smart Send button.
- [ ] Sending invites — via the guide's pointed link **or** via the dev-mode panel directly — marks first-run complete server-side.
- [ ] Reloading Surveys home after completion never shows the guide again; confirmed from a different browser signed into the same account (proves server persistence, not `localStorage`).
- [ ] Closing the browser mid-setup (after Step 1, before Step 2) and returning shows Step 2, not Step 1 — state is derived from real data every load, not a client-side wizard position.
- [ ] `npm run lint`, `npm test`, `npm run build` pass.

**Complexity:** Medium (a day). **Dependencies:** cleanest built after Gap 2, so Step 3 of the guide points at the new one-button Send screen rather than the old seven-button one.

---

## Gap 4 — Team access: invite with role

**Screens affected:** new `/app/workspace/team` (primary). `AppShell.tsx` nav (adds the entry). `authSession.ts`'s sign-in resolution (backend-only, no screen, but this is the change that makes the whole gap real).

**Schema change:** `db/migrations/0017_team_invites.sql` — a new table rather than overloading `identity.users` (which has a `not null` `auth_provider`/`provider_subject` pair with a unique constraint on both — making those nullable to represent a not-yet-signed-in person would touch a table several other flows depend on, for no benefit over a dedicated table):
```sql
create table identity.pending_invites (
  id uuid primary key,
  tenant_id uuid not null references identity.tenants(id),
  email text not null,
  role text not null check (role in ('customer_admin','survey_creator','auditor')),
  invited_by_email text not null,
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  unique (tenant_id, email)
);
alter table identity.pending_invites enable row level security;
create policy tenant_isolation on identity.pending_invites
  using (tenant_id = current_setting('app.current_tenant_id', true)::uuid)
  with check (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
```
(`employee` excluded from the role check — employees never sign in, inviting one to a login account makes no sense in this model.)

**Backend:**
- `IdentityRepository`: `createPendingInvite(tenantId, email, role, invitedByEmail)`, `findPendingInviteByEmail(email)`, `listPendingInvites(tenantId)`, `deletePendingInvite(id)`, `listTenantMembers(tenantId)` (real `identity.users` rows: id/email/name/role/createdAt).
- **`resolveUserRecord()` (`src/lib/server/authSession.ts`) gains a third branch**, checked after the existing "already-linked user" and "existing user by email" checks, before falling through to brand-new-tenant creation:
  ```
  existing auth-subject match → return it (unchanged)
  existing user-by-email match → link + return it (unchanged)
  pending invite by email match → create the real identity.users row now,
    using the invite's tenant_id and role (not "customer_admin", not a new tenant),
    mark the invite accepted_at = now(), return the new user
  no match at all → create brand-new tenant as customer_admin (unchanged, existing behavior for a genuine first-ever signup)
  ```
  This is the exact fix for the sharper issue this review surfaced: a second real teammate now resolves into the *existing* tenant with the *invited* role, instead of silently spinning up a new empty one.
- `permissions.ts` — add `canManageTeam(role) = role === "customer_admin"` (a distinct, clearly-named check rather than overloading `canModifySettings` for a different purpose).
- New routes:
  - `POST /api/tenants/team/invite` `{email, role}` — `canManageTeam`-gated, creates the pending invite, sends a login-invite email via Resend (new template in `resendDelivery.ts` — a plain "you've been invited to {tenant} as {role}" message linking to `/login`, **not** the token-based respondent template; this is a real-account invite, a completely different mechanism from anonymous survey tokens, and must not touch `identity.invite_outbox` or `hashServerToken` at all — keeping these two invite concepts structurally separate, not just differently labeled). Logs an audit event: `team_invite_sent`, actor = inviter, safe detail = invited role only (never logs response/participation data — this is squarely an operator action about the system, the same category as every other existing audit event).
  - `GET /api/tenants/team` — combined list: real members (`listTenantMembers`) + pending invites (`listPendingInvites`), for the member table.
  - `POST /api/tenants/team/[id]/remove` — removes a pending invite outright, or removes a real member (confirm-gated client-side; hard-delete the `identity.users` row, consistent with there being no soft-delete convention anywhere else in this schema). Logs `team_member_removed`.

**New screen:** `src/app/app/workspace/team/page.tsx` + `src/components/TeamPanel.tsx`:
- Member table: Name / Email / Role (human label — "Admin (full access)" / "Survey creator (surveys + people)" / "Viewer (reports only)") / status (Active or Pending) / Remove action.
- "Invite teammate" — an inline form (not a modal, per the directive), not a button that opens something else: email field + role `<select>` (Admin/Survey creator/Viewer) + "Send invite" button.
- Below the table: the static, read-only access matrix exactly as specified in the directive (Surveys/People/Reports/Workspace × the three assignable roles) — informational only, no interaction.

**Nav:** `AppShell.tsx` — add "Team" as a fifth item under the existing WORKSPACE group (`/app/workspace/team`), no new gating needed beyond the zone's existing `canAccessWorkspace` check.

**Acceptance criteria:**
- [ ] A `customer_admin` invites `teammate@company.com` as Survey Creator → "Invite sent" toast → row appears in the table immediately as Pending.
- [ ] `teammate@company.com` signs in with Google for the first time → resolves into the **same** tenant as the inviter (not a new one) → lands on `/app` with Survey-Creator nav (Surveys + People, no Workspace).
- [ ] Inviting a "Viewer" → that person, once signed in, can open `/app/[id]/results` but is redirected away from `/app/people` and any `/app/workspace/*` URL typed directly.
- [ ] Removing a pending invite before acceptance means that email falls through to the ordinary brand-new-tenant path if they ever do sign in — explicit, not an error state.
- [ ] Audit log contains `team_invite_sent` / `team_member_removed` with role + actor only.
- [ ] New regression test: `resolveUserRecord`'s pending-invite branch never writes anything to `responses.*` — trivially true given the feature never touches that schema, but worth an explicit assertion given how central severance is to this codebase's existing test suite.
- [ ] `npm run lint`, `npm test`, `npm run build` pass.

**Complexity:** Large (multiple days — schema migration, new table, three new routes, an email template, a `resolveUserRecord` change that needs care given how central it is, plus the screen itself). **Dependencies:** benefits from Gap 3 existing first, so an Owner can enter the tenant and independently verify an invite landed correctly.

---

## Gap 5 — Owner-side member visibility

**Screens affected:** `/console/tenants/[id]` only.

**Backend:** Extend `TenantDetail` (`src/lib/server/repositories/types.ts`) with `members: Array<{email, role, joinedAt}>`. `IdentityRepository.getTenantDetail()` adds one query against `identity.users` for that tenant (accepted/real members only — pending invites aren't shown here, since the directive's ask is specifically "who has access," and an unaccepted invite doesn't have access yet; easy to add later if wanted, not required by the literal spec). `GET /api/super-admin/tenants/[id]` (`src/app/api/super-admin/tenants/[id]/route.ts`) already returns the full `TenantDetail` object, so no route change beyond the type/query extension.

**Component:** `TenantDetailPanel.tsx` — new read-only "Members" card, same visual pattern as the existing Metadata/Survey-activity cards: email / role / joined date rows. Explicitly no actions, no edit affordance, per the directive ("The Owner can see; only the tenant admin can change").

**Acceptance criteria:**
- [ ] Owner viewing any tenant's detail page sees every real member, their role, and join date.
- [ ] Nothing on the card is clickable or editable.
- [ ] `npm run lint`, `npm test`, `npm run build` pass.

**Complexity:** Small (hours, once Gap 4's data model exists). **Dependencies:** hard dependency on Gap 4 (`listTenantMembers` / the `identity.users.role` values it relies on).

---

## Build order (unchanged from the directive — independently re-derived in the review, converges on the same sequence)

1. Gap 3 — smallest, zero dependencies, unblocks Owner support capability immediately.
2. Gap 2 — needed before Gap 1 so the first-run guide points at the right screen.
3. Gap 1 — needs Gap 2's clean Send button to point at.
4. Gap 4 — needs Gap 3 (verify invites land correctly by entering the tenant) and benefits from Gap 1 existing (a newly-invited teammate gets the same first-run experience as a founder would).
5. Gap 5 — hard dependency on Gap 4's data.

**After each gap**, per the directive: `npm run lint`, `npm test` (confidentiality/severance suite never skipped), `npm run build`, a manual end-to-end walkthrough of that gap's specific journey, then update `FEATURE_SCREEN_REFERENCE.md` to reflect what changed before moving to the next gap.

---

**Step 2 complete.** Per the directive's explicit gate, no code will be written until this plan is reviewed and acknowledged. The one flagged decision (Gap 4's "Viewer" → `auditor` mapping) is the single point in this plan most worth confirming before Step 3 begins — everything else follows directly from source already re-verified in `COHERENCE_REVIEW.md`.
