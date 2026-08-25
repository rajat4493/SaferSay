"use client";

import { EyeOff } from "lucide-react";

export type TrendLinePoint = {
  /** Already normalized to /10 by the caller (each point's own scaleMax --
   * see CycleTrendPanel.tsx) so every question sits on the same visual
   * scale, whether it's a likert_5 or enps_0_10 question. Null means this
   * cycle's point is still below the anonymity threshold. */
  value10: number | null;
  protected: boolean;
  /** Native-tooltip text for this exact point, e.g.
   * "2. Q2 Pulse (Aug 24): 8.0 (n=6)" -- same convention every other
   * chart in this app uses (no dedicated tooltip component exists). */
  title: string;
};

/**
 * Single-series trend line for one question across cycles -- replaces the
 * old per-cycle bar cluster (see CycleTrendPanel.tsx's history). A line is
 * the right form for "change over time" (see the dataviz skill's form
 * table); the previous bar-per-cycle layout, combined with a hardcoded
 * /5 normalization that mis-scaled enps_0_10 questions, is what made the
 * panel read as "highly uneven."
 *
 * Deliberately not a reuse of Sparkline.tsx: that component is a plain
 * single-color path with no fill/end-marker/gap/hover behavior, built for
 * Overview's simpler score-over-time card. This needs per-point tooltips,
 * a gap across suppressed points, and an end-value label, so it's its own
 * small component rather than stretching Sparkline to a shape it wasn't
 * designed for (matching this codebase's own existing precedent of not
 * coupling RingStat/Sparkline variants across different surfaces).
 */
export function QuestionTrendLine({ points, color }: { points: TrendLinePoint[]; color: string }) {
  const width = 280;
  const height = 60;
  const padTop = 18; // room for the end-value label above the line
  const padBottom = 10;
  const plotHeight = height - padTop - padBottom;
  const baseline = padTop + plotHeight;
  const step = points.length > 1 ? width / (points.length - 1) : width;

  const xFor = (index: number) => index * step;
  const yFor = (value10: number) => padTop + plotHeight - (value10 / 10) * plotHeight;

  // Contiguous runs of real (non-null) points -- a protected point breaks
  // the line into separate segments instead of connecting through, or
  // interpolating, a value that was never released.
  const segments: Array<{ x: number; y: number }[]> = [];
  let current: { x: number; y: number }[] = [];
  points.forEach((point, index) => {
    if (point.value10 === null) {
      if (current.length) segments.push(current);
      current = [];
      return;
    }
    current.push({ x: xFor(index), y: yFor(point.value10) });
  });
  if (current.length) segments.push(current);

  const pathFor = (segment: { x: number; y: number }[]) =>
    segment.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const areaFor = (segment: { x: number; y: number }[]) =>
    `${pathFor(segment)} L${segment[segment.length - 1].x.toFixed(1)},${baseline} L${segment[0].x.toFixed(1)},${baseline} Z`;

  const lastRealIndex = points.map((p) => p.value10).findLastIndex((v) => v !== null);

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-14 w-full max-w-[280px]">
      {segments.map((segment, i) => (
        <g key={i}>
          {segment.length >= 2 ? <path d={areaFor(segment)} fill={color} fillOpacity={0.1} stroke="none" /> : null}
          <path d={pathFor(segment)} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        </g>
      ))}

      {points.map((point, index) => {
        const x = xFor(index);
        const isLast = index === lastRealIndex;
        const y = point.value10 !== null ? yFor(point.value10) : baseline;
        return (
          <g key={index}>
            {/* Larger invisible hit target -- the visible marker below is
                intentionally small; hover/tap should be easier than the
                dot itself, per the dataviz skill's interaction spec. */}
            <circle cx={x} cy={y} r={9} fill="transparent">
              <title>{point.title}</title>
            </circle>
            {point.value10 === null ? (
              <foreignObject x={x - 6} y={baseline - 6} width={12} height={12}>
                <EyeOff size={12} strokeWidth={1.8} color="var(--ink-faint)" />
              </foreignObject>
            ) : (
              <circle cx={x} cy={y} r={isLast ? 5 : 3} fill={color} stroke="var(--bg)" strokeWidth={isLast ? 2 : 0} />
            )}
            {isLast ? (
              <text x={x} y={y - 7} textAnchor="end" className="fill-[var(--ink)]" style={{ fontSize: 11, fontWeight: 600 }}>
                {point.value10!.toFixed(1)}
              </text>
            ) : null}
          </g>
        );
      })}
    </svg>
  );
}
