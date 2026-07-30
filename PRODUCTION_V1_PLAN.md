# SaferSay Production V1 Plan

## Confirmed Decisions

- Product name: SaferSay
- Legal entity: MindscopeAI LLP
- Target stack: Vercel + Supabase EU Postgres + Auth.js + Stripe + Resend
- Development mode: local until production credentials and domain are ready
- Target domain later: safersay.com
- Brand/logo: keep current placeholder for now

## Priority Order

1. Security
2. Ease of use
3. Polish / jazzy feel

## Production Gates

Production mode must not go live until all required checks pass:

- Supabase EU Postgres configured
- Auth.js secret configured
- Google OAuth configured
- Microsoft OAuth configured
- strong token secret configured
- Stripe secret and webhook configured
- Resend API key and sender configured
- privacy contact configured

## Sprint 1 Status

Implemented locally:

- Severance-aware repository layer.
- Identity repository for tenants, employees, participant tokens, reminder targets.
- Response repository for cycles, submissions, protected reports.
- Confidential submission service that validates/spends identity token and writes answers through separated repositories.
- API route now uses Postgres repository path when `DATABASE_URL` exists.
- Severance verification script: `npm run verify:severance`.
- Migration tests for no forbidden response identity columns and no `responses -> identity` foreign keys.

Still required:

- Create Supabase EU project.
- Apply `db/migrations/0001_confidential_spine.sql`.
- Set `DATABASE_URL`.
- Run `npm run verify:severance` against Supabase.
- Add DB-backed integration tests using a test database.

## Safe Integration Principles

- Google/Microsoft: identity and optional directory import only; no survey answers.
- Stripe: billing metadata only; no employee list, no survey answers, no respondent tokens.
- Resend: email address and survey link only; no survey answers.
- Supabase/Postgres: severed identity and response schemas.
- Exports: generated from protected report layer only.

## First Production Use Case

A 10–60 person company can:

1. Create a tenant.
2. Log in.
3. Upload employees via CSV.
4. Pick a survey template.
5. Pay for one survey cycle.
6. Send email invites.
7. Collect token responses.
8. See only k>=5 protected reports.
9. Export safe CSV/PDF.
10. Cancel or leave without data hostage.

## Explicitly Not In V1

- AI summaries
- emotion or psychological inference
- benchmarks
- Slack/Teams deep integration
- credit system
- enterprise role matrix beyond minimal admin/viewer/billing roles
- complex manager hierarchy unless demanded by a paid pilot
