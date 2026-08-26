"use client";

import { useEffect, useState } from "react";
import { ProtectedReportPanel } from "@/components/ProtectedReportPanel";
import { ViewerShell } from "@/components/ViewerShell";
import { canExportReports } from "@/lib/permissions";
import type { UserRole } from "@/lib/server/repositories/types";

export default function ViewerOverview() {
  const [role, setRole] = useState<UserRole | null>(null);

  useEffect(() => {
    fetch("/api/tenants/current")
      .then((response) => response.json())
      .then((data: { ok?: boolean; role?: UserRole }) => {
        if (data.ok) setRole(data.role as UserRole);
      })
      .catch(() => undefined);
  }, []);

  return (
    <ViewerShell title="Leadership Overview" subtitle="Executive and HRBP view: aggregate results only, no identity or participation table.">
      <ProtectedReportPanel mode="viewer" allowExport={role ? canExportReports(role) : false} />
    </ViewerShell>
  );
}
