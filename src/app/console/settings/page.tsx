import { OwnerConsoleShell } from "@/components/OwnerConsoleShell";
import { ConsoleStubPanel } from "@/components/ConsoleStubPanel";

export default function ConsoleSettingsPage() {
  return (
    <OwnerConsoleShell>
      <ConsoleStubPanel
        title="Settings"
        description="Platform settings, platform admin/operator user management, and global config land here next."
      />
    </OwnerConsoleShell>
  );
}
