import { AppShell, Card } from "@/components/AppShell";

export default function BillingPage() {
  return (
    <AppShell title="Billing" subtitle="Pay per survey, keep history only if useful, cancel without traps.">
      <div className="grid gap-4 md:grid-cols-2">
        <Card><h2 className="text-xl font-semibold">£200 / survey</h2><p className="mt-2 text-sm text-[var(--brand-muted)]">Flat fee per survey. No annual lock-in.</p></Card>
        <Card><h2 className="text-xl font-semibold">£15 / month floor</h2><p className="mt-2 text-sm text-[var(--brand-muted)]">Optional history retention and compare past surveys.</p></Card>
      </div>
      <button className="mt-4 rounded-[var(--radius-pill)] border border-[var(--brand-border)] bg-white px-5 py-3 text-sm font-semibold">Cancel plan</button>
    </AppShell>
  );
}
