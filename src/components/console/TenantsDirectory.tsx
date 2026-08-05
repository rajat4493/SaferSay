"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus, Search } from "lucide-react";
import { ConsoleCard, HealthBadge, PlanBadge, formatDate } from "@/components/console/ConsoleUI";

type TenantEntry = {
  id: string;
  name: string;
  slug: string;
  employeeCount: number;
  latestCycleName: string | null;
  latestCycleStatus: string | null;
  lastActivityAt: string | null;
  planTier: string;
  createdAt: string;
};

function deriveHealth(tenant: TenantEntry): "ok" | "attention" | "at_risk" {
  if (tenant.employeeCount === 0) return "at_risk";
  const daysSinceActivity = tenant.lastActivityAt
    ? Math.floor((Date.now() - new Date(tenant.lastActivityAt).getTime()) / (1000 * 60 * 60 * 24))
    : Infinity;
  if (daysSinceActivity > 30) return "at_risk";
  if (tenant.latestCycleStatus === "draft" || daysSinceActivity > 7) return "attention";
  return "ok";
}

export function TenantsDirectory() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [tenants, setTenants] = useState<TenantEntry[] | null>(null);
  const [search, setSearch] = useState(searchParams.get("q") ?? "");
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function load() {
    fetch("/api/super-admin/tenants")
      .then((response) => response.json())
      .then((data) => {
        if (!data.ok) return;
        setTenants(data.tenants ?? []);
      })
      .catch(() => undefined);
  }

  useEffect(load, []);

  const filtered = useMemo(() => {
    if (!tenants) return [];
    const query = search.trim().toLowerCase();
    if (!query) return tenants;
    return tenants.filter((tenant) => tenant.name.toLowerCase().includes(query));
  }, [tenants, search]);

  async function submitCreate() {
    if (!newName.trim()) return;
    setSubmitting(true);
    try {
      const response = await fetch("/api/super-admin/tenants", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: newName.trim() }),
      });
      const data = await response.json();
      if (data.ok) {
        setNewName("");
        setCreating(false);
        load();
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <h1 className="text-xl font-semibold tracking-tight">Tenants</h1>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--brand-muted)]" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search company name"
              className="h-10 w-full rounded-full border border-[var(--brand-border)] bg-white pl-9 pr-4 text-sm outline-none focus:border-[var(--brand-accent)] sm:w-64"
            />
          </div>
          <button
            onClick={() => setCreating(true)}
            className="inline-flex h-10 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full bg-[var(--brand-ink)] px-4 text-sm font-semibold text-white"
          >
            <Plus size={15} />
            Create tenant
          </button>
        </div>
      </div>

      <ConsoleCard className="overflow-x-auto p-0">
        {tenants === null ? (
          <p className="p-4 text-sm font-semibold text-[var(--brand-muted)]">Loading tenants...</p>
        ) : filtered.length === 0 ? (
          <p className="p-4 text-sm text-[var(--brand-muted)]">No tenants match this search.</p>
        ) : (
          <table className="w-full min-w-[760px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-[var(--brand-border)] text-left text-xs font-semibold uppercase tracking-[0.08em] text-[var(--brand-muted)]">
                <th className="px-4 py-3 font-semibold">Client</th>
                <th className="px-4 py-3 font-semibold">Plan</th>
                <th className="px-4 py-3 font-semibold">Employees</th>
                <th className="px-4 py-3 font-semibold">Survey status</th>
                <th className="px-4 py-3 font-semibold">Health</th>
                <th className="px-4 py-3 font-semibold">Joined</th>
                <th className="px-4 py-3 font-semibold">Last active</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((tenant) => (
                <tr
                  key={tenant.id}
                  onClick={() => router.push(`/console/tenants/${tenant.id}`)}
                  className="cursor-pointer border-b border-[var(--brand-border)] last:border-b-0 hover:bg-black/[0.02]"
                >
                  <td className="px-4 py-3 font-semibold">{tenant.name}</td>
                  <td className="px-4 py-3">
                    <PlanBadge tier={tenant.planTier} />
                  </td>
                  <td className="px-4 py-3 text-[var(--brand-muted)]">{tenant.employeeCount}</td>
                  <td className="px-4 py-3 text-[var(--brand-muted)]">
                    {tenant.latestCycleName ? `${tenant.latestCycleStatus} · ${tenant.latestCycleName}` : "No survey yet"}
                  </td>
                  <td className="px-4 py-3">
                    <HealthBadge status={deriveHealth(tenant)} />
                  </td>
                  <td className="px-4 py-3 text-[var(--brand-muted)]">{formatDate(tenant.createdAt)}</td>
                  <td className="px-4 py-3 text-[var(--brand-muted)]">{formatDate(tenant.lastActivityAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </ConsoleCard>

      {creating ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={() => !submitting && setCreating(false)}>
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl" onClick={(event) => event.stopPropagation()}>
            <h2 className="text-lg font-semibold">Create tenant</h2>
            <p className="mt-1 text-sm text-[var(--brand-muted)]">Provisions a new, isolated workspace.</p>
            <input
              autoFocus
              value={newName}
              onChange={(event) => setNewName(event.target.value)}
              placeholder="Company name"
              className="mt-4 h-11 w-full rounded-xl border border-[var(--brand-border)] px-3 text-sm outline-none focus:border-[var(--brand-accent)]"
            />
            <div className="mt-5 flex gap-2">
              <button
                onClick={() => setCreating(false)}
                disabled={submitting}
                className="flex-1 rounded-full border border-[var(--brand-border)] bg-white px-4 py-2.5 text-sm font-semibold disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={submitCreate}
                disabled={submitting || !newName.trim()}
                className="flex-1 rounded-full bg-[var(--brand-ink)] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
              >
                {submitting ? "Creating..." : "Create"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
