import { AppShell, Card } from "@/components/AppShell";
import { InviteOutboxPanel } from "@/components/InviteOutboxPanel";
import { PageGuide } from "@/components/PageGuide";

const connectedServices = [
  {
    name: "Google Workspace",
    type: "SSO + directory",
    status: "Planned",
    text: "Authenticate admins and import eligible employees. CSV fallback stays available.",
  },
  {
    name: "Microsoft 365 / Entra ID",
    type: "SSO + hierarchy",
    status: "Planned",
    text: "Use login identity, manager mapping, department, location, and groups as source signals.",
  },
  {
    name: "Resend",
    type: "Email delivery",
    status: "Test mode",
    text: "Send invitations and reminders from the participation store only. Verified-domain sending comes after domain DNS setup.",
  },
  {
    name: "Stripe",
    type: "Payments",
    status: "Planned",
    text: "Flat per-survey checkout and optional floor plan. Cancellation remains visible.",
  },
  {
    name: "CSV / PDF Export",
    type: "Data portability",
    status: "Local MVP",
    text: "Exports threshold-safe report output. No identity fields in response exports.",
  },
  {
    name: "Power BI / Slides",
    type: "Viewer reporting",
    status: "Later",
    text: "Board-pack exports once the report schema is stable.",
  },
];

export default function IntegrationsPage() {
  return (
    <AppShell title="Invites" subtitle="Send invite links to your team. Optional logins and payments live here too.">
      <PageGuide
        label="Step 3"
        title="Send invites without touching survey answers"
        body="This page shows who's been invited and lets you send test-mode emails. It never has access to survey answers."
        actions={[
          { href: "/app/surveys/new", label: "Back: survey" },
          { href: "/app/reports", label: "Next: reports", primary: true },
        ]}
      />
      <InviteOutboxPanel />

      <h2 className="mt-8 text-sm font-semibold uppercase tracking-[0.14em] text-[var(--brand-muted)]">Connected services</h2>
      <div className="mt-3 grid gap-4 md:grid-cols-2">
        {connectedServices.map((item) => (
          <Card key={item.name} className="opacity-90">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--brand-muted)]">{item.type}</p>
                <h3 className="mt-2 text-lg font-semibold">{item.name}</h3>
              </div>
              <span className="rounded-[var(--radius-pill)] bg-[var(--brand-accent-soft)] px-3 py-1 text-xs font-semibold text-[var(--brand-accent)]">{item.status}</span>
            </div>
            <p className="mt-3 text-sm leading-6 text-[var(--brand-muted)]">{item.text}</p>
          </Card>
        ))}
      </div>
    </AppShell>
  );
}
