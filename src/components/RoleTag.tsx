"use client";

import { useTenantSession } from "@/lib/useTenantSession";

const roleLabels: Record<string, string> = {
  customer_admin: "Workspace Owner",
  survey_creator: "Survey Admin",
  auditor: "Report Viewer",
  people_leader: "People Leader",
  integration_admin: "Integration Admin",
  compliance_reviewer: "Compliance Reviewer",
  employee: "Employee",
};

export function RoleTag({ compact = false }: { compact?: boolean }) {
  const { info } = useTenantSession();

  if (!info) return null;

  // "Platform Owner" (SaferSay's own operator) is deliberately distinct
  // from "Workspace Owner" (a customer's tenant admin) -- same word for
  // both was a real source of confusion in QA.
  const label = info.isSuperAdmin && info.isImpersonating ? `Platform Owner → ${info.tenantName}` : info.isSuperAdmin ? "Platform Owner" : roleLabels[info.role] ?? "Member";
  if (compact) {
    return <span className="block truncate font-[family-name:var(--font-mono)] text-[10px] font-medium tracking-[0.04em] text-[var(--sidebar-ink-faint)]">{label}</span>;
  }

  return <Pill tone={info.isSuperAdmin && info.isImpersonating ? "red" : "neutral"}>{label}</Pill>;
}

function Pill({ tone, children }: { tone: "neutral" | "red"; children: React.ReactNode }) {
  return (
    <span
      className={`mt-0.5 inline-flex rounded-[var(--radius-pill)] px-1.5 py-0.5 font-[family-name:var(--font-mono)] text-[10px] font-medium tracking-[0.04em] ${
        tone === "red" ? "bg-[var(--red-bg)] text-[var(--red)]" : "bg-[var(--bg-active)] text-[var(--ink-mid)]"
      }`}
    >
      {children}
    </span>
  );
}
