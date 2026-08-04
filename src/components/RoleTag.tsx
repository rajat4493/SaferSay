"use client";

import { useEffect, useState } from "react";

type RoleInfo = { role: "owner" | "admin" | "employee"; isSuperAdmin: boolean } | null;

const roleLabels: Record<string, string> = {
  owner: "HR Admin",
  admin: "HR Admin",
  employee: "Employee",
};

export function RoleTag() {
  const [info, setInfo] = useState<RoleInfo>(null);

  useEffect(() => {
    fetch("/api/tenants/current")
      .then((response) => response.json())
      .then((data) => {
        if (!data.ok) return;
        setInfo({ role: data.role, isSuperAdmin: data.isSuperAdmin });
      })
      .catch(() => undefined);
  }, []);

  if (!info) return null;

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
