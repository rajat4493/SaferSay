import { Info } from "lucide-react";

export type EnpsSummary = { promoterPct: number; passivePct: number; detractorPct: number; score: number };

/**
 * Visualizes the same protected/n/minGroupSize gate ProtectedReportPanel
 * already fetches from /api/report -- real data, not a mock. The ring
 * fills toward the minimum-response threshold; once unlocked it reads the
 * overall average across every scored question this cycle. Optionally
 * shows an eNPS promoter/passive/detractor strip beneath the ring when the
 * cycle has a releasable eNPS question -- merged into one card (rather
 * than a separate eNPS section elsewhere on the page) so the two headline
 * numbers read together, matching the reference dashboard's "Engagement
 * Score" tile.
 */
export function PsychologicalSafetyCard({
  n,
  minGroupSize,
  protectedState,
  score,
  enps,
  // Department-scoped suppression deliberately reports n=0 regardless of
  // the department's real count (see responseRepository.ts's
  // getDepartmentReleasability) -- so "N of minGroupSize" / "N more
  // responses needed" would either be wrong (this department may already
  // have more than 0 responses) or, worse, imply a specific gap the
  // generic "not available yet" copy is designed not to reveal. When set,
  // this card falls back to the same non-numeric framing instead.
  genericUnavailable = false,
}: {
  n: number;
  minGroupSize: number;
  protectedState: boolean;
  score: number | null;
  enps?: EnpsSummary | null;
  genericUnavailable?: boolean;
}) {
  const radius = 62;
  const circumference = 2 * Math.PI * radius;
  const ratio = genericUnavailable ? 0 : minGroupSize > 0 ? Math.min(n / minGroupSize, 1) : 0;
  const remaining = Math.max(minGroupSize - n, 0);

  return (
    <div className="card">
      <div className="flex items-center justify-between">
        <h2 className="section-title">Engagement Score</h2>
        <Info size={15} strokeWidth={1.8} className="text-[var(--ink-faint)]" />
      </div>

      <div className="mt-2 flex flex-col items-center py-2">
        <svg width="150" height="150" viewBox="0 0 150 150">
          <circle cx="75" cy="75" r={radius} fill="none" stroke="var(--bg-active)" strokeWidth="12" />
          <circle
            cx="75"
            cy="75"
            r={radius}
            fill="none"
            stroke="var(--green)"
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - ratio)}
            transform="rotate(-90 75 75)"
          />
          <text x="75" y="70" textAnchor="middle" className="fill-[var(--ink)]" style={{ fontFamily: "var(--font-display)", fontSize: 26, fontWeight: 500 }}>
            {genericUnavailable ? "—" : protectedState ? `${n} of ${minGroupSize}` : score !== null ? score.toFixed(1) : "—"}
          </text>
          <text x="75" y="90" textAnchor="middle" className="fill-[var(--ink-soft)]" style={{ fontFamily: "var(--font-body)", fontSize: 10.5 }}>
            {genericUnavailable ? "not available" : protectedState ? "min. responses" : "avg. score"}
          </text>
        </svg>

        <div className="mt-3.5 text-center">
          <p className="text-[13.5px] font-semibold text-[var(--green)]">
            {genericUnavailable
              ? "Not available yet"
              : protectedState
                ? remaining > 0
                  ? `${remaining} more response${remaining === 1 ? "" : "s"} needed`
                  : "Ready to unlock"
                : "Unlocked"}
          </p>
          <p className="mx-auto mt-1 max-w-[240px] text-[12.5px] leading-[1.5] text-[var(--ink-soft)]">
            {genericUnavailable
              ? "This view isn't available yet."
              : protectedState
                ? "We protect anonymity by requiring a minimum response threshold before results unlock."
                : "Based on responses collected so far for this survey."}
          </p>
        </div>

        {!protectedState && !genericUnavailable && enps ? (
          <div className="mt-4 w-full border-t border-[var(--border)] pt-3.5">
            <div className="flex items-center justify-between text-[12.5px]">
              <span className="font-medium text-[var(--ink-mid)]">eNPS</span>
              <span className="font-semibold text-[var(--ink)]">{Math.round(enps.score)}</span>
            </div>
            <div className="mt-1.5 flex h-[7px] overflow-hidden rounded-[var(--radius-pill)] bg-[var(--bg-active)]">
              <div className="h-full bg-[var(--enps-promoter)]" style={{ width: `${enps.promoterPct}%` }} title={`Promoters: ${enps.promoterPct.toFixed(0)}%`} />
              <div className="h-full bg-[var(--enps-passive)]" style={{ width: `${enps.passivePct}%` }} title={`Passives: ${enps.passivePct.toFixed(0)}%`} />
              <div className="h-full bg-[var(--enps-detractor)]" style={{ width: `${enps.detractorPct}%` }} title={`Detractors: ${enps.detractorPct.toFixed(0)}%`} />
            </div>
            <div className="mt-1 flex justify-between text-[11px] text-[var(--ink-faint)]">
              <span>{enps.promoterPct.toFixed(0)}% promoters</span>
              <span>{enps.passivePct.toFixed(0)}% passives</span>
              <span>{enps.detractorPct.toFixed(0)}% detractors</span>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
