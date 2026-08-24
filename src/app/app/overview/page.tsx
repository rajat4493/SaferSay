"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { Circle, Flag, Info, ThumbsUp, TrendingDown, TrendingUp } from "lucide-react";
import { AppShell, Card } from "@/components/AppShell";
import { RingStat } from "@/components/RingStat";
import { Sparkline } from "@/components/Sparkline";
import { groupByConstruct, overallAverage10 } from "@/lib/reportThemes";
import { getScoreTier } from "@/lib/scoreTier";
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

/** Small colored circular badge -- the reference dashboard's recurring
 * icon-in-a-circle motif, reused for strengths/priorities/heatmap tiles.
 * Deliberately generic (never a per-theme-name icon): construct names are
 * open-ended and tenant-defined via the question bank, so there's no safe
 * fixed name->icon mapping -- see the heatmap tile below. */
function IconBadge({ icon: Icon, tier }: { icon: typeof ThumbsUp; tier: ReturnType<typeof getScoreTier> }) {
  return (
    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full" style={{ background: tier.bg }}>
      <Icon size={14} strokeWidth={2} style={{ color: tier.text }} />
    </span>
  );
}

/** A small distinct tag marking a metric that doesn't scope with the
 * page's department picker -- e.g. eNPS and trend are always org-wide.
 * Previously a "(company-wide)" parenthetical in the card title, which
 * read as describing the *selected* scope rather than a fixed exception
 * to it. */
function ScopeExceptionPill({ label }: { label: string }) {
  return (
    <span
      className="rounded-[var(--radius-pill)] px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-[0.03em] text-[var(--ink-mid)]"
      style={{ background: "var(--bg-active)" }}
      title="This figure always reflects the whole company, regardless of the department filter above."
    >
      {label}
    </span>
  );
}

