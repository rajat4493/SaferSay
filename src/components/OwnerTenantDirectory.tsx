"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Building2 } from "lucide-react";
import { Card } from "@/components/AppShell";

type TenantEntry = {
  id: string;
  name: string;
  slug: string;
  employeeCount: number;
  latestCycleName: string | null;
  latestCycleStatus: string | null;
  lastActivityAt: string | null;
};

export function OwnerTenantDirectory() {
  const router = useRouter();
  const [tenants, setTenants] = useState<TenantEntry[] | null>(null);
  const [switching, setSwitching] = useState("");

  useEffect(() => {
    fetch("/api/super-admin/tenants")
      .then((response) => response.json())
      .then((data) => {
        if (!data.ok) return;
        setTenants(data.tenants ?? []);
      })
      .catch(() => undefined);
  }, []);

  async function enter(tenantId: string) {
    setSwitching(tenantId);
    await fetch("/api/super-admin/switch", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ tenantId }),
    });
    router.refresh();
  }

  return (
    <Card>
      <div className="inline-flex items-center gap-2 rounded-[var(--radius-pill)] bg-[var(--brand-accent-soft)] px-3 py-1 text-xs font-semibold text-[var(--brand-accent)]">
        <Building2 size={14} />
        All customer workspaces
      </div>
      <h2 className="mt-3 text-xl font-semibold">Every SaferSay tenant</h2>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--brand-muted)]">
        As the platform owner, this is your view — every company running SaferSay, at a glance. Click any workspace to enter it.
      </p>

      {tenants === null ? (
        <p className="mt-5 text-sm font-semibold text-[var(--brand-muted)]">Loading workspaces...</p>
      ) : tenants.length === 0 ? (
        <p className="mt-5 text-sm text-[var(--brand-muted)]">No customer workspaces yet.</p>
      ) : (
        <div className="mt-5 grid gap-3">
          {tenants.map((tenant) => (
            <div
              key={tenant.id}
              className="flex flex-col justify-between gap-3 rounded-[var(--radius-card)] border border-[var(--brand-border)] bg-white p-4 sm:flex-row sm:items-center"
            >
              <div>
                <div className="font-semibold">{tenant.name}</div>
                <div className="mt-1 text-xs text-[var(--brand-muted)]">
                  {tenant.employeeCount} employee{tenant.employeeCount === 1 ? "" : "s"}
                  {tenant.latestCycleName ? ` · ${tenant.latestCycleName} (${tenant.latestCycleStatus})` : " · no survey yet"}
                </div>
              </div>
              <button
                onClick={() => enter(tenant.id)}
                disabled={switching === tenant.id}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-[var(--radius-pill)] bg-[var(--brand-ink)] px-4 text-sm font-semibold text-white disabled:opacity-50"
              >
                {switching === tenant.id ? "Entering..." : "Enter workspace"}
                <ArrowRight size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
