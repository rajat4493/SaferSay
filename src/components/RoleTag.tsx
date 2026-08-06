"use client";

import { useTenantSession } from "@/lib/useTenantSession";

const roleLabels: Record<string, string> = {
  customer_admin: "HR Admin",
  survey_creator: "Survey Creator",
  auditor: "Auditor",
  employee: "Employee",
};

export function RoleTag() {
  const { info } = useTenantSession();

  if (!info) return null;

  if (info.isSuperAdmin && info.isImpersonating) {
    return (
      <span className="inline-flex items-center gap-1 rounded-[var(--radius-pill)] bg-[var(--brand-ink)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-white">
        Owner <span className="opacity-60">→</span> {info.tenantName}
      </span>
    );
  }

  if (info.isSuperAdmin) {
    return (
      <span className="inline-flex items-center rounded-[var(--radius-pill)] bg-[var(--brand-ink)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-white">
        Owner
      </span>
    );
  }

  return (
    <span className="inline-flex items-center rounded-[var(--radius-pill)] bg-[var(--brand-accent-soft)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--brand-accent)]">
      {roleLabels[info.role] ?? "Member"}
    </span>
  );
}
