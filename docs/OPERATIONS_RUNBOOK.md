# SaferSay Operations Runbook

Last updated: 2026-08-09

## Purpose

This runbook is for founder-led pilots. It defines how SaferSay should operate while handling employee survey data, before broad self-serve production launch.

## Access Rules

- Production database access is restricted to the SaferSay owner/operator.
- Tenant admins manage their own employees, surveys, exports, and report retention.
- Platform-owner console access is for operational support only.
- Platform-owner access must not be used to inspect raw responses or identify respondents.
- Report access remains k-enforced: group scores only, never names.

## PII Handling

PII includes:

- customer user emails
- employee emails
- employee names
- team/location/manager fields
- invite/token participation state
- support notes that mention a person

Rules:

- Do not paste PII into AI tools.
- Do not export PII unless needed for customer support or deletion.
- Do not send screenshots containing employee lists to third parties.
- Keep support notes operational. Do not put survey answers or respondent identity in support notes.

## AI Handling

AI insights must use only the aggregate, k-enforced report object.

Allowed:

- response count
- minimum group size
- question label
- aggregate average
- scale maximum

Not allowed:

- raw answers
- names
- emails
- token state
- respondent IDs
- employee IDs
- sub-threshold cells
- open-text individual comments

## Deletion Requests

1. Confirm the requester is a tenant admin or authorised privacy contact.
2. Record the request in tenant support notes.
3. Export any data the customer asks to keep.
4. Delete or anonymise tenant records according to the contract and legal basis.
5. Confirm completion by email.

Pilot target: respond within 2 business days.

## Report Release

When a customer chooses release after export:

1. Confirm they have exported required reports.
2. Set retention plan to `none`.
3. Remove online report-retention access according to the agreed retention process.
4. Keep only records required for billing, security, or legal obligations.

## Incident Response

If a suspected breach or confidentiality issue occurs:

1. Stop the affected operation if possible.
2. Preserve logs and timestamps.
3. Identify affected tenant(s), data types, and time window.
4. Do not delete evidence.
5. Notify the SaferSay owner immediately.
6. Prepare a customer notice if personal data may be affected.
7. Record final remediation and prevention steps.

Pilot target: initial internal assessment within 24 hours.

## Staging Smoke Test

Run after every staging deployment:

1. `/api/readiness` returns production mode and no missing required checks.
2. Owner email can sign in and access `/console`.
3. Create or enter a tenant.
4. Import employees.
5. Create a survey.
6. Send/queue invites.
7. Open respondent links and submit at least k responses.
8. Results unlock with no names/emails/token state.
9. AI insights show only after entitlement and enough data.
10. Survey close locks reminders, notes, and other communication.
11. Stripe test checkout adds credits and enables AI.
12. Retention checkout updates retention plan.
13. Export CSV works.
14. Sign out works.

## Account Setup Checklist

- Vercel Node runtime is Node 22.
- Supabase Google OAuth tested.
- Supabase Microsoft OAuth tested.
- Resend sending domain verified.
- Stripe webhook points to `/api/stripe/webhook`.
- `PRIVACY_CONTACT_EMAIL` is configured.
- AI provider key is configured.
- `SUPER_ADMIN_EMAILS` contains the owner email.

