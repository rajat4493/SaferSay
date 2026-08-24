import { describe, expect, it } from "vitest";
import { getScoreTier } from "./scoreTier";

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
