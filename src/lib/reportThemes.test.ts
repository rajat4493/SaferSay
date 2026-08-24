import { describe, expect, it } from "vitest";
import { groupByConstruct, overallAverage10, themeDeltasToOrg, type ThemeableRow } from "./reportThemes";

describe("overallAverage10", () => {
  it("returns null when there are no scored rows", () => {
    expect(overallAverage10([])).toBeNull();
    expect(overallAverage10([{ questionId: "q1", average: null }])).toBeNull();
  });

  it("averages a single 5-point-scale row, normalized to /10", () => {
    expect(overallAverage10([{ questionId: "q1", average: 4, scaleMax: 5 }])).toBe(8);
  });

  it("averages mixed likert_5 and enps_0_10 rows on a common /10 scale", () => {
    // 4/5 -> 8, 8/10 -> 8: both already 8 on the normalized scale.
    const result = overallAverage10([
      { questionId: "q1", average: 4, scaleMax: 5 },
      { questionId: "q2", average: 8, scaleMax: 10 },
    ]);
    expect(result).toBe(8);
  });

  it("defaults to a 5-point scale when scaleMax is omitted", () => {
    expect(overallAverage10([{ questionId: "q1", average: 2.5 }])).toBe(5);
  });
});

describe("groupByConstruct + themeDeltasToOrg with overallAverage10", () => {
  it("computes a per-theme delta against the report's own overall average", () => {
    const rows: ThemeableRow[] = [
      { questionId: "q1", construct: "Engagement", average: 5, scaleMax: 5 }, // 10
      { questionId: "q2", construct: "Support", average: 2.5, scaleMax: 5 }, // 5
    ];
    const overall = overallAverage10(rows);
    expect(overall).toBe(7.5);

    const groups = groupByConstruct(rows);
    const engagement = groups.find((g) => g.construct === "Engagement")!;
    const support = groups.find((g) => g.construct === "Support")!;
    expect(engagement.average10 - overall!).toBe(2.5);
    expect(support.average10 - overall!).toBe(-2.5);
  });
});

describe("themeDeltasToOrg", () => {
  it("only returns deltas for themes present in both sets", () => {
    const scopedRows: ThemeableRow[] = [{ questionId: "q1", construct: "Engagement", average: 5, scaleMax: 5 }];
    const orgRows: ThemeableRow[] = [
      { questionId: "q1", construct: "Engagement", average: 4, scaleMax: 5 },
      { questionId: "q2", construct: "Growth", average: 3, scaleMax: 5 },
    ];
    const deltas = themeDeltasToOrg(groupByConstruct(scopedRows), groupByConstruct(orgRows));
    expect(deltas.get("Engagement")).toBeCloseTo(2, 5);
    expect(deltas.has("Growth")).toBe(false);
  });
});
