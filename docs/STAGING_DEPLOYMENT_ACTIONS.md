# Staging Deployment Actions

These are the account actions needed before a useful Vercel staging test.

## Vercel

Set Node runtime to Node 22.

Add environment variables from `PRODUCTION_DEPLOYMENT.md`.

For staging, use test keys:

- Stripe test secret key
- Stripe test publishable key
- Stripe test price IDs
- Stripe test webhook secret

## Stripe

Create a webhook endpoint:

```text
https://<staging-domain>/api/stripe/webhook
```

Events:

- `checkout.session.completed`
- `customer.subscription.deleted`

Copy the `whsec_...` value into Vercel as `STRIPE_WEBHOOK_SECRET`.

## Supabase

Configure callback URL:

```text
https://<staging-domain>/auth/callback
```

Enable and test:

- Google OAuth
- Microsoft OAuth

Only after both work, set:

```text
SUPABASE_OAUTH_PROVIDERS_CONFIRMED=true
```

## Resend

Verify a sending domain.

Use a sender like:

```text
SaferSay <survey@your-domain>
```

Do not use `onboarding@resend.dev` for a real pilot.

## Final Staging Test

After deploy, open:

```text
https://<staging-domain>/api/readiness
```

Do not invite a real customer until `productionReady` is `true` for the staging environment.

