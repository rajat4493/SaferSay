# BUILD_PLAN.md — Confidential Employee Survey Platform

**Date:** 30 July 2026  
**Inputs:** `PROJECT_PLAN_confidential_survey.md`, `RESEARCH_FINDINGS.md`  
**Build principle:** The confidentiality spine is the product. Everything else is a narrow, polished path around it.

---

## 1. Product Definition

Build a self-serve confidential employee survey product for 10-60 person EU-operating companies. The v1 flow is:

1. Buyer signs in with Google or Microsoft.
2. Buyer imports/loads eligible employees.
3. Buyer selects a validated short template.
4. Buyer schedules or launches one survey cycle.
5. Respondents see a clear confidentiality screen, then answer one question per screen.
6. The product reports only threshold-safe aggregate results.
7. Buyer can export CSV/PDF and share a team-facing score/action note.
8. Buyer pays per cycle and optionally pays a low monthly floor for history retention.

Do not build v1.1/v2 features until the validation gate is reached.

---

## 2. Key Risk Flags Before Build

### 2.1 "Even by a database admin" needs stronger architecture

Separate Postgres schemas and RLS do not stop a database superuser. If the product must literally claim that a database admin cannot link identity to response content, v1 should use physically separate databases/projects and separate credentials/logging paths:

- Identity DB/project: membership, delivery, token issue state.
- Response DB/project: survey answers and spent-token hashes.
- Submission service boundary: receives raw token and answers, validates token without returning identity, writes response without identity, marks token spent without answer content.

If v1 uses one Postgres database with separate schemas, marketing copy must be narrower:

> Identity and answers are stored separately. Employer admins and product reporting paths cannot link a person to an answer.

Recommended decision: **Use separate schemas locally for speed, but design boundaries so they can be deployed as separate databases before public launch. Do not use the strongest marketing claim until physical separation and logging controls are implemented.**

### 2.2 Directory import may slow onboarding

SSO directory import often requires admin consent and provider-specific permissions. To preserve the 10-minute launch promise, include CSV paste/upload fallback in v1 even though Google/Microsoft SSO remains the primary path.

### 2.3 Open text is re-identification risk

Open text can identify a person by writing style or self-disclosed facts. In v1, allow at most one optional open-text question per template, suppress open-text reporting until cycle response count >= 5, and warn respondents not to include identifying details.

### 2.4 Onboarding surveys may be unusable for small cohorts

New-starter cohorts in 10-60 person companies will often be below k=5. The product should warn before launch when a template or segment cannot produce confidential reporting.

---

## 3. Architecture

### 3.1 Stack

- Frontend/app: Next.js 15
- Auth: Auth.js with Google and Microsoft providers
- Database: Postgres
- Payments: Stripe Checkout
- Email: Resend
- Reports/charts: Recharts or Tremor
- Hosting target: Vercel

### 3.2 Data Stores

Use two logical stores from the first migration:

**Store A: Identity/Participation**

- tenant
- membership
- survey eligibility
- invitations
- token issue/spend state
- reminder delivery state
- billing/account ownership

Knows who, never what.

**Store B: Responses**

- survey cycles
- templates/questions
- answer content
- coarse segment labels copied at submission time only if safe to store
- spent token hash for duplicate prevention only

Knows what, never who.

### 3.3 Service Boundaries

**Admin app**

- Manages tenant, employees, templates, cycle launch, schedule, reports.
- Can read Store A.
- Reads reports through thresholded Store B functions/views only.
- Cannot read raw response rows in production.

**Respondent app**

- Opens survey by token.
- Shows confidentiality screen.
- Submits answers.
- Never receives identity details.

**Submission path**

1. Validate raw token against Store A token hash.
2. Check eligibility and unspent state.
3. Insert answers into Store B with `spent_token_hash`, `cycle_id`, answer values, and allowed coarse segment labels.
4. Mark token spent in Store A using token proof only.
5. Do not store raw token, IP, user agent, or exact respondent identity in Store B.

**Reminder path**

1. Query Store A for unspent eligible tokens.
2. Send reminders through Resend.
3. Never inspect Store B responses.

