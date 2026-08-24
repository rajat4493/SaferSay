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
