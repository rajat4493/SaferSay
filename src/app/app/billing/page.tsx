import { AppShell, Card } from "@/components/AppShell";
import { ServerOpsPanel } from "@/components/ServerOpsPanel";

export default function BillingPage() {
  return (
    <AppShell title="Billing" subtitle="Pay per cycle, keep history only if useful, cancel without traps.">
      <div className="grid gap-4 md:grid-cols-2">
        <Card><h2 className="text-xl font-semibold">£200 / cycle</h2><p className="mt-2 text-sm text-[var(--brand-muted)]">Flat per survey cycle. No annual lock-in.</p></Card>
        <Card><h2 className="text-xl font-semibold">£15 / month floor</h2><p className="mt-2 text-sm text-[var(--brand-muted)]">Optional history retention and cycle comparison.</p></Card>
      </div>
      <button className="mt-4 rounded-full border border-[var(--brand-border)] bg-white px-5 py-3 text-sm font-semibold">Cancel plan</button>
      <ServerOpsPanel />
    </AppShell>
  );
}
