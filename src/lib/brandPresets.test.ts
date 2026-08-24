import { describe, expect, it } from "vitest";
import { BRAND_PRESETS, findBrandPreset, presetStyleOverrides } from "./brandPresets";

describe("findBrandPreset", () => {
  it("returns null for no preset id", () => {
    expect(findBrandPreset(null)).toBeNull();
    expect(findBrandPreset(undefined)).toBeNull();
    expect(findBrandPreset("")).toBeNull();
  });

  it("returns null for an unknown preset id, never throws", () => {
    expect(findBrandPreset("not-a-real-preset")).toBeNull();
  });

  it("finds a real preset by id", () => {
    expect(findBrandPreset("calm-teal")?.label).toBe("Calm Teal");
  });
});

describe("presetStyleOverrides", () => {
  it("returns an empty object for no preset -- nothing changes with no preset active", () => {
    expect(presetStyleOverrides(null)).toEqual({});
    expect(presetStyleOverrides("not-a-real-preset")).toEqual({});
  });

  it("flattens a real preset's tokens, including sidebar sub-object, into a plain CSS-var map", () => {
    const overrides = presetStyleOverrides("calm-teal");
    expect(overrides["--radius-card"]).toBe("20px");
    expect(overrides["--enps-promoter"]).toBeTruthy();
    expect(overrides["--sidebar-bg"]).toBeTruthy();
    expect(overrides["--sidebar-ink"]).toBeTruthy();
    expect(overrides.sidebar).toBeUndefined();
  });

  it("every preset defines a full, consistent token set (no accidental gaps)", () => {
    for (const preset of BRAND_PRESETS) {
      const overrides = presetStyleOverrides(preset.id);
      for (const key of ["--radius-card", "--radius-button", "--radius-pill", "--shadow-soft", "--shadow-elevated", "--enps-promoter", "--enps-passive", "--enps-detractor"]) {
        expect(overrides[key], `${preset.id} is missing ${key}`).toBeTruthy();
      }
      if (preset.tokens.sidebar) {
        for (const key of ["--sidebar-bg", "--sidebar-ink", "--sidebar-ink-mid", "--sidebar-ink-faint", "--sidebar-active-bg", "--sidebar-active-ink", "--sidebar-border"]) {
          expect(overrides[key], `${preset.id} is missing ${key}`).toBeTruthy();
        }
      }
    }
  });
});
