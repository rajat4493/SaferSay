import { AppShell, Card } from "@/components/AppShell";
import { InviteOutboxPanel } from "@/components/InviteOutboxPanel";
import { ServerOpsPanel } from "@/components/ServerOpsPanel";

const integrations = [
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
    status: "Planned",
    text: "Send invitations and reminders from the participation store only.",
  },
  {
    name: "Stripe",
    type: "Payments",
    status: "Planned",
    text: "Flat per-cycle checkout and optional floor plan. Cancellation remains visible.",
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
    <AppShell title="Integrations" subtitle="Connect identity, delivery, payments, and exports without making them the confidentiality source of truth.">
      <div className="grid gap-4 md:grid-cols-2">
        {integrations.map((item) => (
          <Card key={item.name}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--brand-muted)]">{item.type}</p>
                <h2 className="mt-2 text-xl font-semibold">{item.name}</h2>
              </div>
              <span className="rounded-full bg-[var(--brand-accent-soft)] px-3 py-1 text-xs font-semibold text-[var(--brand-accent)]">{item.status}</span>
            </div>
            <p className="mt-3 text-sm leading-6 text-[var(--brand-muted)]">{item.text}</p>
            <button className="mt-5 rounded-full border border-[var(--brand-border)] bg-white px-4 py-2 text-sm font-semibold">Configure</button>
          </Card>
        ))}
      </div>
      <InviteOutboxPanel />
      <ServerOpsPanel />
    </AppShell>
  );
}
