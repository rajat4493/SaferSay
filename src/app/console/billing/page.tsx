import { OwnerConsoleShell } from "@/components/OwnerConsoleShell";
import { ConsoleStubPanel } from "@/components/ConsoleStubPanel";

export default function ConsoleBillingPage() {
  return (
    <OwnerConsoleShell>
      <ConsoleStubPanel
        title="Billing"
        description="MRR, revenue trend, churn rate, per-tenant subscription status, invoices, and failed payments -- scaffolded now, wired to Stripe when it lands."
      />
    </OwnerConsoleShell>
  );
}
