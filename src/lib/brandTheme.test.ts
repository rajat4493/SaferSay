import { describe, expect, it } from "vitest";
import { deriveAccentPalette, isValidHexColor } from "./brandTheme";

describe("isValidHexColor", () => {
  it("accepts a 6-digit hex color", () => {
    expect(isValidHexColor("#0d4f37")).toBe(true);
    expect(isValidHexColor("#ABCDEF")).toBe(true);
  });

  it("rejects anything else", () => {
    expect(isValidHexColor("0d4f37")).toBe(false); // missing #
    expect(isValidHexColor("#fff")).toBe(false); // 3-digit shorthand not supported
    expect(isValidHexColor("red")).toBe(false);
    expect(isValidHexColor("#gggggg")).toBe(false);
  });
});

describe("deriveAccentPalette", () => {
  it("round-trips the exact input color as --green", () => {
    const palette = deriveAccentPalette("#0d4f37");
    expect(palette["--green"]).toBe("#0d4f37");
  });

  it("produces a darker shade for --green-hover", () => {
    const palette = deriveAccentPalette("#3366cc");
    // Just assert it's a valid hex and genuinely darker, not a specific
    // value -- the HSL math has legitimate rounding, this locks in the
    // *property* (darker), not an exact string.
    expect(isValidHexColor(palette["--green-hover"])).toBe(true);
    expect(luminance(palette["--green-hover"])).toBeLessThan(luminance(palette["--green"]));
  });

  it("produces a much lighter, low-saturation shade for --green-bg", () => {
    const palette = deriveAccentPalette("#3366cc");
    expect(isValidHexColor(palette["--green-bg"])).toBe(true);
    expect(luminance(palette["--green-bg"])).toBeGreaterThan(luminance(palette["--green"]));
  });

  it("handles a grayscale input without dividing by zero", () => {
    const palette = deriveAccentPalette("#808080");
    expect(isValidHexColor(palette["--green"])).toBe(true);
    expect(isValidHexColor(palette["--green-hover"])).toBe(true);
    expect(isValidHexColor(palette["--green-bg"])).toBe(true);
    expect(isValidHexColor(palette["--green-border"])).toBe(true);
  });

  it("handles pure black and white without producing NaN/invalid hex", () => {
    expect(isValidHexColor(deriveAccentPalette("#000000")["--green-hover"])).toBe(true);
    expect(isValidHexColor(deriveAccentPalette("#ffffff")["--green-bg"])).toBe(true);
  });
});

function luminance(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
