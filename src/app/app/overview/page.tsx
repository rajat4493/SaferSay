"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { AppShell, Card } from "@/components/AppShell";
import { RingStat } from "@/components/RingStat";
import { Sparkline } from "@/components/Sparkline";
import { groupByConstruct, overallAverage10 } from "@/lib/reportThemes";
import { titleCaseTeam } from "@/lib/textFormat";

type ReportRow = { questionId: string; label?: string; construct?: string | null; n: number; average: number | null; scaleMax?: 5 | 10 };
type EnpsRow = { questionId: string; label?: string; n: number; promoterPct: number; passivePct: number; detractorPct: number; score: number };
type ReportResponse = {
  ok?: boolean;
  tenant?: { id: string; name: string; slug: string };
  cycle?: { id: string; name: string; minGroupSize: number } | null;
  report?: { protected: boolean; n: number; rows: ReportRow[] };
  enps?: { protected: boolean; n: number; rows: EnpsRow[] };
};

type Cycle = { id: string; name: string; status: string; responseCount: number; minGroupSize: number };

type TrendPoint = { cycleId: string; cycleName: string; cycleCreatedAt: string; n: number; average: number | null; protected: boolean; scaleMax?: 5 | 10 };
type TrendResponse = { ok?: boolean; questions?: Array<{ questionText: string; points: TrendPoint[] }> };

function scoreColor(average: number) {
  if (average >= 7.5) return "var(--green)";
  if (average >= 5.5) return "var(--warning)";
  return "var(--red)";
}

/**
 * One overall-score-per-cycle series, derived client-side from the
 * existing per-question cross-cycle trend endpoint (no new endpoint --
 * see reportThemes.ts's overallAverage10 for the same normalize-then-
 * average approach applied to a single cycle's rows). Each cycle's value
 * is the average, across every question released for that cycle, of the
 * question's answer normalized to a common 0-10 scale via scaleMax -- so
 * a cycle mixing likert_5 and enps_0_10 questions (e.g. the eNPS Pulse
 * template) isn't skewed by averaging raw un-normalized scores together.
 */
function overallScoreByCycle(questions: Array<{ points: TrendPoint[] }>): Array<{ cycleId: string; cycleName: string; value: number }> {
  const byCycle = new Map<string, { cycleName: string; total: number; count: number }>();
  for (const question of questions) {
    for (const point of question.points) {
      if (point.protected || point.average === null) continue;
      const normalized = (point.average / (point.scaleMax ?? 5)) * 10;
      const entry = byCycle.get(point.cycleId) ?? { cycleName: point.cycleName, total: 0, count: 0 };
      entry.total += normalized;
      entry.count += 1;
      byCycle.set(point.cycleId, entry);
    }
  }
  return Array.from(byCycle.entries())
    .map(([cycleId, { cycleName, total, count }]) => ({ cycleId, cycleName, value: total / count }))
    .sort((a, b) => {
      // Points already arrive oldest-first per question; recover that
      // order at the cycle level from the first question with >1 point.
      const reference = questions.find((q) => q.points.length > 1);
      if (!reference) return 0;
      const order = new Map(reference.points.map((p, index) => [p.cycleId, index]));
      return (order.get(a.cycleId) ?? 0) - (order.get(b.cycleId) ?? 0);
    });
}

