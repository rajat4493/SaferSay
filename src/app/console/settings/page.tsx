import { OwnerConsoleShell } from "@/components/OwnerConsoleShell";
import { SettingsPanel } from "@/components/console/SettingsPanel";

export default function ConsoleSettingsPage() {
  return (
    <OwnerConsoleShell>
      <SettingsPanel />
    </OwnerConsoleShell>
  );
}
