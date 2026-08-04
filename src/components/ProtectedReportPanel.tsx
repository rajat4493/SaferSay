"use client";

import { useEffect, useState, useTransition } from "react";
import { EyeOff, RefreshCw } from "lucide-react";
import { Card } from "@/components/AppShell";
import { ViewerCard } from "@/components/ViewerShell";

type ReportResponse = {
  ok?: boolean;
  error?: string;
  cycle?: { id: string; name: string; minGroupSize: number } | null;
  report?: {
    protected: boolean;
    n: number;
    rows: Array<{ questionId: string; label?: string; n: number; average: number | null }>;
  };
};

export function ProtectedReportPanel({ mode = "admin" }: { mode?: "admin" | "viewer" }) {
  const [result, setResult] = useState<ReportResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [, startTransition] = useTransition();
  const ShellCard = mode === "viewer" ? ViewerCard : Card;

  async function loadReport() {
    setLoading(true);
    const response = await fetch("/api/report");
    setResult((await response.json().catch(() => ({ ok: false, error: "Report could not be loaded." }))) as ReportResponse);
    setLoading(false);
  }

  useEffect(() => {
    startTransition(() => {
      loadReport();
    });
  }, []);

  const report = result?.report;
  const minGroupSize = result?.cycle?.minGroupSize ?? 5;

  return (
    <>
      <div className="grid gap-4 lg:grid-cols-3">
        <ShellCard><h2 className="text-5xl font-semibold tracking-[-0.03em]">{report?.n ?? 0}</h2><p className="mt-1 text-sm text-[var(--brand-muted)]">Responses</p></ShellCard>
        <ShellCard><h2 className="text-5xl font-semibold tracking-[-0.03em]">{minGroupSize}</h2><p className="mt-1 text-sm text-[var(--brand-muted)]">Minimum group size</p></ShellCard>
        <div
          className={`rounded-[var(--radius-card)] p-5 shadow-[var(--shadow-soft)] ${
            report?.protected
              ? "border border-[var(--brand-border)] bg-[var(--brand-surface)]"
              : "bg-[var(--brand-ink)] text-white"
          }`}
        >
          <h2 className="text-5xl font-semibold tracking-[-0.03em]">{report?.protected ? "Protected" : "Unlocked"}</h2>
          <p className={`mt-1 text-sm ${report?.protected ? "text-[var(--brand-muted)]" : "text-white/60"}`}>Report state</p>
        </div>
      </div>

      <ShellCard>
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold">{result?.cycle?.name ?? "Latest survey report"}</h2>
            <p className="mt-1 text-sm text-[var(--brand-muted)]">Supabase-backed aggregate report. No participant list, emails, or token state.</p>
          </div>
          <button onClick={loadReport} className="inline-flex items-center gap-2 rounded-full border border-[var(--brand-border)] bg-white px-4 py-2 text-sm font-semibold">
            <RefreshCw size={14} />
            Refresh
          </button>
        </div>

        {loading ? (
          <p className="text-sm font-semibold text-[var(--brand-muted)]">Loading protected report...</p>
        ) : result?.error ? (
          <p className="text-sm font-semibold text-[#9a392d]">{result.error}</p>
        ) : !report || report.protected ? (
          <div>
            <div className="flex items-center gap-2 font-semibold text-[var(--brand-accent)]"><EyeOff size={18} /> Results hidden</div>
            <p className="mt-2 text-sm leading-6 text-[var(--brand-muted)]">The report will unlock only after at least {minGroupSize} submissions exist.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {report.rows.map((row) => {
              const value = row.average ?? 0;
              const width = `${Math.min(100, Math.max(0, (value / 5) * 100))}%`;
              return (
                <div key={row.questionId}>
                  <div className="mb-2 flex justify-between gap-4 text-sm">
                    <span>{row.label ?? row.questionId}</span>
                    <span className="font-semibold">{value.toFixed(2)}</span>
                  </div>
                  <div className="h-2 rounded-full bg-[var(--brand-border)]"><div className="h-full rounded-full bg-[var(--brand-accent)]" style={{ width }} /></div>
                </div>
              );
            })}
          </div>
        )}
      </ShellCard>
    </>
  );
}
