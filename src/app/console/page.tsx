import { OwnerConsoleShell } from "@/components/OwnerConsoleShell";
import { OverviewDashboard } from "@/components/console/OverviewDashboard";

export default function ConsoleOverviewPage() {
  return (
    <OwnerConsoleShell>
      <OverviewDashboard />
    </OwnerConsoleShell>
  );
}
