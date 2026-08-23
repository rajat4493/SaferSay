# SaferSay Deployment Readiness

Last updated: 2026-08-09

## Current Status

The codebase is ready for a Vercel staging deployment after the required production environment values are added in Vercel.

Validated locally:

- Node `22`
- Next.js `16.3.0`
- `npm run lint`
- `npm test`
- `npm run build`
- `npm audit --audit-level=moderate` returns `0 vulnerabilities`

Do not use this as a real customer production launch until the legal/privacy actions below are complete.

## Local Owner Login

Local development uses a non-production dev login panel.

1. Start the app.
2. Open `http://localhost:3000/login`.
3. Use `dev@localhost`.
4. Go to `/console` for the SaferSay owner console.

This works only when `SAFERSAY_RUNTIME_MODE` is not `production`. It is intentionally disabled on production deployments.

## Vercel Runtime

Set the Vercel project to Node `22.x`.

If Vercel asks for an install/build command, use:

- Install: `npm install`
- Build: `npm run build`
- Output: Next.js default

## Required Vercel Environment Variables

Set these in Vercel before staging:

```text
SAFERSAY_RUNTIME_MODE=production
NEXT_PUBLIC_APP_URL=https://<your-vercel-domain>

NEXT_PUBLIC_SUPABASE_URL=<supabase project url>
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<supabase publishable anon key>
DATABASE_URL=<supabase pooled postgres url>

SUPER_ADMIN_EMAILS=<your owner email>
SUPABASE_OAUTH_PROVIDERS_CONFIRMED=true

TOKEN_SECRET=<long random secret, at least 32 chars>
HEALTHCHECK_SECRET=<long random secret>

STRIPE_SECRET_KEY=<test or live key for that deployment>
STRIPE_WEBHOOK_SECRET=<webhook signing secret for the Vercel endpoint>
STRIPE_PUBLISHABLE_KEY=<matching publishable key>
STRIPE_CURRENCY=usd
STRIPE_PRICE_CREDIT_1=<stripe price id>
STRIPE_PRICE_CREDIT_3=<stripe price id>
STRIPE_PRICE_CREDIT_6=<stripe price id>
STRIPE_PRICE_RETENTION_REPORT=<stripe price id>
STRIPE_PRICE_RETENTION_COMPLIANCE=<stripe price id>

RESEND_API_KEY=<resend key>
RESEND_FROM_EMAIL=SaferSay <survey@your-verified-domain>

AI_PROVIDER=anthropic
AI_MODEL=claude-sonnet-4-6
ANTHROPIC_API_KEY=<anthropic api key, when AI_PROVIDER=anthropic>
OPENAI_API_KEY=<openai api key, when AI_PROVIDER=openai>
AI_API_KEY=<provider api key, when AI_PROVIDER=openai-compatible>
AI_API_BASE_URL=<openai-compatible base url, when AI_PROVIDER=openai-compatible>

LEGAL_ENTITY_NAME=MindscopeAI LLP
PRIVACY_CONTACT_EMAIL=<privacy contact email>
DATA_RESIDENCY_REGION=EU
DEFAULT_DATA_RETENTION_MONTHS=24
```

## Stripe Webhook

For Vercel, create a Stripe webhook endpoint:

```text
https://<your-vercel-domain>/api/stripe/webhook
```

Subscribe at minimum to:

- `checkout.session.completed`
- `customer.subscription.deleted`

Copy the generated `whsec_...` signing secret into `STRIPE_WEBHOOK_SECRET`.

## Supabase Actions

Required before production:

- Enable Google OAuth.
- Enable Microsoft OAuth.
- Test sign-in with each provider.
- Set `SUPABASE_OAUTH_PROVIDERS_CONFIRMED=true` only after both work.
- Confirm database migrations are applied in the target project.
- Confirm production uses the pooled Postgres connection string for `DATABASE_URL`.

## Smoke Test After Staging Deploy

1. Open `/api/readiness`.
2. Confirm `productionReady` is `true`.
3. Sign in with the email listed in `SUPER_ADMIN_EMAILS`.
4. Confirm `/console` opens.
5. Create or enter a tenant workspace.
6. Create a survey.
7. Add/import people.
8. Launch/send survey.
9. Submit at least `k` responses.
10. Confirm results unlock.
11. Confirm no names/emails/raw responses appear in reports.
12. Buy a credit pack through Stripe test Checkout.
13. Confirm the webhook updates tenant credits.
14. Start a retention plan.
15. Confirm the webhook updates tenant retention.
16. Expand AI insights only after report unlock.
17. Confirm AI insights use group scores only.
18. Close and lock the survey.
19. Confirm reminders/notes/actions are blocked after lock.

## Not Yet Production-Customer Ready

These are business/legal/compliance actions, not build blockers:

- Final privacy policy review.
- DPA review.
- Confirm data retention/deletion process.
- Confirm incident/breach response process.
- Confirm who can access Supabase production data.
- Rotate any test secrets that were pasted into local tooling.
