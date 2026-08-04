import { OwnerConsoleShell } from "@/components/OwnerConsoleShell";
import { ConsoleStubPanel } from "@/components/ConsoleStubPanel";

export default function ConsoleOverviewPage() {
  return (
    <OwnerConsoleShell>
      <ConsoleStubPanel
        title="Overview"
        description="KPI stat-card row (active tenants, live surveys, MRR, employees under management, at-risk tenants), an attention feed, recent activity, and an MRR trend chart land here next."
      />
    </OwnerConsoleShell>
  );
}
