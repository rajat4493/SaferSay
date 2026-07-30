# SaferSay MVP Delivery Report

**Audience:** Senior Solution Architect, Product Owner  
**Date:** 30 July 2026  
**Status:** Local clickable MVP plus first server-side API slice. Not production SaaS yet because Postgres, Stripe, and Resend are not connected with real credentials in this workspace.

---

## 1. Executive Summary

SaferSay is being built as a confidential employee survey product for SMEs and startups, with the north star:

- **Easy to start:** HR can launch from templates with sensible defaults.
- **Easy to understand:** respondents and viewers see plain confidentiality rules.
- **Easy to leave:** exports and cancellation are visible; no data hostage pattern.

The current build now has three separate product surfaces:

1. **Admin Builder:** HR/admin creates and manages surveys.
2. **Survey Taker:** employee-facing token survey flow.
3. **Viewer Portal:** manager/HRBP/executive threshold-safe reporting view.

The app also includes a central **Brand Studio** for client rebranding and theming.

---

## 2. What Is Done

### Product Structure

- Public landing page.
- Login page.
- Admin app shell.
- Viewer/manager portal shell.
- Employee survey-taker route.
- Shared branding and theme system.
- Shared local data store.
- Server API routes for cycle seeding, payment, launch, invites, reminders, respondent submit, and protected report.

### Admin Features

- Dashboard with persistent demo survey cycle.
- Load sample employee list.
- Generate participant tokens.
- Set survey window.
- Launch survey.
- Close survey.
- Reset stored demo data.
- Copy respondent link.
- Export CSV.
- View protected report state.
- View report unlocked after minimum response threshold.

### Template Features

- Template library page.
- Template detail page.
- New survey page with template selection and question preview.
- Implemented templates:
  - Engagement Check
  - eNPS Pulse
  - Team Health
  - Onboarding Check-In

### Survey Taker Features

- Dedicated `/s/[token]` route.
- Validates token from local participation store.
- Shows confidentiality screen before Q1.
- One-question-at-a-time survey flow.
- Progress bar.
- Back button.
- Likert answer buttons.
- Submit confirmation.
- Token is spent after submission.

### Viewer Features

- Dedicated viewer portal.
- Leadership overview.
- Organisation view.
- Team/manager view.
- Comments view.
- Actions view.
- Viewer views do not expose the participation store.
- Viewer report applies minimum group-size protection.

### Confidentiality Features

- Separate local data namespaces:
  - `identity.employees`
  - `identity.participants`
  - `responses.cycles`
  - `responses.submissions`
  - `responses.answers`
- Report layer applies k >= 5 suppression.
- Local tests cover:
  - no identity fields in response records
  - duplicate token rejection
  - reminder targeting from participation state
  - protected report below threshold
  - report visible at threshold
- Server-side tests cover:
  - server-issued token targets
  - paid cycle launch
  - token spend
  - duplicate submission rejection
  - protected server report below threshold
  - server aggregate report at threshold

### Brand / Rebranding Features

- Brand Studio at `/app/brand`.
- Client/product name editing.
- Tagline editing.
- Logo upload.
- Font selection.
- Preset themes:
  - Violet
  - Slate
  - Coral
  - Graphite
- Manual color editing.
- Live preview.
- Reset to SaferSay defaults.
- Theme persists locally and updates the app via CSS variables.

### Integrations Surface

- Integrations page at `/app/integrations`.
- Integration cards for:
  - Google Workspace
  - Microsoft 365 / Entra ID
  - Resend
  - Stripe
  - CSV / PDF export
  - Power BI / Slides

### Server API Slice

- `POST /api/cycles/seed`
- `POST /api/cycles/pay`
- `POST /api/cycles/launch`
- `POST /api/emails/invites`
- `POST /api/emails/reminders`
- `POST /api/respondent/submit`
- `GET /api/report`

The Billing and Integrations pages include a server-side validation panel that can exercise these routes. Stripe and Resend run in mock mode when API keys are absent.

### Severed Persistence Sprint 1 Additions

- Added Postgres connection wrapper.
- Added severance-aware repositories:
  - `IdentityRepository`
  - `ResponseRepository`
