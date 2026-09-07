import { describe, expect, it } from "vitest";
import { isScaleConfig, normalizeToTen, resolveScale } from "./scaleRange";

describe("resolveScale", () => {
  it("returns the fixed 1-5 range for likert_5, ignoring any stored options", () => {
    expect(resolveScale("likert_5", { min: 0, max: 100 })).toEqual({ min: 1, max: 5 });
  });

  it("returns the fixed 0-10 range for enps_0_10", () => {
    expect(resolveScale("enps_0_10", null)).toEqual({ min: 0, max: 10 });
  });

  it("reads a configured scale question's real min/max/labels", () => {
    const stored = { min: 0, max: 100, lowLabel: "Not at all satisfied", highLabel: "Extremely satisfied" };
    expect(resolveScale("scale", stored)).toEqual(stored);
  });

  it("falls back to a safe wide default when a scale question's stored config is missing or malformed", () => {
    expect(resolveScale("scale", null)).toEqual({ min: 0, max: 10 });
    expect(resolveScale("scale", { min: 5, max: 5 })).toEqual({ min: 0, max: 10 }); // zero-width, invalid
    expect(resolveScale("scale", { min: 10, max: 0 })).toEqual({ min: 0, max: 10 }); // inverted, invalid
    expect(resolveScale("scale", "not an object")).toEqual({ min: 0, max: 10 });
  });

  it("falls back to a safe default for any other type (open_text, multiple_choice, ...)", () => {
    expect(resolveScale("open_text", null)).toEqual({ min: 0, max: 10 });
  });
});

describe("normalizeToTen", () => {
  it("is min-aware, unlike a plain value/max ratio", () => {
    // likert_5's real range is [1, 5], not [0, 5] -- a raw average of 1
    // (the worst possible score) must normalize to 0, not 2.
    expect(normalizeToTen(1, { min: 1, max: 5 })).toBeCloseTo(0);
    expect(normalizeToTen(5, { min: 1, max: 5 })).toBeCloseTo(10);
    expect(normalizeToTen(3, { min: 1, max: 5 })).toBeCloseTo(5);
  });

  it("normalizes a 0-10 scale unchanged", () => {
    expect(normalizeToTen(0, { min: 0, max: 10 })).toBeCloseTo(0);
    expect(normalizeToTen(10, { min: 0, max: 10 })).toBeCloseTo(10);
    expect(normalizeToTen(6.8, { min: 0, max: 10 })).toBeCloseTo(6.8);
  });

  it("normalizes an arbitrary configured scale (e.g. 0-100)", () => {
    expect(normalizeToTen(50, { min: 0, max: 100 })).toBeCloseTo(5);
    expect(normalizeToTen(100, { min: 0, max: 100 })).toBeCloseTo(10);
  });

  it("returns 0 for a degenerate zero-width scale instead of dividing by zero", () => {
    expect(normalizeToTen(5, { min: 5, max: 5 })).toBe(0);
  });
});

describe("isScaleConfig", () => {
  it("accepts a well-formed range", () => {
    expect(isScaleConfig({ min: 0, max: 10 })).toBe(true);
  });

  it("rejects malformed or degenerate input", () => {
    expect(isScaleConfig(null)).toBe(false);
    expect(isScaleConfig(undefined)).toBe(false);
    expect(isScaleConfig([])).toBe(false);
    expect(isScaleConfig({ min: 5, max: 5 })).toBe(false);
    expect(isScaleConfig({ min: 10, max: 0 })).toBe(false);
    expect(isScaleConfig({ min: "0", max: 10 })).toBe(false);
  });
});
