import { AppShell, Card } from "@/components/AppShell";
import { PageGuide } from "@/components/PageGuide";
import { getRuntimeMode, runtimeChecks } from "@/lib/runtimeConfig";

export default function ReadinessPage() {
  const checks = runtimeChecks();
  const missing = checks.filter((check) => check.requiredForProduction && !check.configured);

  return (
    <AppShell title="Go-live Readiness" subtitle="Security first: production mode should fail closed until required integrations are configured.">
      <PageGuide
        label="Technical setup"
        title="Use this page before a real customer pilot"
        body="This is the production checklist. It tells you which secrets, services, and safety checks are configured before SaferSay is used with a real company."
        actions={[{ href: "/app/pilot", label: "Back to first run", primary: true }]}
      />
      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <h2 className="text-3xl font-semibold">{getRuntimeMode()}</h2>
          <p className="text-sm text-[var(--brand-muted)]">Current runtime mode</p>
        </Card>
        <Card>
          <h2 className="text-3xl font-semibold">{checks.length - missing.length}/{checks.length}</h2>
          <p className="text-sm text-[var(--brand-muted)]">Required checks configured</p>
        </Card>
        <Card>
          <h2 className="text-3xl font-semibold">{missing.length === 0 ? "Ready" : "Blocked"}</h2>
          <p className="text-sm text-[var(--brand-muted)]">Production launch status</p>
        </Card>
      </div>

      <div className="mt-5 grid gap-3">
        {checks.map((check) => (
          <Card key={check.key}>
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
              <div>
                <h2 className="text-lg font-semibold">{check.label}</h2>
                <p className="mt-1 text-sm text-[var(--brand-muted)]">{check.purpose}</p>
              </div>
              <span className={`rounded-full px-3 py-1 text-sm font-semibold ${check.configured ? "bg-[var(--brand-accent-soft)] text-[var(--brand-accent)]" : "bg-[#f6e2df] text-[#9a392d]"}`}>
                {check.configured ? "Configured" : "Placeholder"}
              </span>
            </div>
          </Card>
        ))}
      </div>
    </AppShell>
  );
}
