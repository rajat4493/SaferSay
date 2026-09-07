import { describe, expect, it } from "vitest";
import { groupByConstruct, overallAverage10, themeDeltasToOrg, type ThemeableRow } from "./reportThemes";

describe("overallAverage10", () => {
  it("returns null when there are no scored rows", () => {
    expect(overallAverage10([])).toBeNull();
    expect(overallAverage10([{ questionId: "q1", average: null }])).toBeNull();
  });

  it("averages a single likert_5 row (1-5), min-aware", () => {
    // A raw value/scaleMax ratio would give 4/5 -> 8, but likert_5's real
    // range is [1, 5], not [0, 5] -- normalizeToTen correctly maps 4 onto
    // (4-1)/(5-1)*10 = 7.5, not 8.
    expect(overallAverage10([{ questionId: "q1", average: 4, scaleMin: 1, scaleMax: 5 }])).toBe(7.5);
  });

  it("averages mixed likert_5 and enps_0_10 rows on a common /10 scale", () => {
    // q1: (4-1)/(5-1)*10 = 7.5. q2: enps_0_10 already starts at 0, so
    // (8-0)/10*10 = 8 unchanged. Overall: (7.5+8)/2 = 7.75.
    const result = overallAverage10([
      { questionId: "q1", average: 4, scaleMin: 1, scaleMax: 5 },
      { questionId: "q2", average: 8, scaleMin: 0, scaleMax: 10 },
    ]);
    expect(result).toBe(7.75);
  });

  it("averages a tenant-configured 'scale' question (e.g. 0-100) on the same /10 scale", () => {
    expect(overallAverage10([{ questionId: "q1", average: 80, scaleMin: 0, scaleMax: 100 }])).toBe(8);
  });

  it("defaults to likert_5's real 1-5 shape when scaleMin/scaleMax are omitted", () => {
    // (2.5-1)/(5-1)*10 = 3.75, not 2.5/5*10 = 5.
    expect(overallAverage10([{ questionId: "q1", average: 2.5 }])).toBe(3.75);
  });
});

describe("groupByConstruct + themeDeltasToOrg with overallAverage10", () => {
  it("computes a per-theme delta against the report's own overall average", () => {
    const rows: ThemeableRow[] = [
      { questionId: "q1", construct: "Engagement", average: 5, scaleMin: 1, scaleMax: 5 }, // (5-1)/4*10 = 10
      { questionId: "q2", construct: "Support", average: 2.5, scaleMin: 1, scaleMax: 5 }, // (2.5-1)/4*10 = 3.75
    ];
    const overall = overallAverage10(rows);
    expect(overall).toBe(6.875);

    const groups = groupByConstruct(rows);
    const engagement = groups.find((g) => g.construct === "Engagement")!;
    const support = groups.find((g) => g.construct === "Support")!;
    expect(engagement.average10 - overall!).toBeCloseTo(3.125, 5);
    expect(support.average10 - overall!).toBeCloseTo(-3.125, 5);
  });
});

describe("themeDeltasToOrg", () => {
  it("only returns deltas for themes present in both sets", () => {
    const scopedRows: ThemeableRow[] = [{ questionId: "q1", construct: "Engagement", average: 5, scaleMin: 1, scaleMax: 5 }];
    const orgRows: ThemeableRow[] = [
      { questionId: "q1", construct: "Engagement", average: 4, scaleMin: 1, scaleMax: 5 },
      { questionId: "q2", construct: "Growth", average: 3, scaleMin: 1, scaleMax: 5 },
    ];
    const deltas = themeDeltasToOrg(groupByConstruct(scopedRows), groupByConstruct(orgRows));
    // scoped: (5-1)/4*10=10. org: (4-1)/4*10=7.5. delta=2.5.
    expect(deltas.get("Engagement")).toBeCloseTo(2.5, 5);
    expect(deltas.has("Growth")).toBe(false);
  });
});