export default function OverviewPage() {
  const [report, setReport] = useState<ReportResponse | null>(null);
  const [employeeCount, setEmployeeCount] = useState<number | null>(null);
  const [cycles, setCycles] = useState<Cycle[] | null>(null);
  const [trend, setTrend] = useState<TrendResponse | null>(null);
  const [departments, setDepartments] = useState<string[]>([]);
  const [selectedDepartment, setSelectedDepartment] = useState("");
  const [loading, setLoading] = useState(true);
  const [, startTransition] = useTransition();

  useEffect(() => {
    Promise.all([
      fetch("/api/employees?limit=1").then((r) => r.json()),
      fetch("/api/cycles").then((r) => r.json()),
      fetch("/api/report/trend").then((r) => r.json()),
    ]).then(([employeesResult, cyclesResult, trendResult]) => {
      setEmployeeCount(employeesResult.ok ? (employeesResult.total ?? 0) : null);
      setCycles(cyclesResult.ok ? (cyclesResult.cycles ?? []) : []);
      setTrend(trendResult.ok ? trendResult : { questions: [] });
    });
  }, []);

  useEffect(() => {
    startTransition(() => {
      setLoading(true);
    });
    const params = new URLSearchParams();
    if (selectedDepartment) params.set("department", selectedDepartment);
    const url = params.toString() ? `/api/report?${params.toString()}` : "/api/report";
    fetch(url)
      .then((r) => r.json())
      .then((data: ReportResponse) => {
        setReport(data);
        setLoading(false);
        if (data.cycle?.id) {
          fetch(`/api/report/departments?cycleId=${encodeURIComponent(data.cycle.id)}`)
            .then((r) => r.json())
            .then((deptData: { ok?: boolean; departments?: string[] }) => {
              if (deptData.ok) setDepartments(deptData.departments ?? []);
            })
            .catch(() => undefined);
        }
      })
      .catch(() => setLoading(false));
  }, [selectedDepartment]);

  if (loading && !report) {
    return (
      <AppShell title="Overview" subtitle="A company-wide read on how things stand.">
        <div className="h-40" />
      </AppShell>
    );
  }

  const rows = report?.report && !report.report.protected ? report.report.rows : [];
  // Normalized to /10 (like the score tile and theme heatmap) so a
  // likert_5 question at its max and an enps_0_10 question don't show
  // inconsistent-looking numbers side by side on the same dashboard.
  const scored = rows
    .filter((row) => row.average !== null)
    .map((row) => ({ ...row, average10: (row.average! / (row.scaleMax ?? 5)) * 10 }));
  const strengths = [...scored].sort((a, b) => b.average10 - a.average10).slice(0, 3);
  const priorities = [...scored].sort((a, b) => a.average10 - b.average10).slice(0, 3);

  const overallScore = overallAverage10(rows);
  const themeGroups = groupByConstruct(rows);

  const enpsRow = report?.enps && !report.enps.protected ? report.enps.rows[0] : null;

  const latestOpenOrRecent = cycles?.find((c) => c.status === "open") ?? cycles?.[0] ?? null;
  const responseRate =
    latestOpenOrRecent && employeeCount ? Math.round((latestOpenOrRecent.responseCount / employeeCount) * 100) : null;

  const overallByCycle = overallScoreByCycle(trend?.questions ?? []);
  const trendDelta =
    overallByCycle.length >= 2 ? overallByCycle[overallByCycle.length - 1].value - overallByCycle[overallByCycle.length - 2].value : null;

  const isProtected = !report?.report || report.report.protected;

  return (
    <AppShell
      title="Overview"
      subtitle="A company-wide read on how things stand."
      headerActions={
        departments.length > 0 ? (
          <select
            value={selectedDepartment}
            onChange={(event) => setSelectedDepartment(event.target.value)}
            className="pill-select"
            title="Team-level results still respect the anonymity threshold -- some views may not be available yet."
          >
            <option value="">All of {report?.tenant?.name ?? "Company"}</option>
            {departments.map((department) => (
              <option key={department} value={department}>
                {titleCaseTeam(department)}
              </option>
            ))}
          </select>
        ) : null
      }
    >
      {isProtected ? (
        <Card>
          <p className="secondary-text">
            {report?.cycle
              ? "Not enough responses yet to show a company-wide breakdown without risking identifying someone."
              : "No survey results yet. Once a cycle collects enough responses, they'll show up here."}
          </p>
        </Card>
      ) : (
        <>
          <div className="grid gap-3 md:grid-cols-4">
            <Card>
              <h2 className="section-title text-[15px]">Overall score</h2>
              <p className="mt-2 text-[36px] font-semibold leading-none" style={{ color: overallScore !== null ? scoreColor(overallScore) : "var(--ink)" }}>
                {overallScore !== null ? overallScore.toFixed(1) : "—"}
              </p>
              <p className="mt-1 secondary-text">out of 10</p>
              {enpsRow ? (
                <div className="mt-3 border-t border-[var(--border-soft)] pt-3">
                  <div className="flex items-baseline justify-between text-[12px]">
                    <span className="text-[var(--ink-mid)]">eNPS (company-wide)</span>
                    <span className="font-semibold text-[var(--ink)]">{Math.round(enpsRow.score)}</span>
                  </div>
                  <div className="mt-1.5 flex h-[6px] overflow-hidden rounded-[var(--radius-pill)] bg-[var(--bg-active)]">
                    <div className="h-full bg-[var(--enps-promoter)]" style={{ width: `${enpsRow.promoterPct}%` }} />
                    <div className="h-full bg-[var(--enps-passive)]" style={{ width: `${enpsRow.passivePct}%` }} />
                    <div className="h-full bg-[var(--enps-detractor)]" style={{ width: `${enpsRow.detractorPct}%` }} />
                  </div>
                </div>
              ) : null}
            </Card>

            <Card className="flex flex-col items-center justify-center">
              <h2 className="section-title self-start text-[15px]">Response rate</h2>
              <RingStat
                ratio={responseRate !== null ? responseRate / 100 : 0}
                color="var(--green)"
                centerLabel={responseRate !== null ? `${responseRate}%` : "—"}
                subLabel="responded"
                size={120}
              />
              <p className="secondary-text">
                {latestOpenOrRecent ? `${latestOpenOrRecent.responseCount} of ${employeeCount ?? "?"} eligible` : "No survey yet"}
              </p>
            </Card>

            <Card>
              <h2 className="section-title text-[15px]">Change vs last survey (company-wide)</h2>
              {overallByCycle.length >= 2 ? (
                <>
                  <p className="mt-2 text-[28px] font-semibold" style={{ color: (trendDelta ?? 0) >= 0 ? "var(--green)" : "var(--red)" }}>
                    {(trendDelta ?? 0) >= 0 ? "+" : ""}
                    {trendDelta!.toFixed(1)}
                  </p>
                  <Sparkline points={overallByCycle.map((point) => point.value)} color="var(--ink-mid)" />
                </>
              ) : (
                <p className="mt-2 secondary-text">Needs a second survey cycle to show a trend.</p>
              )}
            </Card>

            <Card>
              <h2 className="section-title text-[15px]">About this view</h2>
              <dl className="mt-2 space-y-1.5 text-[13px]">
                <div className="flex justify-between gap-2">
                  <dt className="text-[var(--ink-mid)]">Scope</dt>
                  <dd className="text-right font-medium text-[var(--ink)]">{selectedDepartment ? titleCaseTeam(selectedDepartment) : `All of ${report?.tenant?.name ?? "company"}`}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-[var(--ink-mid)]">Eligible employees</dt>
                  <dd className="font-medium text-[var(--ink)]">{employeeCount ?? "—"}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-[var(--ink-mid)]">Responses</dt>
                  <dd className="font-medium text-[var(--ink)]">{report?.report && !report.report.protected ? report.report.n : "—"}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-[var(--ink-mid)]">Survey</dt>
                  <dd className="text-right font-medium text-[var(--ink)]">{report?.cycle?.name ?? "—"}</dd>
                </div>
              </dl>
            </Card>
          </div>

          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <Card>
              <h2 className="section-title text-[15px]">Top strengths</h2>
              <ol className="mt-2 space-y-1.5">
                {strengths.map((row) => (
                  <li key={row.questionId} className="flex items-center justify-between gap-2 text-[13px]">
                    <span className="min-w-0 truncate text-[var(--ink)]">{row.label}</span>
                    <span className="font-semibold" style={{ color: scoreColor(row.average10) }}>
                      {row.average10.toFixed(1)}
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
                    <span className="font-semibold" style={{ color: scoreColor(row.average10) }}>
                      {row.average10.toFixed(1)}
                    </span>
                  </li>
                ))}
                {priorities.length === 0 ? <li className="secondary-text">No data yet.</li> : null}
              </ol>
            </Card>
          </div>
        </>
      )}

      {!isProtected && themeGroups.length > 0 ? (
        <Card className="mt-3">
          <h2 className="section-title text-[15px]">Theme heatmap</h2>
          <p className="mt-1 secondary-text">Each theme&apos;s score, and how it compares to this survey&apos;s own overall score.</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {themeGroups.map((group) => {
              const delta = overallScore !== null ? group.average10 - overallScore : null;
              return (
                <div key={group.construct} className="rounded-[var(--radius-card)] border border-[var(--border)] p-3">
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: scoreColor(group.average10) }} aria-hidden="true" />
                    <span className="text-[12px] font-medium uppercase tracking-[0.04em] text-[var(--ink-mid)]">{group.construct}</span>
                  </div>
                  <div className="mt-1 flex items-baseline gap-2">
                    <span className="text-[22px] font-semibold" style={{ color: scoreColor(group.average10) }}>
                      {group.average10.toFixed(1)}
                    </span>
                    {delta !== null ? (
                      <span className={`text-[11px] font-medium ${delta >= 0 ? "text-[var(--green)]" : "text-[var(--red)]"}`}>
                        {delta >= 0 ? "+" : ""}
                        {delta.toFixed(1)} vs overall
                      </span>
                    ) : null}
                  </div>
                  <div className="text-[11px] text-[var(--ink-faint)]">
                    {group.questionCount} question{group.questionCount === 1 ? "" : "s"}
                  </div>
                </div>
              );
            })}
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
