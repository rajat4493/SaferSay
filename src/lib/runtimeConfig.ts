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
      configured: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY),
      requiredForProduction: true,
      purpose: "Google and Microsoft OAuth providers configured in the Supabase dashboard for buyer/admin login.",
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
      configured: Boolean(process.env.RESEND_API_KEY && process.env.RESEND_FROM_EMAIL),
      requiredForProduction: true,
      purpose: "Invites and reminders.",
    },
    {
      key: "PRIVACY_CONTACT_EMAIL",
      label: "Privacy contact",
      configured: Boolean(process.env.PRIVACY_CONTACT_EMAIL),
      requiredForProduction: true,
      purpose: "GDPR privacy notice and DPA contact.",
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
