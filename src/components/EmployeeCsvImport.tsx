"use client";

import { useMemo, useState } from "react";
import { FileCheck2 } from "lucide-react";
import { parseEmployeeCsv } from "@/lib/csvEmployees";

const sampleCsv = `email,name,team,location
alex@company.com,Alex Morgan,Operations,London
jamie@company.com,Jamie Shah,Product,London
priya@company.com,Priya Mehta,Sales,Manchester
sam@company.com,Sam Taylor,Engineering,Bristol
lee@company.com,Lee Chen,Customer Success,Remote`;

export function EmployeeCsvImport({ onImported }: { onImported?: (count: number) => void } = {}) {
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
    setStatus(`${result.imported ?? 0} employees imported.`);
    onImported?.(result.imported ?? 0);
  }

  function useSampleCsv() {
    setCsv(sampleCsv);
    setFileName("sample-employees.csv");
    setStatus("");
  }

  return (
    <div className="card mt-[9px]">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <p className="meta-label">CSV import</p>
          <h2 className="section-title mt-2">Load employees</h2>
          <p className="mt-1.5 secondary-text">Use columns: email, name, team, location.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={useSampleCsv} className="btn-secondary">
            Use sample CSV
          </button>
          <label className="btn-primary cursor-pointer">
            Choose CSV
            <input type="file" accept=".csv,text/csv" onChange={(event) => loadFile(event.target.files?.[0])} className="hidden" />
          </label>
        </div>
      </div>

      {fileName ? (
        <div className="mt-4 flex items-center gap-2 secondary-text font-medium">
          <FileCheck2 size={15} strokeWidth={1.8} />
          {fileName}
        </div>
      ) : null}

      {csv ? (
        <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_220px]">
          <div className="overflow-hidden rounded-[var(--radius-card)] border border-[var(--border)] bg-white">
            <div className="grid grid-cols-4 gap-3 border-b border-[var(--border)] bg-[var(--bg)] p-3 meta-label">
              <span>Email</span>
              <span>Name</span>
              <span>Team</span>
              <span>Location</span>
            </div>
            {preview.employees.slice(0, 6).map((employee) => (
              <div key={employee.email} className="grid grid-cols-4 gap-3 border-b border-[var(--border)] p-3 text-[13px] last:border-b-0">
                <span className="truncate font-medium text-[var(--ink)]">{employee.email}</span>
                <span className="truncate text-[var(--ink-mid)]">{employee.name ?? "-"}</span>
                <span className="truncate text-[var(--ink-mid)]">{employee.team ?? "-"}</span>
                <span className="truncate text-[var(--ink-mid)]">{employee.location ?? "-"}</span>
              </div>
            ))}
          </div>
          <div className="rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--bg)] p-4">
            <div className="data-number">{preview.employees.length}</div>
            <p className="secondary-text">valid employees</p>
            {preview.errors.length > 0 ? (
              <div className="mt-3 space-y-2 text-[13px] font-medium text-[var(--red)]">
                {preview.errors.slice(0, 4).map((error) => (
                  <p key={error}>{error}</p>
                ))}
              </div>
            ) : null}
            <button disabled={!canImport || submitting} onClick={importEmployees} className="btn-primary mt-4 w-full">
              {submitting ? "Importing..." : "Import"}
            </button>
            {status ? <p className="mt-3 secondary-text font-medium">{status}</p> : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
