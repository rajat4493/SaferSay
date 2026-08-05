import { OwnerConsoleShell } from "@/components/OwnerConsoleShell";
import { BillingPanel } from "@/components/console/BillingPanel";

export default function ConsoleBillingPage() {
  return (
    <OwnerConsoleShell>
      <BillingPanel />
    </OwnerConsoleShell>
  );
}
