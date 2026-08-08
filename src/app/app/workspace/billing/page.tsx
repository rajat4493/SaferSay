"use client";

import { AppShell, Card } from "@/components/AppShell";
import { useToast } from "@/components/ToastProvider";

export default function WorkspaceBillingPage() {
  const toast = useToast();

  function cancelPlan() {
    if (!window.confirm("Cancel your plan? You'll keep access until the end of the current billing period.")) return;
    toast.show({ variant: "info", message: "Cancellation isn't wired up yet -- email support@safersay.com and we'll handle it." });
  }

  return (
    <AppShell title="Billing" subtitle="Pay per survey, keep history only if useful, cancel without traps.">
      <div className="grid gap-2.5 md:grid-cols-2">
        <Card>
          <h2 className="section-title">£200 / survey</h2>
          <p className="mt-2 secondary-text">Flat fee per survey. No annual lock-in.</p>
        </Card>
        <Card>
          <h2 className="section-title">£15 / month floor</h2>
          <p className="mt-2 secondary-text">Optional history retention and compare past surveys.</p>
        </Card>
      </div>
      <button onClick={cancelPlan} className="btn-destructive mt-[9px]">
        Cancel plan
      </button>
    </AppShell>
  );
}
