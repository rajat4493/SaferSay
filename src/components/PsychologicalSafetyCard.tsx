import { Info } from "lucide-react";

/**
 * Visualizes the same protected/n/minGroupSize gate ProtectedReportPanel
 * already fetches from /api/report -- real data, not a mock. The ring
 * fills toward the minimum-response threshold; once unlocked it reads
 * the actual "Psychological Safety" construct average when present.
 */
export function PsychologicalSafetyCard({
  n,
  minGroupSize,
  protectedState,
  score,
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
  genericUnavailable?: boolean;
}) {
  const radius = 62;
  const circumference = 2 * Math.PI * radius;
  const ratio = genericUnavailable ? 0 : minGroupSize > 0 ? Math.min(n / minGroupSize, 1) : 0;
  const remaining = Math.max(minGroupSize - n, 0);

  return (
    <div className="card">
      <div className="flex items-center justify-between">
        <h2 className="section-title">Psychological Safety</h2>
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
      </div>
    </div>
  );
}
