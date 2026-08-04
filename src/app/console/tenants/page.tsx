import { OwnerConsoleShell } from "@/components/OwnerConsoleShell";
import { ConsoleStubPanel } from "@/components/ConsoleStubPanel";

export default function ConsoleTenantsPage() {
  return (
    <OwnerConsoleShell>
      <ConsoleStubPanel
        title="Tenants"
        description="A searchable, sortable client table plus a support-only tenant detail view (metadata, plan & feature toggles, employee counts, response rates -- never content) lands here next."
      />
    </OwnerConsoleShell>
  );
}
