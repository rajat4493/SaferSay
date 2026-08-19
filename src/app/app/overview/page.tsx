"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AppShell, Card } from "@/components/AppShell";

type ReportRow = { questionId: string; label?: string; construct?: string | null; n: number; average: number | null };
type ReportResponse = {
  ok?: boolean;
  cycle?: { id: string; name: string; minGroupSize: number } | null;
  report?: { protected: boolean; n: number; rows: ReportRow[] };
};

type Cycle = { id: string; name: string; status: string; responseCount: number; minGroupSize: number };

function scoreColor(average: number) {
  if (average >= 7.5) return "var(--green)";
  if (average >= 5.5) return "#d9a441";
  return "var(--red)";
}

export default function OverviewPage() {
  const [report, setReport] = useState<ReportResponse | null>(null);
  const [employeeCount, setEmployeeCount] = useState<number | null>(null);
  const [cycles, setCycles] = useState<Cycle[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/report").then((r) => r.json()),
      fetch("/api/employees?limit=1").then((r) => r.json()),
      fetch("/api/cycles").then((r) => r.json()),
    ])
      .then(([reportResult, employeesResult, cyclesResult]) => {
        setReport(reportResult);
        setEmployeeCount(employeesResult.ok ? (employeesResult.total ?? 0) : null);
        setCycles(cyclesResult.ok ? (cyclesResult.cycles ?? []) : []);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <AppShell title="Overview" subtitle="A company-wide read on how things stand.">
        <div className="h-40" />
      </AppShell>
    );
  }

  const rows = report?.report && !report.report.protected ? report.report.rows : [];
  const scored = rows.filter((row) => row.average !== null) as Array<ReportRow & { average: number }>;
  const strengths = [...scored].sort((a, b) => b.average - a.average).slice(0, 3);
  const priorities = [...scored].sort((a, b) => a.average - b.average).slice(0, 3);

  const byConstruct = new Map<string, { total: number; count: number }>();
  for (const row of scored) {
    const key = row.construct?.trim() || "Other";
    const entry = byConstruct.get(key) ?? { total: 0, count: 0 };
    entry.total += row.average;
    entry.count += 1;
    byConstruct.set(key, entry);
  }
  const heatmap = Array.from(byConstruct.entries())
    .map(([construct, { total, count }]) => ({ construct, average: total / count, questionCount: count }))
    .sort((a, b) => b.average - a.average);

  const latestOpenOrRecent = cycles?.find((c) => c.status === "open") ?? cycles?.[0] ?? null;
  const responseRate =
    latestOpenOrRecent && employeeCount ? Math.round((latestOpenOrRecent.responseCount / employeeCount) * 100) : null;

  const isProtected = !report?.report || report.report.protected;

  return (
    <AppShell title="Overview" subtitle="A company-wide read on how things stand.">
      {isProtected ? (
        <Card>
          <p className="secondary-text">
            {report?.cycle
              ? "Not enough responses yet to show a company-wide breakdown without risking identifying someone."
              : "No survey results yet. Once a cycle collects enough responses, they'll show up here."}
          </p>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-3">
          <Card>
            <h2 className="section-title text-[15px]">Response rate</h2>
            <p className="mt-2 text-[28px] font-semibold text-[var(--ink)]">{responseRate !== null ? `${responseRate}%` : "—"}</p>
            <p className="mt-1 secondary-text">
              {latestOpenOrRecent ? `${latestOpenOrRecent.responseCount} of ${employeeCount ?? "?"} eligible` : "No survey yet"}
            </p>
          </Card>

          <Card>
            <h2 className="section-title text-[15px]">Top strengths</h2>
            <ol className="mt-2 space-y-1.5">
              {strengths.map((row) => (
                <li key={row.questionId} className="flex items-center justify-between gap-2 text-[13px]">
                  <span className="min-w-0 truncate text-[var(--ink)]">{row.label}</span>
                  <span className="font-semibold" style={{ color: scoreColor(row.average) }}>
                    {row.average.toFixed(1)}
                  </span>
                </li>
              ))}
              {strengths.length === 0 ? <li className="secondary-text">No data yet.</li> : null}
            </ol>
          </Card>

          <Card>
            <h2 className="section-title text-[15px]">Top priorities</h2>
            <ol className="mt-2 space-y-1.5">
              {priorities.map((row) => (
                <li key={row.questionId} className="flex items-center justify-between gap-2 text-[13px]">
                  <span className="min-w-0 truncate text-[var(--ink)]">{row.label}</span>
                  <span className="font-semibold" style={{ color: scoreColor(row.average) }}>
                    {row.average.toFixed(1)}
                  </span>
                </li>
              ))}
              {priorities.length === 0 ? <li className="secondary-text">No data yet.</li> : null}
            </ol>
          </Card>
        </div>
      )}

      {!isProtected && heatmap.length > 0 ? (
        <Card className="mt-3">
          <h2 className="section-title text-[15px]">Theme heatmap</h2>
          <p className="mt-1 secondary-text">Average score per theme, across this cycle&apos;s questions.</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {heatmap.map((item) => (
              <div key={item.construct} className="rounded-[var(--radius-card)] border border-[var(--border)] p-3">
                <div className="text-[12px] font-medium uppercase tracking-[0.04em] text-[var(--ink-mid)]">{item.construct}</div>
                <div className="mt-1 text-[22px] font-semibold" style={{ color: scoreColor(item.average) }}>
                  {item.average.toFixed(1)}
                </div>
                <div className="text-[11px] text-[var(--ink-faint)]">
                  {item.questionCount} question{item.questionCount === 1 ? "" : "s"}
                </div>
              </div>
            ))}
          </div>
        </Card>
      ) : null}

      {report?.cycle ? (
        <p className="mt-4 secondary-text">
          Showing results from <Link href={`/app/${report.cycle.id}/results`} className="font-medium text-[var(--ink)] underline">{report.cycle.name}</Link>.
        </p>
      ) : null}
    </AppShell>
  );
}
