"use client";

import { useCallback, useEffect, useState } from "react";
import { Search } from "lucide-react";
import { Card } from "@/components/AppShell";

type Employee = {
  id: string;
  email: string;
  name: string | null;
  team: string | null;
  location: string | null;
  employmentStatus: string;
};

export function EmployeeDirectory({ refreshKey = 0 }: { refreshKey?: number }) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState("");

  const load = useCallback(async (searchValue: string) => {
    setLoading(true);
    const params = new URLSearchParams({ limit: "50" });
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
    const timeout = setTimeout(() => load(search), 250);
    return () => clearTimeout(timeout);
  }, [search, load, refreshKey]);

  async function toggleStatus(employee: Employee) {
    const nextStatus = employee.employmentStatus === "active" ? "inactive" : "active";
    setUpdatingId(employee.id);
    await fetch(`/api/employees/${employee.id}/status`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status: nextStatus }),
    });
    await load(search);
    setUpdatingId("");
  }

  const activeCount = employees.filter((e) => e.employmentStatus === "active").length;

  return (
    <Card className="mt-4">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-xl font-semibold">Employee directory</h2>
          <p className="mt-1 text-sm text-[var(--brand-muted)]">
            {total} total, {activeCount} shown active. Search, deactivate, or reactivate people here.
          </p>
        </div>
        <div className="relative">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--brand-muted)]" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search name, email, or team"
            className="h-10 w-full rounded-[var(--radius-pill)] border border-[var(--brand-border)] bg-white pl-9 pr-4 text-sm outline-none focus:border-[var(--brand-accent)] sm:w-64"
          />
        </div>
      </div>

      <div className="mt-4 max-h-96 overflow-auto rounded-2xl border border-[var(--brand-border)] bg-white">
        {loading ? (
          <p className="p-4 text-sm font-semibold text-[var(--brand-muted)]">Loading...</p>
        ) : employees.length === 0 ? (
          <p className="p-4 text-sm text-[var(--brand-muted)]">No employees match this search.</p>
        ) : (
          employees.map((employee) => (
            <div
              key={employee.id}
              className="grid grid-cols-[1fr_auto] items-center gap-3 border-b border-[var(--brand-border)] p-3 text-sm last:border-b-0"
            >
              <div>
                <div className="font-semibold">{employee.name || employee.email}</div>
                <div className="text-[var(--brand-muted)]">
                  {employee.email}
                  {employee.team ? ` · ${employee.team}` : ""}
                  {employee.location ? ` · ${employee.location}` : ""}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`rounded-[var(--radius-pill)] px-2.5 py-1 text-xs font-semibold ${
                    employee.employmentStatus === "active"
                      ? "bg-[var(--brand-accent-soft)] text-[var(--brand-accent)]"
                      : "bg-[var(--brand-border)] text-[var(--brand-muted)]"
                  }`}
                >
                  {employee.employmentStatus}
                </span>
                <button
                  onClick={() => toggleStatus(employee)}
                  disabled={updatingId === employee.id}
                  className="rounded-[var(--radius-pill)] border border-[var(--brand-border)] bg-white px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
                >
                  {employee.employmentStatus === "active" ? "Deactivate" : "Reactivate"}
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </Card>
  );
}
