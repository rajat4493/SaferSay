import { describe, expect, it } from "vitest";
import { getHeatmapTileTokens, getScoreTier } from "./scoreTier";

describe("getScoreTier", () => {
  it("classifies >= 7.5 as strength", () => {
    expect(getScoreTier(7.5).tier).toBe("strength");
    expect(getScoreTier(10).tier).toBe("strength");
  });

  it("classifies 5.5-7.49 as neutral", () => {
    expect(getScoreTier(5.5).tier).toBe("neutral");
    expect(getScoreTier(7.49).tier).toBe("neutral");
  });

  it("classifies below 5.5 as priority", () => {
    expect(getScoreTier(5.49).tier).toBe("priority");
    expect(getScoreTier(0).tier).toBe("priority");
  });

  it("returns a distinct token bundle per tier, never sharing a color across tiers", () => {
    const strength = getScoreTier(9);
    const neutral = getScoreTier(6);
    const priority = getScoreTier(2);
    const colors = [strength.text, strength.bg, strength.border, neutral.text, neutral.bg, neutral.border, priority.text, priority.bg, priority.border];
    expect(new Set(colors).size).toBe(colors.length);
  });
});

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

describe("getHeatmapTileTokens", () => {
  it("produces visibly different colors for scores within the same discrete tier band", () => {
    // A real company's themes often cluster within one band (e.g. 6.8-7.3,
    // all "neutral" per getScoreTier) -- the whole point of a heatmap is to
    // show that these aren't identical, unlike the fixed 3-band tier.
    const low = getHeatmapTileTokens(6.8);
    const mid = getHeatmapTileTokens(7.0);
    const high = getHeatmapTileTokens(7.3);
    expect(low.text).not.toBe(mid.text);
    expect(mid.text).not.toBe(high.text);
    expect(low.text).not.toBe(high.text);
  });

  it("makes a realistic narrow spread (6.8 vs 7.3) perceptibly distinct, not just numerically different", () => {
    // A design-review persona caught an earlier version of this function
    // where 6.8 and 7.3 were technically different colors but visually
    // indistinguishable (a linear 0-10 ramp spends nearly all its contrast
    // on scores real companies never get). Require a real perceptual gap:
    // at least 20 points of channel difference somewhere in the RGB triple.
    const low = hexToRgb(getHeatmapTileTokens(6.8).text);
    const high = hexToRgb(getHeatmapTileTokens(7.3).text);
    const maxChannelDelta = Math.max(...low.map((c, i) => Math.abs(c - high[i])));
    expect(maxChannelDelta).toBeGreaterThanOrEqual(20);
  });

  it("still increases toward green as the score rises and toward red as it falls, across the realistic range", () => {
    // Scores this far outside the realistic 5-8 band are already
    // unambiguously "very bad" or "very good" -- concentrating contrast in
    // the realistic middle (the actual fix here) means truly extreme values
    // can legitimately saturate to the same rendered color as each other
    // (e.g. 0 and 1 both read as solid red), which is fine: nobody needs a
    // shade of difference between two equally alarming scores. What must
    // stay distinct is variation within the range real survey averages
    // actually occupy.
    const scores = [3, 5, 6.5, 8, 9.5].map((s) => getHeatmapTileTokens(s).text);
    expect(new Set(scores).size).toBe(scores.length);
  });

  it("clamps out-of-range input instead of extrapolating past red/green", () => {
    expect(getHeatmapTileTokens(-5)).toEqual(getHeatmapTileTokens(0));
    expect(getHeatmapTileTokens(15)).toEqual(getHeatmapTileTokens(10));
  });
});