export default function OverviewPage() {
  const [report, setReport] = useState<ReportResponse | null>(null);
  const [employeeCount, setEmployeeCount] = useState<number | null>(null);
  const [cycles, setCycles] = useState<Cycle[] | null>(null);
  const [selectedCycleId, setSelectedCycleId] = useState("");
  const [trend, setTrend] = useState<TrendResponse | null>(null);
  const [departments, setDepartments] = useState<string[]>([]);
  const [selectedDepartment, setSelectedDepartment] = useState("");
  const [scopedEligibleCount, setScopedEligibleCount] = useState<number | null>(null);
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
      if (!selectedDepartment) setScopedEligibleCount(null);
    });
    const params = new URLSearchParams();
    if (selectedCycleId) params.set("cycleId", selectedCycleId);
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

    // Department-scoped eligible-employee count, for a response-rate ring
    // that actually matches the department-scoped response count elsewhere
    // on this page -- without this, the ring silently fell back to the
    // org-wide count/rate while everything else was department-scoped.
    if (selectedDepartment) {
      fetch(`/api/employees?team=${encodeURIComponent(selectedDepartment)}&limit=1`)
        .then((r) => r.json())
        .then((data: { ok?: boolean; total?: number }) => setScopedEligibleCount(data.ok ? (data.total ?? 0) : null))
        .catch(() => setScopedEligibleCount(null));
    }
  }, [selectedCycleId, selectedDepartment]);

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
  // A top-3/bottom-3 ranking implies real differentiation between
  // questions. When scores are tied (or near-tied) or there simply aren't
  // enough scored questions to rank meaningfully, forcing a ranking
  // fabricates distinctions the data doesn't support -- so below this
  // threshold, show an explicit "no distinct strengths/priorities" state
  // instead of an arbitrary top/bottom split of near-identical numbers.
  const scoreSpread = scored.length > 0 ? Math.max(...scored.map((r) => r.average10)) - Math.min(...scored.map((r) => r.average10)) : 0;
  const hasDistinctSpread = scored.length >= 4 && scoreSpread >= 1.0;
  const strengths = hasDistinctSpread ? [...scored].sort((a, b) => b.average10 - a.average10).slice(0, 3) : [];
  const priorities = hasDistinctSpread ? [...scored].sort((a, b) => a.average10 - b.average10).slice(0, 3) : [];

  const overallScore = overallAverage10(rows);
  const overallTier = overallScore !== null ? getScoreTier(overallScore) : null;
  const themeGroups = groupByConstruct(rows);

  // How many of this cycle's questions fall in each score tier -- a
  // compact readout of the *spread* behind the single overall number,
  // derived entirely from already-suppressed rows (no new query).
  const scoreDistribution = {
    strength: scored.filter((row) => getScoreTier(row.average10).tier === "strength").length,
    neutral: scored.filter((row) => getScoreTier(row.average10).tier === "neutral").length,
    priority: scored.filter((row) => getScoreTier(row.average10).tier === "priority").length,
  };

  const enpsRow = report?.enps && !report.enps.protected ? report.enps.rows[0] : null;

  const latestOpenOrRecent = cycles?.find((c) => c.status === "open") ?? cycles?.[0] ?? null;
  // When a department is selected, both the numerator and denominator must be
  // department-scoped -- mixing an org-wide eligible count with a department-
  // scoped response count produced impossible-looking figures (e.g. "12 of 12
  // eligible / 100%" next to "About this view: 6 responses").
  const responseCount = selectedDepartment ? (report?.report?.n ?? null) : (latestOpenOrRecent?.responseCount ?? null);
  const eligibleCount = selectedDepartment ? scopedEligibleCount : employeeCount;
  const responseRate = responseCount !== null && eligibleCount ? Math.round((responseCount / eligibleCount) * 100) : null;

  const overallByCycle = overallScoreByCycle(trend?.questions ?? []);
  const trendDelta =
    overallByCycle.length >= 2 ? overallByCycle[overallByCycle.length - 1].value - overallByCycle[overallByCycle.length - 2].value : null;
  const trendTier = trendDelta !== null ? (trendDelta >= 0 ? getScoreTier(10) : getScoreTier(0)) : null;

  const isProtected = !report?.report || report.report.protected;

  return (
    <AppShell
      title="Overview"
      subtitle="A company-wide read on how things stand."
      headerActions={
        <>
          {cycles && cycles.length > 1 ? (
            <select value={selectedCycleId} onChange={(event) => setSelectedCycleId(event.target.value)} className="pill-select">
              {cycles.map((cycle) => (
                <option key={cycle.id} value={cycle.id}>
                  {cycle.name}
                </option>
              ))}
            </select>
          ) : null}
          {departments.length > 0 ? (
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
          ) : null}
        </>
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
            <Card
              className="border transition-[background-color,border-color] duration-300"
              style={overallTier ? { background: overallTier.bg, borderColor: overallTier.border } : undefined}
            >
              <div className="flex items-center gap-1.5">
                <h2 className="section-title text-[15px]">Overall score</h2>
                <span title="Every scored question this cycle, normalized to a 0-10 scale and averaged.">
                  <Info size={14} strokeWidth={1.8} className="text-[var(--ink-faint)]" />
                </span>
              </div>
              <p className="mt-2 text-[36px] font-semibold leading-none tracking-tight" style={{ color: overallTier?.text ?? "var(--ink)" }}>
                {overallScore !== null ? overallScore.toFixed(1) : "—"}
              </p>
              <p className="mt-1 secondary-text">out of 10</p>
              {scored.length > 0 ? (
                <div
                  className="mt-2.5 flex h-[6px] overflow-hidden rounded-[var(--radius-pill)] bg-[var(--bg-active)]"
                  title={`${scoreDistribution.strength} strength, ${scoreDistribution.neutral} neutral, ${scoreDistribution.priority} priority question${scored.length === 1 ? "" : "s"}`}
                >
                  <div className="h-full bg-[var(--green)]" style={{ width: `${(scoreDistribution.strength / scored.length) * 100}%` }} />
                  <div className="h-full bg-[var(--warning)]" style={{ width: `${(scoreDistribution.neutral / scored.length) * 100}%` }} />
                  <div className="h-full bg-[var(--red)]" style={{ width: `${(scoreDistribution.priority / scored.length) * 100}%` }} />
                </div>
              ) : null}
              {enpsRow ? (
                <div className="mt-3 border-t border-[var(--border-soft)] pt-3">
                  <div className="flex items-baseline justify-between text-[12px]">
                    <span className="flex items-center gap-1.5 text-[var(--ink-mid)]">
                      eNPS <ScopeExceptionPill label="Company-wide" />
                    </span>
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
                {responseCount !== null ? `${responseCount} of ${eligibleCount ?? "?"} eligible` : "No survey yet"}
              </p>
            </Card>

            <Card
              className="border transition-[background-color,border-color] duration-300"
              style={trendTier && overallByCycle.length >= 2 ? { background: trendTier.bg, borderColor: trendTier.border } : undefined}
            >
              <h2 className="flex items-center gap-1.5 section-title text-[15px]">
                Change vs last survey <ScopeExceptionPill label="Company-wide" />
              </h2>
              {overallByCycle.length >= 2 ? (
                <>
                  <p className="mt-2 flex items-center gap-1.5 text-[28px] font-semibold tracking-tight" style={{ color: trendTier?.text }}>
                    {(trendDelta ?? 0) >= 0 ? <TrendingUp size={22} strokeWidth={2} /> : <TrendingDown size={22} strokeWidth={2} />}
                    {(trendDelta ?? 0) >= 0 ? "+" : ""}
                    {trendDelta!.toFixed(1)}
                  </p>
                  <Sparkline points={overallByCycle.map((point) => point.value)} color={trendTier?.text} />
                </>
              ) : (
                <>
                  <p className="mt-2 text-[15px] font-semibold text-[var(--ink)]">Baseline established</p>
                  <p className="mt-0.5 secondary-text">Run your next pulse to see change over time.</p>
                  {/* Faint flat placeholder line -- same viewBox/stroke as
                      Sparkline, dashed and muted, so the empty state reads
                      as "measurement starts here" rather than blank space. */}
                  <svg viewBox="0 0 280 60" className="mt-2 h-14 w-full" aria-hidden="true">
                    <path d="M0,30 L280,30" fill="none" stroke="var(--ink-faint)" strokeWidth={2} strokeDasharray="4 5" strokeLinecap="round" />
                  </svg>
                </>
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
              <ol className="mt-2.5 space-y-2">
                {strengths.map((row) => {
                  const tier = getScoreTier(row.average10);
                  return (
                    <li key={row.questionId} className="flex items-center gap-2.5 text-[13px]">
                      <IconBadge icon={ThumbsUp} tier={tier} />
                      <span className="min-w-0 flex-1 truncate text-[var(--ink)]">{row.label}</span>
                      <span className="font-semibold" style={{ color: tier.text }}>
                        {row.average10.toFixed(1)}
                      </span>
                    </li>
                  );
                })}
                {strengths.length === 0 ? (
                  <li className="secondary-text">
                    {scored.length === 0 ? "No data yet." : "No distinct strengths emerged yet -- scores are close together."}
                  </li>
                ) : null}
              </ol>
            </Card>

            <Card>
              <h2 className="section-title text-[15px]">Top priorities</h2>
              <ol className="mt-2.5 space-y-2">
                {priorities.map((row) => {
                  const tier = getScoreTier(row.average10);
                  return (
                    <li key={row.questionId} className="flex items-center gap-2.5 text-[13px]">
                      <IconBadge icon={Flag} tier={tier} />
                      <span className="min-w-0 flex-1 truncate text-[var(--ink)]">{row.label}</span>
                      <span className="font-semibold" style={{ color: tier.text }}>
                        {row.average10.toFixed(1)}
                      </span>
                    </li>
                  );
                })}
                {priorities.length === 0 ? (
                  <li className="secondary-text">
                    {scored.length === 0 ? "No data yet." : "No distinct priorities emerged yet -- scores are close together."}
                  </li>
                ) : null}
              </ol>
            </Card>
          </div>
        </>
      )}

      {!isProtected && themeGroups.length > 0 ? (
        <Card className="mt-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <div>
              <h2 className="section-title text-[15px]">Theme heatmap</h2>
              <p className="mt-1 secondary-text">
                Each theme&apos;s score, and how it compares to this survey&apos;s own overall score. Click a tile to explore its questions.
              </p>
            </div>
            {/* Inline tier legend -- the same three colors every tinted
                element on this page already uses (getScoreTier), named
                once here instead of relying on the reader to infer green/
                amber/red's meaning from context alone. */}
            <div className="flex shrink-0 items-center gap-3 text-[11px] text-[var(--ink-mid)]">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full" style={{ background: "var(--green)" }} /> Strength
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full" style={{ background: "var(--warning)" }} /> Neutral
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full" style={{ background: "var(--red)" }} /> Priority
              </span>
            </div>
          </div>
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
            {themeGroups.map((group) => {
              const delta = overallScore !== null ? group.average10 - overallScore : null;
              const tier = getScoreTier(group.average10);
              return (
                <Link
                  key={group.construct}
                  href={report?.cycle ? `/app/${report.cycle.id}/results?theme=${encodeURIComponent(group.construct)}` : "#"}
                  className="w-[136px] shrink-0 rounded-[var(--radius-card)] border p-2.5 transition-[background-color,border-color,box-shadow] duration-300 hover:shadow-[var(--shadow-elevated)]"
                  style={{ background: tier.bg, borderColor: tier.border }}
                >
                  {/* A neutral, tier-colored badge -- never a per-theme
                      semantic icon, since construct names are open-ended
                      and tenant-defined (see the question bank), so no
                      fixed name -> icon mapping is safe. */}
                  <IconBadge icon={Circle} tier={tier} />
                  <div className="mt-1.5 truncate text-[11px] font-medium uppercase tracking-[0.04em] text-[var(--ink-mid)]">{group.construct}</div>
                  <div className="mt-0.5 text-[20px] font-semibold tracking-tight" style={{ color: tier.text }}>
                    {group.average10.toFixed(1)}
                  </div>
                  {delta !== null && Math.abs(delta) >= 0.05 ? (
                    <div className="mt-0.5 flex items-center gap-1 text-[10.5px] font-medium" style={{ color: tier.text }}>
                      {delta >= 0 ? <TrendingUp size={11} strokeWidth={2} /> : <TrendingDown size={11} strokeWidth={2} />}
                      {delta >= 0 ? "+" : ""}
                      {delta.toFixed(1)} vs overall
                    </div>
                  ) : null}
                  <div className="mt-0.5 text-[10.5px] text-[var(--ink-faint)]">
                    {group.questionCount} question{group.questionCount === 1 ? "" : "s"}
                  </div>
                </Link>
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
