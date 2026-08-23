"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight, Plus, Search } from "lucide-react";
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

const PAGE_SIZE = 50;

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
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState(searchParams.get("q") ?? "");
  // Debounced separately from `search` so every keystroke doesn't fire a
  // request -- the server does the filtering now, not a client-side
  // .filter() over an unpaginated full table load.
  const [query, setQuery] = useState(search);
  const [page, setPage] = useState(0);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setQuery(search);
      setPage(0);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  function load() {
    const params = new URLSearchParams({ limit: String(PAGE_SIZE), offset: String(page * PAGE_SIZE) });
    if (query.trim()) params.set("q", query.trim());
    fetch(`/api/super-admin/tenants?${params.toString()}`)
      .then((response) => response.json())
      .then((data) => {
        if (!data.ok) return;
        setTenants(data.tenants ?? []);
        setTotal(data.total ?? 0);
      })
      .catch(() => undefined);
  }

  useEffect(load, [query, page]);

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

  const rangeStart = total === 0 ? 0 : page * PAGE_SIZE + 1;
  const rangeEnd = Math.min((page + 1) * PAGE_SIZE, total);

  return (
    <div className="space-y-[9px]">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <h1 className="page-title">Tenants</h1>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={14} strokeWidth={1.8} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ink-faint)]" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search company name"
              aria-label="Search company name"
              className="admin-input h-9 pl-8 sm:w-64"
            />
          </div>
          <button onClick={() => setCreating(true)} className="btn-primary shrink-0">
            <Plus size={13} strokeWidth={1.8} />
            Create tenant
          </button>
        </div>
      </div>

      <ConsoleCard className="overflow-x-auto p-0">
        {tenants === null ? (
          <p className="p-4 secondary-text font-medium">Loading tenants...</p>
        ) : tenants.length === 0 ? (
          <p className="p-4 secondary-text">No tenants match this search.</p>
        ) : (
          <table className="w-full min-w-[760px] border-collapse text-[13px]">
            <thead>
              <tr className="border-b border-[var(--border)] text-left">
                <th className="meta-label px-4 py-3">Client</th>
                <th className="meta-label px-4 py-3">Plan</th>
                <th className="meta-label px-4 py-3">Employees</th>
                <th className="meta-label px-4 py-3">Survey status</th>
                <th className="meta-label px-4 py-3">Health</th>
                <th className="meta-label px-4 py-3">Joined</th>
                <th className="meta-label px-4 py-3">Last active</th>
              </tr>
            </thead>
            <tbody>
              {tenants.map((tenant) => (
                <tr key={tenant.id} onClick={() => router.push(`/console/tenants/${tenant.id}`)} className="cursor-pointer border-b border-[var(--border)] last:border-b-0 hover:bg-[var(--bg-hover)]">
                  <td className="px-4 py-3 font-medium text-[var(--ink)]">{tenant.name}</td>
                  <td className="px-4 py-3">
                    <PlanBadge tier={tenant.planTier} />
                  </td>
                  <td className="px-4 py-3 text-[var(--ink-mid)]">{tenant.employeeCount}</td>
                  <td className="px-4 py-3 text-[var(--ink-mid)]">{tenant.latestCycleName ? `${tenant.latestCycleStatus} · ${tenant.latestCycleName}` : "No survey yet"}</td>
                  <td className="px-4 py-3">
                    <HealthBadge status={deriveHealth(tenant)} />
                  </td>
                  <td className="px-4 py-3 text-[var(--ink-mid)]">{formatDate(tenant.createdAt)}</td>
                  <td className="px-4 py-3 text-[var(--ink-mid)]">{formatDate(tenant.lastActivityAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </ConsoleCard>

      {total > PAGE_SIZE ? (
        <div className="flex items-center justify-between px-1">
          <p className="secondary-text">
            {rangeStart}–{rangeEnd} of {total}
          </p>
          <div className="flex gap-2">
            <button onClick={() => setPage((current) => Math.max(current - 1, 0))} disabled={page === 0} className="btn-secondary px-3 py-1.5 text-xs disabled:cursor-not-allowed disabled:opacity-40">
              <ChevronLeft size={13} strokeWidth={1.8} />
              Previous
            </button>
            <button
              onClick={() => setPage((current) => (rangeEnd < total ? current + 1 : current))}
              disabled={rangeEnd >= total}
              className="btn-secondary px-3 py-1.5 text-xs disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next
              <ChevronRight size={13} strokeWidth={1.8} />
            </button>
          </div>
        </div>
      ) : null}

      {creating ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={() => !submitting && setCreating(false)}>
          <div className="card w-full max-w-sm" onClick={(event) => event.stopPropagation()}>
            <h2 className="section-title">Create tenant</h2>
            <p className="mt-1 secondary-text">Provisions a new, isolated workspace.</p>
            <input
              autoFocus
              value={newName}
              onChange={(event) => setNewName(event.target.value)}
              placeholder="Company name"
              aria-label="Company name"
              className="admin-input mt-4"
            />
            <div className="mt-5 flex gap-2">
              <button onClick={() => setCreating(false)} disabled={submitting} className="btn-secondary flex-1">
                Cancel
              </button>
              <button onClick={submitCreate} disabled={submitting || !newName.trim()} className="btn-primary flex-1">
                {submitting ? "Creating..." : "Create"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
