import { OwnerConsoleShell } from "@/components/OwnerConsoleShell";
import { ReadinessPanel } from "@/components/console/ReadinessPanel";

export default function ConsoleReadinessPage() {
  return (
    <OwnerConsoleShell>
      <ReadinessPanel />
    </OwnerConsoleShell>
  );
}
