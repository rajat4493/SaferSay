import { OwnerConsoleShell } from "@/components/OwnerConsoleShell";
import { ConsoleStubPanel } from "@/components/ConsoleStubPanel";

export default function ConsoleSupportPage() {
  return (
    <OwnerConsoleShell>
      <ConsoleStubPanel
        title="Support & Alerts"
        description="Tenant-raised issues and system alerts (failed payments, delivery failures, near-limits, trials ending) -- each linking to its tenant or record -- land here next."
      />
    </OwnerConsoleShell>
  );
}
