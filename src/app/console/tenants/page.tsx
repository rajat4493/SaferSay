import { OwnerConsoleShell } from "@/components/OwnerConsoleShell";
import { TenantsDirectory } from "@/components/console/TenantsDirectory";

export default function ConsoleTenantsPage() {
  return (
    <OwnerConsoleShell>
      <TenantsDirectory />
    </OwnerConsoleShell>
  );
}
