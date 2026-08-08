"use client";

import { useTenantSession } from "@/lib/useTenantSession";

const roleLabels: Record<string, string> = {
  customer_admin: "HR Admin",
  survey_creator: "Survey Creator",
  auditor: "Viewer",
  employee: "Employee",
};

export function RoleTag() {
  const { info } = useTenantSession();

  if (!info) return null;

  if (info.isSuperAdmin && info.isImpersonating) {
    return <p className="text-[11.5px] font-medium text-[var(--red)]">Owner → {info.tenantName}</p>;
  }

  if (info.isSuperAdmin) {
    return <p className="text-[11.5px] text-[var(--ink-faint)]">Owner</p>;
  }

  return <p className="text-[11.5px] text-[var(--ink-faint)]">{roleLabels[info.role] ?? "Member"}</p>;
}
