/**
 * Shared theme (construct) grouping/banding for report rows -- extracted
 * from the ad hoc grouping `overview/page.tsx` already did client-side, so
 * the Results page's theme drill-down and the Overview heatmap compute the
 * same numbers the same way instead of drifting apart.
 *
 * Only ever consumes already-suppressed ProtectedReport rows -- grouping
 * and averaging numbers that already cleared min_group_size introduces no
 * new suppression surface, so this module has no DB access and no
 * suppression logic of its own.
 */

export type ThemeableRow = {
  questionId: string;
  label?: string;
  construct?: string | null;
  average: number | null;
  scaleMax?: 5 | 10;
};

export type ThemeBand = "strength" | "neutral" | "priority";

export type ThemeGroup = {
  construct: string;
  /** Average of this theme's questions, normalized to a 0-10 scale so
   * likert_5 and enps_0_10 questions can be grouped and banded together. */
  average10: number;
  questionCount: number;
  band: ThemeBand;
  rows: Array<ThemeableRow & { average: number; average10: number }>;
};

// Same shape as evoke-voice's Strength/Neutral/Priority thresholds, applied
// on the normalized 0-10 scale.
const STRENGTH_THRESHOLD = 7.7;
const PRIORITY_THRESHOLD = 6.8;

function normalizeTo10(average: number, scaleMax: 5 | 10 = 5): number {
  return (average / scaleMax) * 10;
}

function bandFor(average10: number): ThemeBand {
  if (average10 >= STRENGTH_THRESHOLD) return "strength";
  if (average10 < PRIORITY_THRESHOLD) return "priority";
  return "neutral";
}

export function groupByConstruct(rows: ThemeableRow[]): ThemeGroup[] {
  const scored = rows.filter((row): row is ThemeableRow & { average: number } => row.average !== null);

  const byConstruct = new Map<string, Array<ThemeableRow & { average: number; average10: number }>>();
  for (const row of scored) {
    const key = row.construct?.trim() || "Other";
    const normalized = { ...row, average10: normalizeTo10(row.average, row.scaleMax) };
    const entry = byConstruct.get(key);
    if (entry) entry.push(normalized);
    else byConstruct.set(key, [normalized]);
  }

  return Array.from(byConstruct.entries())
    .map(([construct, groupRows]) => {
      const average10 = groupRows.reduce((sum, row) => sum + row.average10, 0) / groupRows.length;
      return { construct, average10, questionCount: groupRows.length, band: bandFor(average10), rows: groupRows };
    })
    .sort((a, b) => b.average10 - a.average10);
}

/**
 * The single headline number a report's questions average out to, on the
 * same normalized 0-10 scale groupByConstruct uses -- the "Overall Score"
 * tile, and the baseline every theme's "vs overall" badge on the Overview
 * dashboard compares against. Pure arithmetic over rows already on the
 * page; not a new query, and never crosses outside the caller's own
 * report rows (no cross-tenant/cross-company comparison here or anywhere
 * in this module).
 */
export function overallAverage10(rows: ThemeableRow[]): number | null {
  const scored = rows.filter((row): row is ThemeableRow & { average: number } => row.average !== null);
  if (scored.length === 0) return null;
  return scored.reduce((sum, row) => sum + normalizeTo10(row.average, row.scaleMax), 0) / scored.length;
}

/**
 * A scoped theme's score minus the same theme's org-wide score -- both
 * inputs are already-suppressed/already-released averages (see
 * groupByConstruct's doc comment), so a difference of two already-public
 * numbers discloses nothing beyond what's already been shown separately.
 */
export function themeDeltasToOrg(scoped: ThemeGroup[], org: ThemeGroup[]): Map<string, number> {
  const orgByConstruct = new Map(org.map((group) => [group.construct, group.average10]));
  const deltas = new Map<string, number>();
  for (const group of scoped) {
    const orgAverage = orgByConstruct.get(group.construct);
    if (orgAverage !== undefined) deltas.set(group.construct, group.average10 - orgAverage);
  }
  return deltas;
}
