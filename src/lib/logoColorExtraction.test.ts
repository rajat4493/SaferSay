import { describe, expect, it } from "vitest";
import { pickLargestBucket, rgbToHsl, toHex } from "./logoColorExtraction";

describe("rgbToHsl", () => {
  it("computes hue/saturation/lightness for a saturated color", () => {
    const { s, l } = rgbToHsl(13, 79, 55); // SaferSay's own green
    expect(s).toBeGreaterThan(0.5);
    expect(l).toBeGreaterThan(0.1);
    expect(l).toBeLessThan(0.3);
  });

  it("reports zero saturation for pure grayscale", () => {
    expect(rgbToHsl(128, 128, 128).s).toBe(0);
    expect(rgbToHsl(255, 255, 255).l).toBe(1);
    expect(rgbToHsl(0, 0, 0).l).toBe(0);
  });
});

describe("toHex", () => {
  it("pads and clamps into a two-digit hex byte", () => {
    expect(toHex(0)).toBe("00");
    expect(toHex(255)).toBe("ff");
    expect(toHex(13)).toBe("0d");
    expect(toHex(-5)).toBe("00");
    expect(toHex(300)).toBe("ff");
  });
});

describe("pickLargestBucket", () => {
  it("returns the bucket with the highest pixel count", () => {
    const buckets = new Map([
      ["a", { count: 5, r: 10, g: 10, b: 10 }],
      ["b", { count: 20, r: 100, g: 100, b: 100 }],
      ["c", { count: 3, r: 200, g: 200, b: 200 }],
    ]);
    expect(pickLargestBucket(buckets)).toEqual({ count: 20, r: 100, g: 100, b: 100 });
  });

  it("returns null for an empty bucket set", () => {
    expect(pickLargestBucket(new Map())).toBeNull();
  });
});
