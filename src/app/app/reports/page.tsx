"use client";

import { AppShell } from "@/components/AppShell";
import { ProtectedReportPanel } from "@/components/ProtectedReportPanel";

export default function ReportsPage() {
  return (
    <AppShell title="Reports" subtitle="Board-ready outputs that never render protected small groups.">
      <ProtectedReportPanel />
    </AppShell>
  );
}
