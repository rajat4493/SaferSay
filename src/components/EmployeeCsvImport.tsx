"use client";

import { useMemo, useState } from "react";
import { Upload, FileCheck2 } from "lucide-react";
import { parseEmployeeCsv } from "@/lib/csvEmployees";

const sampleCsv = `email,name,team,location
alex@company.com,Alex Morgan,Operations,London
jamie@company.com,Jamie Shah,Product,London
priya@company.com,Priya Mehta,Sales,Manchester
sam@company.com,Sam Taylor,Engineering,Bristol
lee@company.com,Lee Chen,Customer Success,Remote`;

export function EmployeeCsvImport() {
  const [csv, setCsv] = useState("");
  const [fileName, setFileName] = useState("");
  const [status, setStatus] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const preview = useMemo(() => parseEmployeeCsv(csv), [csv]);
  const canImport = csv.length > 0 && preview.errors.length === 0 && preview.employees.length > 0;

  async function loadFile(file: File | undefined) {
    if (!file) return;
    setFileName(file.name);
    setStatus("");
    setCsv(await file.text());
  }

  async function importEmployees() {
    setSubmitting(true);
    setStatus("");
    const response = await fetch("/api/employees/import", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ csv }),
    });
    const result = (await response.json().catch(() => ({}))) as { imported?: number; error?: string; errors?: string[] };
    setSubmitting(false);
    if (!response.ok) {
      setStatus(result.errors?.[0] ?? result.error ?? "Import failed.");
      return;
    }
    setStatus(`${result.imported ?? 0} employees imported into the secure identity store.`);
  }

  function useSampleCsv() {
    setCsv(sampleCsv);
    setFileName("sample-employees.csv");
    setStatus("");
  }

  return (
    <div className="mt-5 rounded-3xl border border-[var(--brand-border)] bg-white/75 p-5">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-[var(--brand-accent-soft)] px-3 py-1 text-xs font-semibold text-[var(--brand-accent)]">
            <Upload size={14} />
            CSV import
          </div>
          <h2 className="mt-3 text-xl font-semibold">Load employees</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--brand-muted)]">Use columns: email, name, team, location.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={useSampleCsv} className="inline-flex h-11 items-center justify-center rounded-full border border-[var(--brand-border)] bg-white px-5 text-sm font-semibold">
            Use sample CSV
          </button>
          <label className="inline-flex h-11 cursor-pointer items-center justify-center rounded-full bg-[var(--brand-ink)] px-5 text-sm font-semibold text-white">
            Choose CSV
            <input type="file" accept=".csv,text/csv" onChange={(event) => loadFile(event.target.files?.[0])} className="hidden" />
          </label>
        </div>
      </div>

      {fileName ? (
        <div className="mt-4 flex items-center gap-2 text-sm font-semibold text-[var(--brand-muted)]">
          <FileCheck2 size={16} />
          {fileName}
        </div>
      ) : null}

      {csv ? (
        <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_220px]">
          <div className="overflow-hidden rounded-2xl border border-[var(--brand-border)] bg-white">
            <div className="grid grid-cols-4 gap-3 border-b border-[var(--brand-border)] bg-[var(--brand-bg)] p-3 text-xs font-semibold uppercase text-[var(--brand-muted)]">
              <span>Email</span>
              <span>Name</span>
              <span>Team</span>
              <span>Location</span>
            </div>
            {preview.employees.slice(0, 6).map((employee) => (
              <div key={employee.email} className="grid grid-cols-4 gap-3 border-b border-[var(--brand-border)] p-3 text-sm last:border-b-0">
                <span className="truncate font-semibold">{employee.email}</span>
                <span className="truncate text-[var(--brand-muted)]">{employee.name ?? "-"}</span>
                <span className="truncate text-[var(--brand-muted)]">{employee.team ?? "-"}</span>
                <span className="truncate text-[var(--brand-muted)]">{employee.location ?? "-"}</span>
              </div>
            ))}
          </div>
          <div className="rounded-2xl border border-[var(--brand-border)] bg-[var(--brand-bg)] p-4">
            <div className="text-3xl font-semibold">{preview.employees.length}</div>
            <p className="text-sm text-[var(--brand-muted)]">valid employees</p>
            {preview.errors.length > 0 ? (
              <div className="mt-3 space-y-2 text-sm font-semibold text-[#9a392d]">
                {preview.errors.slice(0, 4).map((error) => <p key={error}>{error}</p>)}
              </div>
            ) : null}
            <button
              disabled={!canImport || submitting}
              onClick={importEmployees}
              className="mt-4 w-full rounded-full bg-[var(--brand-accent)] px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-[#b8b0a6]"
            >
              {submitting ? "Importing..." : "Import"}
            </button>
            {status ? <p className="mt-3 text-sm font-semibold text-[var(--brand-muted)]">{status}</p> : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
