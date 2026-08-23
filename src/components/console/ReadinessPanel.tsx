import { ConsoleCard, StatTile } from "@/components/console/ConsoleUI";
import { getRuntimeMode, runtimeChecks } from "@/lib/runtimeConfig";

/**
 * Technical/operator screen -- Supabase config, token secrets, Stripe and
 * Resend readiness. Owner-only by design: a tenant HR admin has no reason
 * to ever see this (moved here from /app/workspace/go-live per the
 * coherence directive -- it was the wrong audience for that screen).
 */
export function ReadinessPanel() {
  const checks = runtimeChecks();
  const missing = checks.filter((check) => check.requiredForProduction && !check.configured);
  const nextActions = [
    "Set Vercel runtime to Node 22 and add production/staging env vars.",
    "Verify Supabase Google and Microsoft OAuth, then set SUPABASE_OAUTH_PROVIDERS_CONFIRMED=true.",
    "Verify a Resend sending domain; do not use onboarding@resend.dev for real pilots.",
    "Create the Stripe webhook for /api/stripe/webhook and add its whsec value.",
    "Configure PRIVACY_CONTACT_EMAIL and review /privacy plus /dpa before customer use.",
  ];

  return (
    <div className="space-y-[9px]">
      <h1 className="page-title">Go-live Readiness</h1>
      <p className="secondary-text">Production checklist across every tenant -- which secrets, services, and safety checks are configured platform-wide.</p>

      <div className="grid gap-2.5 lg:grid-cols-3">
        <StatTile label="Current runtime mode" value={getRuntimeMode()} />
        <StatTile label="Required checks configured" value={`${checks.length - missing.length}/${checks.length}`} />
        <ConsoleCard>
          <p className="meta-label">Production launch status</p>
          <p className={`data-number mt-2 ${missing.length === 0 ? "text-[var(--green)]" : "text-[var(--red)]"}`}>{missing.length === 0 ? "Ready" : "Blocked"}</p>
        </ConsoleCard>
      </div>

      {missing.length > 0 ? (
        <ConsoleCard>
          <h2 className="meta-label">Next actions</h2>
          <ul className="mt-3 space-y-1.5 text-[13px] text-[var(--ink-mid)]">
            {nextActions.map((action) => (
              <li key={action} className="flex gap-2">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-[var(--ink)]" />
                <span>{action}</span>
              </li>
            ))}
          </ul>
        </ConsoleCard>
      ) : null}

      <div className="grid gap-2">
        {checks.map((check) => (
          <ConsoleCard key={check.key}>
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
              <div>
                <h2 className="text-[14px] font-medium text-[var(--ink)]">{check.label}</h2>
                <p className="mt-1 secondary-text">{check.purpose}</p>
              </div>
              <span
                className={`rounded-[var(--radius-pill)] border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.06em] ${
                  check.configured ? "border-[var(--green-border)] bg-[var(--green-bg)] text-[var(--green)]" : "border-[var(--red-border)] bg-[var(--red-bg)] text-[var(--red)]"
                }`}
              >
                {check.configured ? "Configured" : "Placeholder"}
              </span>
            </div>
          </ConsoleCard>
        ))}
      </div>
    </div>
  );
}
