import { describe, expect, it } from "vitest";
import { computeGroupReleasability } from "./groupSuppression";

describe("computeGroupReleasability", () => {
  it("marks a group below threshold as not releasable", () => {
    const result = computeGroupReleasability([{ id: "a", n: 2 }], 5);
    expect(result.get("a")).toEqual({ n: 2, releasable: false });
  });

  it("marks a group at or above threshold as releasable when no complementary suppression applies", () => {
    const result = computeGroupReleasability(
      [
        { id: "a", n: 6 },
        { id: "b", n: 8 },
      ],
      5,
    );
    expect(result.get("a")).toEqual({ n: 6, releasable: true });
    expect(result.get("b")).toEqual({ n: 8, releasable: true });
  });

  it("additionally suppresses the smallest releasable group when exactly one other group is the sole below-threshold remainder", () => {
    const result = computeGroupReleasability(
      [
        { id: "small", n: 6 },
        { id: "large", n: 20 },
        { id: "below", n: 2 },
      ],
      5,
    );
    expect(result.get("below")).toEqual({ n: 2, releasable: false }); // naturally below
    expect(result.get("small")).toEqual({ n: 6, releasable: false }); // additionally suppressed -- smallest releasable
    expect(result.get("large")).toEqual({ n: 20, releasable: true }); // stays visible
  });

  it("does NOT trigger complementary suppression when two or more groups are below threshold (ambiguity already exists)", () => {
    const result = computeGroupReleasability(
      [
        { id: "a", n: 6 },
        { id: "below1", n: 2 },
        { id: "below2", n: 3 },
      ],
      5,
    );
    expect(result.get("a")).toEqual({ n: 6, releasable: true });
  });

  it("does not suppress anything when nothing is below threshold", () => {
    const result = computeGroupReleasability(
      [
        { id: "a", n: 6 },
        { id: "b", n: 7 },
      ],
      5,
    );
    expect(result.get("a")?.releasable).toBe(true);
    expect(result.get("b")?.releasable).toBe(true);
  });
});
