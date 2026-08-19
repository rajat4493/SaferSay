"use client";

import { AppShell } from "@/components/AppShell";
import { GroupsPanel } from "@/components/GroupsPanel";

export default function GroupsPage() {
  return (
    <AppShell title="Groups" subtitle="Organize people into teams for group-scoped reporting.">
      <GroupsPanel />
    </AppShell>
  );
}