- Added confidential submission orchestration that validates/spends tokens through identity store and writes answers through response store.
- `/api/respondent/submit` and `/api/report` now use the Postgres repository path when `DATABASE_URL` is configured.
- Added `npm run verify:severance` to check a real Postgres database for:
  - forbidden identity columns in `responses`
  - foreign keys from `responses` to `identity`
- Added migration-level tests for response schema guardrails.

---

## 3. What Is Pending

### Highest Priority

1. **Real role/access management**
   - Assign roles inside SaferSay.
   - Configure viewer scopes.
   - Preview what a user can see.
   - Do not rely only on AD/SSO.

2. **Organisation hierarchy**
   - Departments.
   - Locations.
   - Teams.
   - Managers.
   - Roll-up rules for small groups.

3. **Real database persistence**
   - Postgres schemas or separate databases.
   - Server-side token issue/spend.
   - Production-grade severed store architecture.

4. **Real authentication**
   - Google SSO.
   - Microsoft SSO.
   - Tenant provisioning.

5. **CSV import**
   - Upload parser.
   - Mapping/review screen.
   - Role and hierarchy import.

6. **Email delivery**
   - Invitations.
   - Reminders.
   - Reminder targeting from participation store only.

### Medium Priority

7. Stripe checkout and billing lifecycle.
8. PDF export.
9. Survey builder editing/reordering.
10. Audit logs.
11. Retention/deletion policy controls.
12. Viewer role enforcement.
13. Open-text stricter controls.
14. Production deployment.

---

## 4. Screen / Route Export

### Public Surface

| Route | Screen | Audience | Current Purpose |
|---|---|---|---|
| `/` | Landing page | Buyer / public visitor | Product positioning, north-star promise, entry to login/admin/brand customization. |
| `/login` | Login | Admin / buyer | Placeholder Google/Microsoft login entry into app. |

### Admin Builder Surface

| Route | Screen | Audience | Current Purpose |
|---|---|---|---|
| `/app` | Dashboard | HR admin / People owner | Persistent survey cycle demo: load people, set window, launch, submit samples, export, close cycle. |
| `/app/templates` | Template library | HR admin | Browse validated templates. |
| `/app/templates/[slug]` | Template detail | HR admin | Preview template description, constructs, question types, and questions. |
| `/app/surveys/new` | New survey | HR admin | Select template and run launch workflow. |
| `/app/participants` | Participants | HR coordinator | View identity/participation store: employees, issued tokens, submitted tokens. No answers. |
| `/app/reports` | Reports | People analyst / HR admin | View threshold-protected report from response store. |
| `/app/security` | Security & Confidentiality | HR admin / DPO / solution architect | Explain identity store, response store, min-5, no emotion inference. |
| `/app/billing` | Billing | Billing owner / buyer | Flat per-cycle and floor-plan positioning, cancellation placeholder. |
| `/app/integrations` | Integrations | Admin / IT | SSO, directory, email, payments, exports, reporting integrations. |
| `/app/brand` | Brand Studio | Brand admin / implementation owner | Customize instance logo, name, font, theme, and colors. |

### Survey Taker Surface

| Route | Screen | Audience | Current Purpose |
|---|---|---|---|
| `/s/[token]` | Token survey | Employee/respondent | Validate token, show confidentiality, run one-question-at-a-time survey, submit answers, spend token. |

### Viewer Surface

| Route | Screen | Audience | Current Purpose |
|---|---|---|---|
| `/viewer` | Leadership overview | Exec / HRBP / People leader | Threshold-safe aggregate overview. |
| `/viewer/org` | Organisation view | Exec / HRBP | Org-level reporting placeholder and segment roll-up messaging. |
| `/viewer/team` | My team | Manager | Manager view with sub-threshold protection messaging. |
| `/viewer/comments` | Comments | Viewer with permission | Open-text guarded area. |
| `/viewer/actions` | Actions | Manager / HRBP / exec | Close-the-loop action commitment. |

---

## 5. Architecture Implemented Locally

### Frontend

- Next.js App Router.
- TypeScript.
- Tailwind CSS.
- `lucide-react` icons.
- Client-side context providers for brand and local data.

### App Shells

- `AppShell`: admin navigation and layout.
- `ViewerShell`: manager/viewer navigation and layout.
- Public landing and login are separate from authenticated app surfaces.

### Local State

The MVP currently uses browser local storage for persistence.

