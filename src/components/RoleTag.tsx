"use client";

import { useTenantSession } from "@/lib/useTenantSession";

const roleLabels: Record<string, string> = {
  customer_admin: "Workspace Owner",
  survey_creator: "Survey Admin",
  auditor: "Report Viewer",
  employee: "Employee",
};

export function RoleTag() {
  const { info } = useTenantSession();

  if (!info) return null;

  // "Platform Owner" (SaferSay's own operator) is deliberately distinct
  // from "Workspace Owner" (a customer's tenant admin) -- same word for
  // both was a real source of confusion in QA.
  if (info.isSuperAdmin && info.isImpersonating) {
    return <p className="text-[11.5px] font-medium text-[var(--red)]">Platform Owner → {info.tenantName}</p>;
  }

  if (info.isSuperAdmin) {
    return <p className="text-[11.5px] text-[var(--ink-faint)]">Platform Owner</p>;
  }

  return <p className="text-[11.5px] text-[var(--ink-faint)]">{roleLabels[info.role] ?? "Member"}</p>;
}
