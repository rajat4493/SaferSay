import { OwnerConsoleShell } from "@/components/OwnerConsoleShell";
import { ConsoleStubPanel } from "@/components/ConsoleStubPanel";

export default function ConsoleUsagePage() {
  return (
    <OwnerConsoleShell>
      <ConsoleStubPanel
        title="Usage & Health"
        description="Platform usage aggregates (surveys created, tokens issued/consumed, response counts, email delivery status) and system health signals land here next -- all aggregate, no content."
      />
    </OwnerConsoleShell>
  );
}
