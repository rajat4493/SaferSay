export type TrendPoint = { cycleId: string; cycleName: string; cycleCreatedAt: string; n: number; average: number | null; protected: boolean; scaleMax?: 5 | 10 };

/**
 * One overall-score-per-cycle series, derived client-side from the
 * per-question cross-cycle trend endpoint (/api/report/trend) -- shared by
 * Overview's cross-cycle trend card and the Results page's "Change vs last
 * survey" tile, so both read the same number the same way instead of
 * drifting apart. Each cycle's value is the average, across every question
 * released for that cycle, of the question's answer normalized to a common
 * 0-10 scale via scaleMax -- so a cycle mixing likert_5 and enps_0_10
 * questions (e.g. the eNPS Pulse template) isn't skewed by averaging raw
 * un-normalized scores together.
 *
 * Cycles are ordered by their own cycleCreatedAt, not by position within
 * any one question's point list -- a cycle whose template changed (no
 * question in common with earlier cycles, e.g. switching to a richer
 * template) has no point in any other cycle's question at all, so trying
 * to recover its order from a shared reference question silently placed
 * it in the wrong position. Real bug found while testing the new richer
 * default template: a freshly-run cycle sorted second instead of last,
 * producing a wrong "change vs last survey" delta and a flat sparkline.
 */
export function overallScoreByCycle(questions: Array<{ points: TrendPoint[] }>): Array<{ cycleId: string; cycleName: string; value: number }> {
  const byCycle = new Map<string, { cycleName: string; cycleCreatedAt: string; total: number; count: number }>();
  for (const question of questions) {
    for (const point of question.points) {
      if (point.protected || point.average === null) continue;
      const normalized = (point.average / (point.scaleMax ?? 5)) * 10;
      const entry = byCycle.get(point.cycleId) ?? { cycleName: point.cycleName, cycleCreatedAt: point.cycleCreatedAt, total: 0, count: 0 };
      entry.total += normalized;
      entry.count += 1;
      byCycle.set(point.cycleId, entry);
    }
  }
  return Array.from(byCycle.entries())
    .map(([cycleId, { cycleName, cycleCreatedAt, total, count }]) => ({ cycleId, cycleName, cycleCreatedAt, value: total / count }))
    .sort((a, b) => new Date(a.cycleCreatedAt).getTime() - new Date(b.cycleCreatedAt).getTime())
    .map(({ cycleId, cycleName, value }) => ({ cycleId, cycleName, value }));
}
