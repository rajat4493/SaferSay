import { OwnerConsoleShell } from "@/components/OwnerConsoleShell";
import { ConsoleStubPanel } from "@/components/ConsoleStubPanel";

export default function ConsolePlansPage() {
  return (
    <OwnerConsoleShell>
      <ConsoleStubPanel
        title="Plans & Features"
        description="Plan tier and feature-template definitions, plus the per-tenant toggles that drive tenant-detail feature switches, land here next."
      />
    </OwnerConsoleShell>
  );
}
