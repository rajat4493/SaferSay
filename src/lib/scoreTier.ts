/**
 * Single source of truth for score-tier -> token mapping on the Overview
 * dashboard, replacing the page-local `scoreColor()` that only returned a
 * text color. Every tinted element on the page (score tile, heatmap tiles,
 * strength/priority badges) reads from here so they can't drift out of
 * sync with each other. Same 7.5/5.5 cutoffs (on the normalized 0-10
 * scale) the page already used.
 */
export type ScoreTier = "strength" | "neutral" | "priority";

export type ScoreTierTokens = {
  tier: ScoreTier;
  text: string;
  bg: string;
  border: string;
};

export function getScoreTier(average10: number): ScoreTierTokens {
  if (average10 >= 7.5) return { tier: "strength", text: "var(--green)", bg: "var(--green-bg)", border: "var(--green-border)" };
  if (average10 >= 5.5) return { tier: "neutral", text: "var(--warning)", bg: "var(--warning-bg)", border: "var(--warning-border)" };
  return { tier: "priority", text: "var(--red)", bg: "var(--red-bg)", border: "var(--red-border)" };
}

// Actual RGB values behind var(--red)/var(--warning)/var(--green) -- kept in
// sync with globals.css by hand, since a CSS custom property can't be read
// back and interpolated in JS. Used only for the heatmap's continuous
// gradient below, never for the discrete strength/neutral/priority tier
// above (that one intentionally stays a fixed 3-band cutoff everywhere else
// -- score tiles, strength/priority lists -- so it can't drift out of sync).
const HEATMAP_RED: [number, number, number] = [0xb8, 0x58, 0x50];
const HEATMAP_WARNING: [number, number, number] = [0xa5, 0x6b, 0x32];
const HEATMAP_GREEN: [number, number, number] = [0x0d, 0x4f, 0x37];

function mix(a: [number, number, number], b: [number, number, number], t: number): [number, number, number] {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

function toHex([r, g, b]: [number, number, number]): string {
  return `#${[r, g, b].map((v) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, "0")).join("")}`;
}

const WHITE: [number, number, number] = [255, 255, 255];

// A first version of this interpolated linearly across the full 0-10 range.
// That's mathematically continuous (no two scores are literally identical)
// but a design-review persona still saw it as visually broken: two themes
// at 6.8 and 7.3 rendered as the same muddy color to the eye, because a
// linear 0-10 ramp spends most of its color range on scores real companies
// essentially never get (true 0-3s, true 9-10s), leaving almost no visual
// slope across the 5-8 band where real survey averages actually cluster.
// A sigmoid centered on a realistic "neutral" score concentrates the color
// change exactly where real variation happens, while staying strictly
// monotonic (still no two different scores can collapse to one color) and
// still saturating toward solid red/green at genuine extremes.
const HEATMAP_SIGMOID_CENTER = 6.5;
// 1.1 was mathematically monotonic but still too subtle in practice: a 28px
// badge showing (106,96,52) next to (140,102,51) still reads as "the same
// brown" to the eye, even though the numbers differ. Steeper concentrates
// enough of the red<->green swing into a half-point-wide realistic band
// that adjacent themes shift color family (brownish-amber toward green),
// not just channel value -- confirmed by direct comparison of the two
// steepness values against the same 6.8/7.3 pair this was tuned against.
const HEATMAP_SIGMOID_STEEPNESS = 1.8;

function heatmapGradientPosition(average10: number): number {
  const clamped = Math.min(10, Math.max(0, average10));
  return 1 / (1 + Math.exp(-HEATMAP_SIGMOID_STEEPNESS * (clamped - HEATMAP_SIGMOID_CENTER)));
}

/**
 * A discrete 3-band tier (getScoreTier above) collapses every theme in a
 * real company's typically narrow score spread (e.g. 6.8-7.3, all "neutral")
 * into one identical color -- defeating the point of a heatmap, which is
 * supposed to show *relative* differences at a glance. This instead
 * interpolates continuously between red (0) - amber (mid) - green (10), so
 * two themes half a point apart render as visibly different shades even
 * when both fall on the same side of the strength/priority cutoffs used
 * elsewhere in the app.
 */
export function getHeatmapTileTokens(average10: number): ScoreTierTokens {
  const t = heatmapGradientPosition(average10);
  const rgb = t <= 0.5 ? mix(HEATMAP_RED, HEATMAP_WARNING, t / 0.5) : mix(HEATMAP_WARNING, HEATMAP_GREEN, (t - 0.5) / 0.5);
  const clamped = Math.min(10, Math.max(0, average10));
  const tier: ScoreTier = clamped >= 7.5 ? "strength" : clamped >= 5.5 ? "neutral" : "priority";
  return {
    tier,
    text: toHex(rgb),
    bg: toHex(mix(rgb, WHITE, 0.88)),
    border: toHex(mix(rgb, WHITE, 0.7)),
  };
}