```text
localStorage
├── safersay-brand
│   ├── name
│   ├── tagline
│   ├── logoDataUrl
│   ├── font
│   └── colors
└── safersay-data
    ├── identity
    │   ├── employees
    │   └── participants
    └── responses
        ├── cycles
        ├── submissions
        └── answers
```

### Server API State

The new server API slice uses a server-side memory fallback when `DATABASE_URL` is absent. This is materially better than browser-only state for flow validation, but it is not durable and not a production security boundary.

```text
Server API memory fallback
├── employees
├── participants with server-issued raw tokens and token hashes
├── cycles with payment status
├── submissions
└── answers
```

When `DATABASE_URL` is provided, the intended target is the Postgres schema in `db/migrations/0001_confidential_spine.sql`.

### Confidentiality Model

```text
Identity / Participation Store
  - Employee name
  - Email
  - Team
  - Token
  - Token status
  - Reminder count

Response Store
  - Survey cycle
  - Submission id
  - Spent token
  - Submitted date bucket
  - Answers

Reporting Layer
  - Requires at least 5 submissions
  - Suppresses results below threshold
  - Exports protected-safe output below threshold
```

### Current Limitation

This is a local MVP with a first server-side API slice. It demonstrates the product architecture and some server-side enforcement paths, but does not yet enforce production confidentiality because it is not connected to a real Postgres deployment with RLS and separate credentials. Production still needs server-side auth, database separation, API authorization, audit logging, hardened token handling, real Stripe webhooks, and real Resend delivery.

---

## 6. Feature Map By Role

| Role | Implemented Surface | Current Capabilities | Pending |
|---|---|---|---|
| Employee | `/s/[token]` | Read confidentiality screen, submit survey, spend token. | Real auth/token validation server-side. |
| Survey Admin | `/app`, `/app/surveys/new` | Load people, set window, launch/close cycle, export. | Real tenant config, CSV parser, scheduling jobs. |
| HR Coordinator | `/app/participants` | View participation store only. | Role-based permission enforcement. |
| People Analyst | `/app/reports` | View threshold-safe report. | Segmentation, trends, export formats. |
| Manager | `/viewer/team` | Protected team view. | Manager hierarchy and scoped report enforcement. |
| Executive / HRBP | `/viewer`, `/viewer/org` | Aggregate viewer portal. | Org segmentation, trends, comparative cycles. |
| Brand Admin | `/app/brand` | Customize logo/theme/font/name. | Server-side tenant theme storage. |
| Billing Owner | `/app/billing` | Billing plan/cancel placeholder. | Stripe implementation. |
| IT Admin | `/app/integrations` | See connection roadmap. | Real connector setup. |

---

## 7. Delivered Files Of Interest

### Product Docs

- `RESEARCH_FINDINGS.md`
- `BUILD_PLAN.md`
- `PRODUCT_SURFACES.md`
- `PRODUCT_GAPS.md`
- `BRAND.md`
- `SOLUTION_ARCHITECT_PRODUCT_REPORT.md`

### Core Components

- `src/components/AppShell.tsx`
- `src/components/ViewerShell.tsx`
- `src/components/ProductDemo.tsx`
- `src/components/BrandProvider.tsx`
- `src/components/DataProvider.tsx`
- `src/components/BrandMark.tsx`

### Core Libraries

- `src/lib/localData.ts`
- `src/lib/templates.ts`
- `src/lib/brand.ts`
- `src/lib/confidentiality.ts`
- `src/lib/confidentiality.test.ts`

---

## 8. Validation Status

Last validation performed:

- `npm run lint`: passed
- `npm run build`: passed
- `npm test`: passed, 11 tests

---

## 9. Recommended Next Sprint

### Sprint Goal

Make SaferSay materially production-shaped by connecting the new server API slice to a real Postgres deployment and replacing mock Stripe/Resend modes with configured integrations.

### Scope

1. Apply Postgres migration to Supabase/Neon.
2. Implement Postgres repository methods behind the current server API routes.
3. Add Stripe checkout session persistence and webhook verification.
4. Add Resend invite/reminder delivery with configured sender.
5. Add API authorization once auth is selected.
6. Add audit events for cycle launch, invite send, reminders, exports, and billing changes.

### Why This Is Next

The current app now has separate product surfaces and a first server API slice. The next hard dependency is replacing local/server-memory persistence with the actual severed database boundary so the confidentiality claim becomes real enough for a paid validation run.
