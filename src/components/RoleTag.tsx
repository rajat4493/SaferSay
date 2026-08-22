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
    return <Pill tone="red">Platform Owner → {info.tenantName}</Pill>;
  }

  if (info.isSuperAdmin) {
    return <Pill tone="neutral">Platform Owner</Pill>;
  }

  return <Pill tone="neutral">{roleLabels[info.role] ?? "Member"}</Pill>;
}

function Pill({ tone, children }: { tone: "neutral" | "red"; children: React.ReactNode }) {
  return (
    <span
      className={`mt-0.5 inline-flex rounded-[var(--radius-pill)] px-1.5 py-0.5 text-[10.5px] font-medium ${
        tone === "red" ? "bg-[var(--red-bg)] text-[var(--red)]" : "bg-[var(--bg-active)] text-[var(--ink-mid)]"
      }`}
    >
      {children}
    </span>
  );
}