### 3.4 Reporting Boundary

All reporting uses thresholded functions. No UI or export queries raw response tables.

Rules:

- Default `min_group_size = 5`.
- Every chart cell must return either aggregate values or `protected`.
- Filters that reduce result count below 5 are disabled or return protected state.
- Segment comparisons suppress any segment with fewer than 5 responses.
- Open text hidden unless the relevant population has at least 5 responses.
- Exports reuse the same thresholded report layer.

---

## 4. Proposed Schema

Names are initial and can be adapted to the existing codebase after inspection.

### 4.1 `identity` schema

`identity.tenants`

- `id uuid primary key`
- `name text not null`
- `logo_url text`
- `created_at timestamptz not null default now()`

`identity.users`

- `id uuid primary key`
- `tenant_id uuid not null`
- `auth_provider text not null`
- `provider_subject text not null`
- `email text not null`
- `name text`
- `role text not null check (role in ('owner','admin','employee'))`
- `created_at timestamptz not null default now()`
- Unique `(auth_provider, provider_subject)`

`identity.employees`

- `id uuid primary key`
- `tenant_id uuid not null`
- `email text not null`
- `name text`
- `team text`
- `location text`
- `employment_status text not null default 'active'`
- `created_at timestamptz not null default now()`
- Unique `(tenant_id, email)`

`identity.survey_participants`

- `id uuid primary key`
- `tenant_id uuid not null`
- `cycle_id uuid not null`
- `employee_id uuid not null`
- `token_hash text not null unique`
- `token_status text not null check (token_status in ('issued','spent','revoked'))`
- `issued_at timestamptz not null`
- `spent_at timestamptz`
- `last_reminded_at timestamptz`
- `reminder_count int not null default 0`

No answer fields allowed.

### 4.2 `responses` schema

`responses.survey_templates`

- `id uuid primary key`
- `slug text unique not null`
- `name text not null`
- `description text not null`
- `category text not null`
- `estimated_minutes int not null`
- `is_active boolean not null default true`

`responses.template_questions`

- `id uuid primary key`
- `template_id uuid not null`
- `position int not null`
- `question_text text not null`
- `question_type text not null check (question_type in ('likert_5','enps_0_10','open_text'))`
- `construct text`
- `is_optional boolean not null default false`

`responses.survey_cycles`

- `id uuid primary key`
- `tenant_id uuid not null`
- `template_id uuid not null`
- `name text not null`
- `status text not null check (status in ('draft','scheduled','open','closed'))`
- `opens_at timestamptz`
- `closes_at timestamptz`
- `min_group_size int not null default 5`
- `created_at timestamptz not null default now()`

`responses.submissions`

- `id uuid primary key`
- `tenant_id uuid not null`
- `cycle_id uuid not null`
- `spent_token_hash text not null unique`
- `submitted_at_bucket date not null`
- `segment_team text`
- `segment_location text`
- `created_at timestamptz not null default now()`

Forbidden in `responses.submissions`: `user_id`, `employee_id`, `email`, `name`, `provider_subject`, `ip_address`, `user_agent`, exact `submitted_at`.

`responses.answers`

- `id uuid primary key`
- `submission_id uuid not null`
- `question_id uuid not null`
- `number_value numeric`
- `text_value text`
- `created_at timestamptz not null default now()`

### 4.3 Reporting Functions

`responses.report_question_scores(cycle_id, segment_key default null, min_n default 5)`

- Returns question-level average, distribution, response count, and protected flag.
- Suppresses rows where `n < min_n`.

`responses.report_enps(cycle_id, segment_key default null, min_n default 5)`

- Returns eNPS, promoter/passive/detractor percentages, protected flag.

`responses.report_open_text(cycle_id, question_id, min_n default 5)`

- Returns text answers only if count >= min_n.

---

## 5. Phase Plan

## Phase 1 — Severed Data Spine + Min-5 Enforcement

### Tasks

