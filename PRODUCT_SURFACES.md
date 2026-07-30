# PRODUCT_SURFACES.md

## 1. Admin Builder Surface

Route: `/app`

Users: HR admins, People team owners, survey coordinators.

Purpose:

- Create survey cycles.
- Load employees.
- Issue participant tokens.
- Monitor participation state.
- Configure branding.
- Export threshold-safe reports.
- Manage billing and cancellation.

Important boundary: admin can monitor participation but must not see identity joined to answers.

## 2. Survey Taker Surface

Route: `/s/[token]`

Users: employees/respondents.

Purpose:

- Validate token.
- Show confidentiality explanation before Q1.
- Submit responses.
- Mark token spent separately from answer content.

Important boundary: respondent experience must be calm, mobile-first, and honest. Do not use fake "anonymous" claims.

## 3. Viewer Surface

Route: `/viewer`

Users: executives, HRBPs, managers, people leaders.

Purpose:

- See threshold-safe aggregate reports.
- View org/team/comment/action areas based on role.
- Support leader action loop.

Important boundary: viewers never see the participation store, employee identities, raw respondent metadata, or sub-5 segment cells.

## Future Role Model

- Employee: submit only.
- HR Coordinator: participation store only.
- People Analyst: aggregate response/report store only.
- HRBP / Executive: aggregate dashboards only.
- Manager: own team only if k >= 5, otherwise roll-up.
- Legal Investigation Officer: exceptional workflow only; not a normal product path.

