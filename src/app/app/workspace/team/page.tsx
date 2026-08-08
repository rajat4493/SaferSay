import { AppShell } from "@/components/AppShell";
import { TeamPanel } from "@/components/TeamPanel";

export default function WorkspaceTeamPage() {
  return (
    <AppShell title="Team" subtitle="Invite teammates and control what they can see.">
      <TeamPanel />
    </AppShell>
  );
}