- Set up project framework and database connection.
- Create `identity` and `responses` schemas.
- Add RLS and least-privilege database roles where supported locally.
- Add migrations for Store A and Store B.
- Implement token issue, validate, submit, and mark-spent flow.
- Implement thresholded report functions.
- Add tests proving:
  - response tables have no forbidden identity columns.
  - no declared FK joins `responses` to `identity`.
  - duplicate token submission is rejected.
  - reminders can identify non-submitters without reading answers.
  - report cells below k=5 are protected.
  - exports use protected report outputs.

### Acceptance Criteria

- A seeded cycle can issue tokens to 6 employees.
- 5+ submissions render aggregates.
- 1-4 submissions render protected state.
- No application query joins person identity to answer content.
- Test suite fails if forbidden response columns or cross-store FKs are added.

---

## Phase 2 — Single-Cycle Flow + Respondent Experience + Report

### Tasks

- Create buyer dashboard for one survey cycle.
- Seed v1 templates:
  - 5-Minute Engagement Check
  - eNPS Pulse
  - Team Health Pulse
  - New Starter Check-In
- Build template selection and survey preview.
- Build mobile-first respondent flow:
  - confidentiality screen
  - one-question-per-screen
  - progress bar
  - submitted state
- Build board-ready report:
  - headline participation
  - score cards
  - distribution charts
  - segment protection states
  - one-click action loop draft

### Acceptance Criteria

- A user can create a survey cycle from a template in one click after setup.
- A respondent can complete the survey on mobile in under 5 minutes.
- Reports look polished and never show sub-5 cells.
- Report copy avoids "anonymous" unless referring to aggregate anonymised outputs.

---

## Phase 3 — SSO Onboarding + Directory Import

### Tasks

- Add Auth.js Google and Microsoft providers.
- Add tenant creation after first sign-in.
- Add Google/Microsoft directory import if permissions allow.
- Add CSV paste/upload fallback.
- Add employee review screen.

### Acceptance Criteria

- Buyer can sign up and load employees without manual database work.
- If directory permissions fail, CSV fallback gets them unstuck.
- Imported demographics are limited to v1-safe fields.

---

## Phase 4 — Scheduling, Reminders, Export

### Tasks

- Add open/close scheduling.
- Add background jobs or cron-compatible route for status transitions.
- Add Resend email sending for invitations and reminders.
- Add reminder targeting from Store A only.
- Add CSV and PDF export from thresholded reporting layer.

### Acceptance Criteria

- Survey opens and closes automatically.
- Reminder job can send only to non-submitters without response access.
- CSV/PDF exports do not leak protected small-group data.

---

## Phase 5 — Stripe Flat Per-Cycle + Data Floor

### Tasks

- Add Stripe Checkout for per-cycle payment.
- Add first-cycle-free or report-preview gate.
- Add floor plan for history retention.
- Add cancellation screen with one-click cancel.
- Add billing status checks around report/history access.

### Acceptance Criteria

- Buyer can pay for a survey cycle.
- Buyer can cancel floor plan without hidden renewal friction.
- Historical comparison is available only when floor plan is active.
- Current-cycle exports remain available according to product promise.

---

## STOP — Validation Gate

Do not add v1.1 features until 10 ICP companies have completed live tests or buyer interviews.

Validation questions:

- Can a 30-person company launch unaided in under 10 minutes?
- Do respondents believe the employer cannot see their answers after reading the confidentiality screen?
- Do at least 6 of 10 ICP buyers prefer ~£200/cycle over free forms/no survey?
- Do returning buyers keep paying the floor plan between cycles?

---

## 6. v1 Copy Rules

Use:

- confidential
- identity and answers are stored separately
- employer-visible reports are grouped
- groups smaller than 5 are hidden
- data export is included
- no annual lock-in

Avoid:

- 100% anonymous
- impossible for anyone under all circumstances
- emotion, mood, stress, burnout, psychological state, deception, personality inference
- benchmark claims before data exists

---

## 7. Initial Implementation Order

1. Inspect existing repository state.
2. Choose app scaffold only if no app exists.
3. Add database/migration tooling.
4. Implement Phase 1 spine and tests.
5. Run tests.
6. Only then build UI.

