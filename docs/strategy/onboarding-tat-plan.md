# Onboarding TAT (Time-to-Value) Instrumentation Plan

## Problem

TAT was raised as a priority but is currently **unmeasurable** — there is no event tracking anywhere in the codebase (no analytics package in `package.json`, no `track()`/`capture()` calls found). The pilot checklist in [`pilotStateService.ts`](../../src/lib/server/pilotStateService.ts) already models the exact funnel we need to instrument — it computes `done`/`nextStep` state on every read, but never records *when* a step first became done. This plan turns that existing step model into a real funnel without inventing a new taxonomy.

## The funnel to measure (reusing existing step keys)

`signup → employees → cycle → tokens → outbox → queue → responses → report`

Target TAT: first survey cycle live (`tokens` done) within 10 minutes of first sign-in for a self-serve SMB user, first response collected within 48 hours.

## What to build

1. **Event table** — new `identity.onboarding_events` (tenant_id, user_id, event_key, occurred_at). Minimal, additive, no schema risk to the severance model since it lives in `identity`, not `responses`.
2. **Emit on state transition, not on every check** — in `pilotStateService.getPilotState`, when a step's `done` flips `false → true` for the first time, write one event. Cheapest correct approach: compare against the latest recorded event per step key before inserting (idempotent, no duplicate events).
3. **`signup` event** — emit once from [`authSession.ts`](../../src/lib/server/authSession.ts)'s tenant-provisioning branch (`resolveUserRecord`, the "no existing user" path) — this is already the single choke point for first sign-in, so it's a 2-line addition, not a new surface.
4. **Minimal query, no new vendor required for v1** — TAT per tenant is just `min(occurred_at) filter (event_key='tokens') - min(occurred_at) filter (event_key='signup')`. Ship this as a query, not a dashboard, until volume justifies a real analytics tool (Amplitude/PostHog — deferred, not needed for a handful of pilot tenants).

## Non-goals for v1

- No client-side event tracking (page views, clicks) — only the 8 server-verifiable funnel events above. Client-side analytics is a separate, later investment once there's traffic to justify it.
- No cohort/dashboard tooling yet — a single SQL query against `identity.onboarding_events` is sufficient until there are enough tenants for cohort comparison to matter.

## Dependencies

- None blocking — this can ship independently of the grievance channel or billing work, and should land early since every other roadmap decision benefits from having real TAT data instead of guesses.
