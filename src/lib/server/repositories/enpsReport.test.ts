import { describe, expect, it } from "vitest";
import { ResponseRepository } from "./responseRepository";
import type { Queryable } from "@/lib/server/db/tenantPool";

/**
 * Fake Queryable that routes on a distinguishing substring of the SQL
 * text, mirroring optionReport.test.ts's pattern for
 * getProtectedOptionReport -- getProtectedEnpsReport has the same
 * two-query shape (whole-cycle count, then per-bucket tallies).
 */
function fakeDb(handlers: { count: number; buckets: unknown[] }): Queryable {
  return {
    query: (async (sql: string) => {
      if (sql.includes("count(*)::text as n from responses.submissions")) {
        return { rows: [{ n: String(handlers.count) }] };
      }
      if (sql.includes("responses.report_enps_buckets")) return { rows: handlers.buckets };
      throw new Error(`Unexpected query in test: ${sql}`);
    }) as Queryable["query"],
  };
}

const tenantId = "tenant-1";
const cycleId = "cycle-1";

describe("getProtectedEnpsReport", () => {
  it("suppresses the whole report when the cycle's total respondent count is below threshold", async () => {
    const db = fakeDb({ count: 3, buckets: [] });
    const result = await new ResponseRepository(db).getProtectedEnpsReport(tenantId, cycleId, 5);
    expect(result).toEqual({ protected: true, n: 3, rows: [] });
  });

  it("computes promoter/passive/detractor percentages and the NPS score when all three buckets clear threshold", async () => {
    const db = fakeDb({
      count: 20,
      buckets: [
        { question_id: "q1", question_text: "How likely are you to recommend us?", bucket: "promoter", n: 10 },
        { question_id: "q1", question_text: "How likely are you to recommend us?", bucket: "passive", n: 5 },
        { question_id: "q1", question_text: "How likely are you to recommend us?", bucket: "detractor", n: 5 },
      ],
    });

    const result = await new ResponseRepository(db).getProtectedEnpsReport(tenantId, cycleId, 5);

    expect(result.protected).toBe(false);
    if (result.protected) throw new Error("unreachable");
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]).toMatchObject({ n: 20, promoterPct: 50, passivePct: 25, detractorPct: 25, score: 25 });
  });

  it("drops the whole question when any single bucket is below threshold -- never a partial breakdown", async () => {
    // Regression guard for the exact differencing-attack shape the doc
    // comment on ProtectedEnpsReport warns about: releasing two of three
    // bucket counts alongside the question's already-known total would let
    // the third (suppressed) bucket be back-calculated by subtraction. The
    // repository's own SQL already filters to r.protected = false, so a
    // suppressed detractor bucket (n=2, below min_n=5) simply never appears
    // here -- this test locks in that promoter+passive alone don't leak
    // through as a partial row.
    const db = fakeDb({
      count: 20,
      buckets: [
        { question_id: "q1", question_text: "How likely are you to recommend us?", bucket: "promoter", n: 10 },
        { question_id: "q1", question_text: "How likely are you to recommend us?", bucket: "passive", n: 8 },
        // "detractor" (n=2, below min_n=5) already excluded by `r.protected = false`.
      ],
    });

    const result = await new ResponseRepository(db).getProtectedEnpsReport(tenantId, cycleId, 5);

    expect(result.protected).toBe(false);
    if (result.protected) throw new Error("unreachable");
    expect(result.rows).toHaveLength(0);
  });

  it("keeps multiple eNPS questions independent", async () => {
    const db = fakeDb({
      count: 20,
      buckets: [
        { question_id: "q1", question_text: "Recommend to a friend?", bucket: "promoter", n: 6 },
        { question_id: "q1", question_text: "Recommend to a friend?", bucket: "passive", n: 6 },
        { question_id: "q1", question_text: "Recommend to a friend?", bucket: "detractor", n: 6 },
        { question_id: "q2", question_text: "Recommend the benefits plan?", bucket: "promoter", n: 5 },
        // q2's passive/detractor are below threshold -- q2 should be dropped, q1 kept.
      ],
    });

    const result = await new ResponseRepository(db).getProtectedEnpsReport(tenantId, cycleId, 5);

    expect(result.protected).toBe(false);
    if (result.protected) throw new Error("unreachable");
    expect(result.rows.map((r) => r.questionId)).toEqual(["q1"]);
  });
});
