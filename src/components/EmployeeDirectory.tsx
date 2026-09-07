"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Search } from "lucide-react";
import { Card } from "@/components/AppShell";
import { Avatar } from "@/components/Avatar";
import { SkeletonRow } from "@/components/Skeleton";

type Employee = {
  id: string;
  email: string;
  name: string | null;
  team: string | null;
  location: string | null;
  employmentStatus: string;
};

const PAGE_SIZE = 50;

export function EmployeeDirectory({ refreshKey = 0, justImportedCount = 0 }: { refreshKey?: number; justImportedCount?: number }) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState("");
  const [adding, setAdding] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newName, setNewName] = useState("");
  const [addStatus, setAddStatus] = useState("");
  // Reset loading to true the moment search or refreshKey changes, during
  // render rather than in an effect (same pattern results/page.tsx uses
  // for its department-picker reset) -- otherwise there's a stale-render
  // window (up to 250ms, the debounce below) where loading is still false
  // and total is still the pre-refresh value, which made the "just
  // imported but not showing" warning fire falsely off stale state before
  // the real refetch had even started.
  const [loadKey, setLoadKey] = useState({ search, refreshKey });
  if (loadKey.search !== search || loadKey.refreshKey !== refreshKey) {
    setLoadKey({ search, refreshKey });
    setLoading(true);
    if (page !== 0) setPage(0);
  }

  const load = useCallback(async (searchValue: string, pageValue: number) => {
    setLoading(true);
    const params = new URLSearchParams({ limit: String(PAGE_SIZE), offset: String(pageValue * PAGE_SIZE) });
    if (searchValue) params.set("search", searchValue);
    const response = await fetch(`/api/employees?${params.toString()}`);
    const result = (await response.json().catch(() => ({}))) as { ok?: boolean; employees?: Employee[]; total?: number };
    if (result.ok) {
      setEmployees(result.employees ?? []);
      setTotal(result.total ?? 0);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    // A large real roster (a director persona flagged this at ~116K rows)
    // had no way to see past the first 50 -- the API already accepted
    // `offset`, only the UI never sent one. Resetting to page 0 whenever
    // the search term changes avoids landing on an out-of-range page for
    // the new, narrower result set.
    const timeout = setTimeout(() => load(search, page), 250);
    return () => clearTimeout(timeout);
  }, [search, load, refreshKey, page]);

  async function toggleStatus(employee: Employee) {
    const nextStatus = employee.employmentStatus === "active" ? "inactive" : "active";
    setUpdatingId(employee.id);
    await fetch(`/api/employees/${employee.id}/status`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status: nextStatus }),
    });
    await load(search, page);
    setUpdatingId("");
  }

  const activeCount = employees.filter((e) => e.employmentStatus === "active").length;

  async function addPerson() {
    const email = newEmail.trim().toLowerCase();
    if (!email) return;
    setAdding(true);
    setAddStatus("");
    const response = await fetch("/api/employees", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, name: newName.trim() || undefined }),
    });
    const result = (await response.json().catch(() => ({}))) as { ok?: boolean; error?: string };
    setAdding(false);
    if (!response.ok || !result.ok) {
      setAddStatus(result.error ?? "Couldn't add that person.");
      return;
    }
    setNewEmail("");
    setNewName("");
    setAddStatus(`${email} added.`);
    load(search, page);
  }

  return (
    <Card className="mt-[9px]">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h2 className="section-title">Employee directory</h2>
          <p className="mt-1 secondary-text">
            {total} total, {activeCount} shown active. Search, deactivate, or reactivate people here.
          </p>
          {!loading && justImportedCount > 0 && total === 0 ? (
            <p className="mt-1.5 text-[12.5px] font-medium text-[var(--red)]">
              Just imported {justImportedCount} people, but they&apos;re not showing up here yet — try reloading the page. If they
              still don&apos;t appear, this is a bug, not an empty directory.
            </p>
          ) : null}
        </div>
        <div className="relative">
          <Search size={14} strokeWidth={1.8} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ink-faint)]" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search name, email, or team"
            aria-label="Search name, email, or team"
            className="admin-input h-9 w-full pl-8 sm:w-64"
          />
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2 rounded-[var(--radius-card)] border border-dashed border-[var(--border)] bg-[var(--bg)] p-3">
        <input
          value={newEmail}
          onChange={(event) => setNewEmail(event.target.value)}
          placeholder="new.person@company.com"
          aria-label="New person's email"
          className="admin-input h-9 min-w-0 flex-1"
        />
        <input
          value={newName}
          onChange={(event) => setNewName(event.target.value)}
          placeholder="Name (optional)"
          aria-label="New person's name (optional)"
          className="admin-input h-9 min-w-0 flex-1"
        />
        <button onClick={addPerson} disabled={adding || !newEmail.trim()} className="btn-primary h-9 shrink-0">
          <Plus size={13} strokeWidth={1.8} />
          {adding ? "Adding..." : "Add person"}
        </button>
        {addStatus ? <p className="w-full secondary-text font-medium">{addStatus}</p> : null}
      </div>

      <div className="mt-4 max-h-96 overflow-auto rounded-[var(--radius-card)] border border-[var(--border)] bg-white">
        {loading ? (
          <>
            <SkeletonRow />
            <SkeletonRow />
            <SkeletonRow />
          </>
        ) : employees.length === 0 ? (
          <p className="p-4 secondary-text">No employees match this search.</p>
        ) : (
          employees.map((employee) => (
            <div key={employee.id} className="grid grid-cols-[1fr_auto] items-center gap-3 border-b border-[var(--border)] p-3 text-[13px] last:border-b-0">
              <div className="flex items-center gap-3">
                <Avatar label={employee.name || employee.email} />
                <div>
                  <div className="font-medium text-[var(--ink)]">{employee.name || employee.email}</div>
                  <div className="text-[var(--ink-mid)]">
                    {employee.email}
                    {employee.team ? ` · ${employee.team}` : ""}
                    {employee.location ? ` · ${employee.location}` : ""}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`rounded-[var(--radius-pill)] border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.06em] ${
                    employee.employmentStatus === "active"
                      ? "border-[var(--green-border)] bg-[var(--green-bg)] text-[var(--green)]"
                      : "border-[var(--border)] bg-[var(--bg-active)] text-[var(--ink-mid)]"
                  }`}
                >
                  {employee.employmentStatus}
                </span>
                <button onClick={() => toggleStatus(employee)} disabled={updatingId === employee.id} className="btn-secondary px-3 py-1.5 text-xs">
                  {employee.employmentStatus === "active" ? "Deactivate" : "Reactivate"}
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {!loading && total > PAGE_SIZE ? (
        <div className="mt-3 flex items-center justify-between text-[12.5px] text-[var(--ink-mid)]">
          <span>
            {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} of {total}
          </span>
          <div className="flex gap-2">
            <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0} className="btn-secondary px-3 py-1.5 text-xs">
              Previous
            </button>
            <button
              onClick={() => setPage((p) => ((p + 1) * PAGE_SIZE < total ? p + 1 : p))}
              disabled={(page + 1) * PAGE_SIZE >= total}
              className="btn-secondary px-3 py-1.5 text-xs"
            >
              Next
            </button>
          </div>
        </div>
      ) : null}
    </Card>
  );
}
