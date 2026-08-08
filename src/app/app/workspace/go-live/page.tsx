import { AppShell, Card } from "@/components/AppShell";
import { PageGuide } from "@/components/PageGuide";
import { getRuntimeMode, runtimeChecks } from "@/lib/runtimeConfig";

export default function WorkspaceGoLivePage() {
  const checks = runtimeChecks();
  const missing = checks.filter((check) => check.requiredForProduction && !check.configured);

  return (
    <AppShell title="Go-live Readiness" subtitle="Security first: production mode should fail closed until required integrations are configured.">
      <PageGuide
        label="Technical setup"
        title="Use this page before a real customer pilot"
        body="This is the production checklist. It tells you which secrets, services, and safety checks are configured before SaferSay is used with a real company."
      />
      <div className="grid gap-2.5 lg:grid-cols-3">
        <Card>
          <div className="data-number">{getRuntimeMode()}</div>
          <p className="secondary-text">Current runtime mode</p>
        </Card>
        <Card>
          <div className="data-number">
            {checks.length - missing.length}/{checks.length}
          </div>
          <p className="secondary-text">Required checks configured</p>
        </Card>
        <Card>
          <div className={`data-number ${missing.length === 0 ? "text-[var(--green)]" : "text-[var(--red)]"}`}>{missing.length === 0 ? "Ready" : "Blocked"}</div>
          <p className="secondary-text">Production launch status</p>
        </Card>
      </div>

      <div className="mt-[9px] grid gap-2">
        {checks.map((check) => (
          <Card key={check.key}>
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
          </Card>
        ))}
      </div>
    </AppShell>
  );
}
