import { OwnerConsoleShell } from "@/components/OwnerConsoleShell";
import { UsageHealthPanel } from "@/components/console/UsageHealthPanel";

export default function ConsoleUsagePage() {
  return (
    <OwnerConsoleShell>
      <UsageHealthPanel />
    </OwnerConsoleShell>
  );
}
