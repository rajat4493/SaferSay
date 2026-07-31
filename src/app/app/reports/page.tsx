"use client";

import { AppShell } from "@/components/AppShell";
import { PageGuide } from "@/components/PageGuide";
import { ProtectedReportPanel } from "@/components/ProtectedReportPanel";

export default function ReportsPage() {
  return (
    <AppShell title="Reports" subtitle="Board-ready outputs that never render protected small groups.">
      <PageGuide
        label="Step 4"
        title="Read only threshold-safe results"
        body="This page is for HR, founders, and managers who need the truth without exposing people. If fewer than five people are in a group, SaferSay suppresses that view."
        actions={[
          { href: "/app/integrations", label: "Back: invites" },
          { href: "/viewer", label: "Open viewer portal", primary: true },
        ]}
      />
      <ProtectedReportPanel />
    </AppShell>
  );
}
