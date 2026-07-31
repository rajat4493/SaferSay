"use client";

import { ProtectedReportPanel } from "@/components/ProtectedReportPanel";
import { ViewerShell } from "@/components/ViewerShell";

export default function ViewerOverview() {
  return (
    <ViewerShell title="Leadership Overview" subtitle="Executive and HRBP view: aggregate results only, no identity or participation table.">
      <ProtectedReportPanel mode="viewer" />
    </ViewerShell>
  );
}
