"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Info, TrendingDown, TrendingUp } from "lucide-react";
import { AppShell, Card } from "@/components/AppShell";
import { Sparkline } from "@/components/Sparkline";
import { getScoreTier } from "@/lib/scoreTier";

type Cycle = { id: string; name: string; status: string; responseCount: number; minGroupSize: number; createdAt: string };

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

/** Same "no trend yet" designed empty state used for both trend cards
 * below -- a dashed flat placeholder line instead of blank space, plus a
 * headline explaining a second data point is what's missing. */
function BaselineState({ heading, body }: { heading: string; body: string }) {
  return (
    <>
      <p className="mt-2 text-[15px] font-semibold text-[var(--ink)]">{heading}</p>
      <p className="mt-0.5 secondary-text">{body}</p>
      <svg viewBox="0 0 280 60" className="mt-2 h-14 w-full" aria-hidden="true">
        <path d="M0,30 L280,30" fill="none" stroke="var(--ink-faint)" strokeWidth={2} strokeDasharray="4 5" strokeLinecap="round" />
      </svg>
    </>
  );
}

export default function OverviewPage() {
  const [cycles, setCycles] = useState<Cycle[] | null>(null);
  const [employeeCount, setEmployeeCount] = useState<number | null>(null);
  const [trend, setTrend] = useState<TrendResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/employees?limit=1").then((r) => r.json()),
      fetch("/api/cycles").then((r) => r.json()),
      fetch("/api/report/trend").then((r) => r.json()),
    ]).then(([employeesResult, cyclesResult, trendResult]) => {
      setEmployeeCount(employeesResult.ok ? (employeesResult.total ?? 0) : null);
      setCycles(cyclesResult.ok ? (cyclesResult.cycles ?? []) : []);
      setTrend(trendResult.ok ? trendResult : { questions: [] });
      setLoading(false);
    });
  }, []);

  if (loading || cycles === null) {
    return (
      <AppShell title="Overview" subtitle="How things have changed across your surveys.">
        <div className="h-40" />
      </AppShell>
    );
  }

  if (cycles.length === 0) {
    return (
      <AppShell title="Overview" subtitle="How things have changed across your surveys.">
        <Card>
          <p className="secondary-text">No surveys yet. Once you run your first one, this page will track how things change over time.</p>
          <Link href="/app/surveys/new" className="btn-primary mt-4 inline-flex">
            Create your first survey
          </Link>
        </Card>
      </AppShell>
    );
  }

  const overallByCycle = overallScoreByCycle(trend?.questions ?? []);
  const scoreDelta =
    overallByCycle.length >= 2 ? overallByCycle[overallByCycle.length - 1].value - overallByCycle[overallByCycle.length - 2].value : null;
  const scoreTier = scoreDelta !== null ? (scoreDelta >= 0 ? getScoreTier(10) : getScoreTier(0)) : null;

  // Response rate over time is an approximation: eligible headcount isn't
  // versioned historically, so this divides each cycle's response count by
  // today's headcount rather than that cycle's actual eligible count at the
  // time -- the same kind of approximation the score trend card already
  // makes (survey-cycle order, not a fully audited historical snapshot).
  const cyclesOldestFirst = [...cycles].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  const responseRateByCycle = employeeCount
    ? cyclesOldestFirst.map((cycle) => ({ cycleId: cycle.id, cycleName: cycle.name, value: Math.round((cycle.responseCount / employeeCount) * 100) }))
    : [];
  const rateDelta =
    responseRateByCycle.length >= 2 ? responseRateByCycle[responseRateByCycle.length - 1].value - responseRateByCycle[responseRateByCycle.length - 2].value : null;
  const rateTier = rateDelta !== null ? (rateDelta >= 0 ? getScoreTier(10) : getScoreTier(0)) : null;

  const totalSurveys = cycles.length;
  const totalResponses = cycles.reduce((sum, cycle) => sum + cycle.responseCount, 0);
  const scoreDeltaAllTime = overallByCycle.length >= 2 ? overallByCycle[overallByCycle.length - 1].value - overallByCycle[0].value : null;

  const latestOpenOrRecent = cycles.find((c) => c.status === "open") ?? cycles[0];

  return (
    <AppShell title="Overview" subtitle="How things have changed across your surveys.">
      <div className="grid gap-5 md:grid-cols-3">
        <Card>
          <h2 className="meta-label">Surveys run</h2>
          <p className="data-number mt-4">{totalSurveys}</p>
        </Card>
        <Card>
          <h2 className="meta-label">Responses collected</h2>
          <p className="data-number mt-4">{totalResponses}</p>
          <p className="mt-2 secondary-text">all-time</p>
        </Card>
        <Card>
          <h2 className="meta-label">Score, first vs. latest</h2>
          <p className="data-number mt-4 flex items-center gap-2">
            {scoreDeltaAllTime === null ? (
              "—"
            ) : (
              <>
                {scoreDeltaAllTime >= 0 ? <TrendingUp size={22} strokeWidth={2} /> : <TrendingDown size={22} strokeWidth={2} />}
                {scoreDeltaAllTime >= 0 ? "+" : ""}
                {scoreDeltaAllTime.toFixed(1)}
              </>
            )}
          </p>
        </Card>
      </div>

      <div className="mt-[22px] grid gap-5 md:grid-cols-2">
        <Card
          className="border transition-[background-color,border-color] duration-300"
          style={scoreTier && overallByCycle.length >= 2 ? { background: scoreTier.bg, borderColor: scoreTier.border } : undefined}
        >
          <div className="flex items-center gap-1.5">
            <h2 className="section-title">Score over time</h2>
            <span title="Every scored question, each survey, normalized to a 0-10 scale and averaged.">
              <Info size={14} strokeWidth={1.8} className="text-[var(--ink-faint)]" />
            </span>
          </div>
          {overallByCycle.length >= 2 ? (
            <>
              <p className="data-number mt-4 flex items-center gap-2" style={{ color: scoreTier?.text }}>
                {(scoreDelta ?? 0) >= 0 ? <TrendingUp size={22} strokeWidth={2} /> : <TrendingDown size={22} strokeWidth={2} />}
                {(scoreDelta ?? 0) >= 0 ? "+" : ""}
                {scoreDelta!.toFixed(1)}
                <span className="text-[13px] font-normal text-[var(--ink-mid)]">vs. previous survey</span>
              </p>
              <Sparkline points={overallByCycle.map((point) => point.value)} color={scoreTier?.text} />
            </>
          ) : (
            <BaselineState heading="Baseline established" body="Run your next survey to see change over time." />
          )}
        </Card>

        <Card
          className="border transition-[background-color,border-color] duration-300"
          style={rateTier && responseRateByCycle.length >= 2 ? { background: rateTier.bg, borderColor: rateTier.border } : undefined}
        >
          <div className="flex items-center gap-1.5">
            <h2 className="section-title">Response rate over time</h2>
            <span title="Each survey's responses divided by today's eligible headcount -- an approximation, since headcount isn't tracked historically per survey.">
              <Info size={14} strokeWidth={1.8} className="text-[var(--ink-faint)]" />
            </span>
          </div>
          {responseRateByCycle.length >= 2 ? (
            <>
              <p className="data-number mt-4 flex items-center gap-2" style={{ color: rateTier?.text }}>
                {(rateDelta ?? 0) >= 0 ? <TrendingUp size={22} strokeWidth={2} /> : <TrendingDown size={22} strokeWidth={2} />}
                {(rateDelta ?? 0) >= 0 ? "+" : ""}
                {rateDelta}pts
                <span className="text-[13px] font-normal text-[var(--ink-mid)]">vs. previous survey</span>
              </p>
              <Sparkline points={responseRateByCycle.map((point) => point.value)} color={rateTier?.text} />
            </>
          ) : (
            <BaselineState heading="Baseline established" body="Run your next survey to see response rate change over time." />
          )}
        </Card>
      </div>

      <div className="mt-[22px] flex flex-wrap items-center gap-3">
        <Link href={`/app/${latestOpenOrRecent.id}/results`} className="btn-primary">
          View latest results
        </Link>
        <Link href="/app/surveys" className="font-medium text-[var(--ink)] underline">
          View all surveys
        </Link>
      </div>
    </AppShell>
  );
}
