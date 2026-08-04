"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Search } from "lucide-react";
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

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

export function OwnerTenantDirectory() {
  const router = useRouter();
  const [tenants, setTenants] = useState<TenantEntry[] | null>(null);
  const [search, setSearch] = useState("");
  const [switchingId, setSwitchingId] = useState("");

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
    setSwitchingId(tenantId);
    await fetch("/api/super-admin/switch", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ tenantId }),
    });
    router.push("/app");
    router.refresh();
  }

  const filtered = useMemo(() => {
    if (!tenants) return [];
    const query = search.trim().toLowerCase();
    if (!query) return tenants;
    return tenants.filter((tenant) => tenant.name.toLowerCase().includes(query));
  }, [tenants, search]);

  const totals = useMemo(() => {
    if (!tenants) return { tenantCount: 0, employeeCount: 0, activeSurveys: 0 };
    return {
      tenantCount: tenants.length,
      employeeCount: tenants.reduce((sum, tenant) => sum + tenant.employeeCount, 0),
      activeSurveys: tenants.filter((tenant) => tenant.latestCycleStatus === "open").length,
    };
  }, [tenants]);

  return (
    <div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <h2 className="text-3xl font-semibold tracking-[-0.02em]">{totals.tenantCount}</h2>
          <p className="mt-1 text-sm text-[var(--brand-muted)]">Customer workspaces</p>
        </Card>
        <Card>
          <h2 className="text-3xl font-semibold tracking-[-0.02em]">{totals.employeeCount}</h2>
          <p className="mt-1 text-sm text-[var(--brand-muted)]">Employees, platform-wide</p>
        </Card>
        <Card>
          <h2 className="text-3xl font-semibold tracking-[-0.02em]">{totals.activeSurveys}</h2>
          <p className="mt-1 text-sm text-[var(--brand-muted)]">Surveys currently open</p>
        </Card>
      </div>

      <Card className="mt-4">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <h2 className="text-xl font-semibold">All workspaces</h2>
          <div className="relative">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--brand-muted)]" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search company name"
              className="h-10 w-full rounded-[var(--radius-pill)] border border-[var(--brand-border)] bg-white pl-9 pr-4 text-sm outline-none focus:border-[var(--brand-accent)] sm:w-64"
            />
          </div>
        </div>

        <div className="mt-4 overflow-x-auto rounded-2xl border border-[var(--brand-border)] bg-white">
          {tenants === null ? (
            <p className="p-4 text-sm font-semibold text-[var(--brand-muted)]">Loading workspaces...</p>
          ) : filtered.length === 0 ? (
            <p className="p-4 text-sm text-[var(--brand-muted)]">No workspaces match this search.</p>
          ) : (
            <table className="w-full min-w-[640px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-[var(--brand-border)] text-left text-xs font-semibold uppercase tracking-[0.08em] text-[var(--brand-muted)]">
                  <th className="px-4 py-3 font-semibold">Company</th>
                  <th className="px-4 py-3 font-semibold">Employees</th>
                  <th className="px-4 py-3 font-semibold">Latest survey</th>
                  <th className="px-4 py-3 font-semibold">Last activity</th>
                  <th className="px-4 py-3 font-semibold"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((tenant) => (
                  <tr key={tenant.id} className="border-b border-[var(--brand-border)] last:border-b-0">
                    <td className="px-4 py-3 font-semibold">{tenant.name}</td>
                    <td className="px-4 py-3 text-[var(--brand-muted)]">{tenant.employeeCount}</td>
                    <td className="px-4 py-3">
                      {tenant.latestCycleName ? (
                        <>
                          <span className="text-[var(--brand-ink)]">{tenant.latestCycleName}</span>
                          <span className="ml-2 rounded-[var(--radius-pill)] bg-[var(--brand-accent-soft)] px-2 py-0.5 text-xs font-semibold text-[var(--brand-accent)]">
                            {tenant.latestCycleStatus}
                          </span>
                        </>
                      ) : (
                        <span className="text-[var(--brand-muted)]">No survey yet</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-[var(--brand-muted)]">{formatDate(tenant.lastActivityAt)}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => enter(tenant.id)}
                        disabled={switchingId === tenant.id}
                        className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-[var(--radius-pill)] bg-[var(--brand-ink)] px-4 text-xs font-semibold text-white disabled:opacity-50"
                      >
                        {switchingId === tenant.id ? "Entering..." : "Enter"}
                        <ArrowRight size={12} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Card>
    </div>
  );
}
