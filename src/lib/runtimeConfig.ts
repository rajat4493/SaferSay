export type RuntimeMode = "local" | "production";

export type RuntimeCheck = {
  key: string;
  label: string;
  configured: boolean;
  requiredForProduction: boolean;
  purpose: string;
};

export function getRuntimeMode(): RuntimeMode {
  return process.env.SAFERSAY_RUNTIME_MODE === "production" ? "production" : "local";
}

export function runtimeChecks(): RuntimeCheck[] {
  const tokenSecretConfigured = Boolean(
    process.env.TOKEN_SECRET &&
      process.env.TOKEN_SECRET !== "replace-with-a-long-random-secret" &&
      process.env.TOKEN_SECRET !== "local-development-token-secret" &&
      process.env.TOKEN_SECRET.length >= 32,
  );
  return [
    {
      key: "DATABASE_URL",
      label: "Supabase Postgres",
      configured: Boolean(process.env.DATABASE_URL),
      requiredForProduction: true,
      purpose: "Durable severed identity/response persistence.",
    },
    {
      key: "NEXT_PUBLIC_SUPABASE_URL",
      label: "Supabase app client",
      configured: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY),
      requiredForProduction: true,
      purpose: "Browser/server session client for the Supabase project, and the basis for admin/viewer login.",
    },
    {
      key: "SUPABASE_OAUTH_PROVIDERS",
      label: "Google + Microsoft sign-in",
      // The app has no API to inspect which OAuth providers are enabled in
      // the Supabase dashboard — that state lives entirely in the Supabase
      // project's own settings, outside this app's env vars. Checking for
      // NEXT_PUBLIC_SUPABASE_URL here would only prove Supabase itself is
      // configured, not that Google/Microsoft sign-in actually works, so
      // this requires an explicit human confirmation after enabling both
      // providers in Authentication > Providers and test-signing-in with
      // each one.
      configured: process.env.SUPABASE_OAUTH_PROVIDERS_CONFIRMED === "true",
      requiredForProduction: true,
      purpose:
        "Confirms a human has enabled and test-signed-in with Google and Microsoft OAuth in the Supabase dashboard — this cannot be verified automatically from app config alone.",
    },
    {
      key: "TOKEN_SECRET",
      label: "Token signing secret",
      configured: tokenSecretConfigured,
      requiredForProduction: true,
      purpose: "Server-issued respondent token hashing.",
    },
    {
      key: "STRIPE_SECRET_KEY",
      label: "Stripe",
      configured: Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET),
      requiredForProduction: true,
      purpose: "Paid survey cycle checkout and webhook verification.",
    },
    {
      key: "RESEND_API_KEY",
      label: "Resend",
      configured: Boolean(
        process.env.RESEND_API_KEY &&
          process.env.RESEND_FROM_EMAIL &&
          !process.env.RESEND_FROM_EMAIL.includes("resend.dev"),
      ),
      requiredForProduction: true,
      purpose: "Invites and reminders, sent from a verified domain — the shared resend.dev sandbox sender is rejected in production.",
    },
    {
      key: "PRIVACY_CONTACT_EMAIL",
      label: "Privacy contact",
      configured: Boolean(process.env.PRIVACY_CONTACT_EMAIL),
      requiredForProduction: true,
      purpose: "GDPR privacy notice and DPA contact.",
    },
    {
      key: "SENTRY_DSN",
      label: "Error monitoring",
      configured: Boolean(process.env.SENTRY_DSN && process.env.NEXT_PUBLIC_SENTRY_DSN),
      // Informational, not a hard gate -- the app already ran without it.
      // Strongly recommended before real client data flows through, but
      // shouldn't make assertProductionReady() start throwing retroactively.
      requiredForProduction: false,
      purpose: "Server and browser crash reporting, so you find out before a client does.",
    },
    {
      key: "HEALTHCHECK_SECRET",
      label: "Health check auth",
      configured: Boolean(process.env.HEALTHCHECK_SECRET),
      requiredForProduction: true,
      purpose: "Gates /api/internal/db-health, which returns internal schema/RLS metadata -- the route refuses to run in production without it.",
    },
    {
      key: "RETENTION_PURGE_SECRET",
      label: "Data retention purge",
      configured: Boolean(process.env.RETENTION_PURGE_SECRET || process.env.CRON_SECRET),
      requiredForProduction: true,
      purpose: "Authenticates the scheduled job (vercel.json cron) that deletes survey data past each tenant's retention window -- the route refuses to run without it, so retention silently never happens otherwise.",
    },
    {
      key: "CYCLE_SCHEDULER_SECRET",
      label: "Recurring survey scheduler",
      configured: Boolean(process.env.CYCLE_SCHEDULER_SECRET || process.env.CRON_SECRET),
      // Not a hard gate -- unlike retention purge, nothing breaks silently
      // if this is unconfigured; a tenant just can't set up a recurring
      // survey until it is (the "make this recurring" toggle would create
      // a recurrence that never fires). Worth fixing, not launch-blocking.
      requiredForProduction: false,
      purpose: "Authenticates the scheduled job (vercel.json cron) that creates -- and optionally sends -- a tenant's recurring survey cycles.",
    },
  ];
}

export function assertProductionReady() {
  if (getRuntimeMode() !== "production") return;
  const missing = runtimeChecks().filter((check) => check.requiredForProduction && !check.configured);
  if (missing.length > 0) {
    throw new Error(`Production mode is missing required configuration: ${missing.map((check) => check.label).join(", ")}`);
  }
}
