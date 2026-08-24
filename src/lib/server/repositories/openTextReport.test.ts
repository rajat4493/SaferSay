import { describe, expect, it } from "vitest";
import { ResponseRepository } from "./responseRepository";
import type { Queryable } from "@/lib/server/db/tenantPool";

/** Routes on a distinguishing SQL substring, same pattern as cycleTrend.test.ts. */
function fakeDb(handlers: { count: string; textRows: unknown[] }): Queryable {
  return {
    query: (async (sql: string) => {
      if (sql.includes("select count(*)::text as n from responses.submissions")) {
        return { rows: [{ n: handlers.count }] };
      }
      if (sql.includes("responses.report_open_text_answers")) {
        return { rows: handlers.textRows };
      }
      throw new Error(`Unexpected query in test: ${sql}`);
    }) as Queryable["query"],
  };
}

/** Same routing idea, but for the department-scoped branch -- also needs
 * getDepartmentReleasability's own segment_team-grouped count query. */
function fakeDepartmentDb(handlers: { counts: unknown[]; textRows?: unknown[] }): Queryable {
  return {
    query: (async (sql: string) => {
      if (sql.includes("group by segment_team")) return { rows: handlers.counts };
      if (sql.includes("responses.report_open_text_answers_by_department")) return { rows: handlers.textRows ?? [] };
      throw new Error(`Unexpected query in test: ${sql}`);
    }) as Queryable["query"],
  };
}

const tenantId = "tenant-1";
const cycleId = "cycle-1";

describe("getProtectedOpenTextReport", () => {
  it("uses minGroupSize + 3 as the reveal threshold, not the bare numeric threshold", async () => {
    // 7 total submissions: below minGroupSize(5)+3=8, so the whole report
    // must stay protected even though 7 clears the numeric-score threshold.
    const db = fakeDb({ count: "7", textRows: [] });
    const report = await new ResponseRepository(db).getProtectedOpenTextReport(tenantId, cycleId, 5);
    expect(report).toEqual({ protected: true, n: 7, rows: [] });
  });

  it("returns real answers once minGroupSize + 3 is met, grouped by question", async () => {
    const db = fakeDb({
      count: "8",
      textRows: [
        { question_id: "q1", question_text: "What would help?", n: 8, text_value: "More clarity on priorities" },
        { question_id: "q1", question_text: "What would help?", n: 8, text_value: "Faster decisions" },
        { question_id: "q2", question_text: "Anything else?", n: 8, text_value: "No" },
      ],
    });
    const report = await new ResponseRepository(db).getProtectedOpenTextReport(tenantId, cycleId, 5);

    expect(report.protected).toBe(false);
    if (report.protected) throw new Error("unreachable");
    expect(report.n).toBe(8);
    expect(report.rows).toEqual([
      { questionId: "q1", label: "What would help?", construct: null, n: 8, answers: ["More clarity on priorities", "Faster decisions"] },
      { questionId: "q2", label: "Anything else?", construct: null, n: 8, answers: ["No"] },
    ]);
  });

  it("does not filter or redact answer text -- returns exactly what was stored", async () => {
    const db = fakeDb({
      count: "8",
      textRows: [{ question_id: "q1", question_text: "Feedback?", n: 8, text_value: "This is absolutely ridiculous and unacceptable" }],
    });
    const report = await new ResponseRepository(db).getProtectedOpenTextReport(tenantId, cycleId, 5);
    if (report.protected) throw new Error("unreachable");
    expect(report.rows[0].answers[0]).toBe("This is absolutely ridiculous and unacceptable");
  });

  describe("department scope", () => {
    it("suppresses a department below the (stricter, minGroupSize+3) text threshold, without revealing its real n", async () => {
      const db = fakeDepartmentDb({
        counts: [
          { segment_team: "engineering", n: "6" }, // clears numeric min_n=5 but not text's 8
          { segment_team: "sales", n: "20" },
        ],
      });
      const report = await new ResponseRepository(db).getProtectedOpenTextReport(tenantId, cycleId, 5, "engineering");
      expect(report).toEqual({ protected: true, n: 0, rows: [] });
    });

    it("applies the same complementary-suppression check department-scoped numeric reports use", async () => {
      // Only "support" is naturally below the text threshold (8). Releasing
      // both other departments' comments alongside the org total would let
      // "support"'s comments be inferred by elimination -- so the
      // smallest-n releasable department must also be suppressed here too,
      // exactly like getDepartmentReleasability's numeric-report guard.
      const db = fakeDepartmentDb({
        counts: [
          { segment_team: "engineering", n: "9" },
          { segment_team: "sales", n: "20" },
          { segment_team: "support", n: "2" },
        ],
      });
      const repo = new ResponseRepository(db);

      const engineeringReport = await repo.getProtectedOpenTextReport(tenantId, cycleId, 5, "engineering");
      expect(engineeringReport).toEqual({ protected: true, n: 0, rows: [] });

      const salesReport = await repo.getProtectedOpenTextReport(tenantId, cycleId, 5, "sales");
      expect(salesReport.protected).toBe(false);
    });

    it("returns real, construct-tagged comments for a releasable department", async () => {
      const db = fakeDepartmentDb({
        counts: [{ segment_team: "engineering", n: "9" }],
        textRows: [{ question_id: "q1", question_text: "What would help?", construct: "Support", n: 9, text_value: "More 1:1 time" }],
      });
      const report = await new ResponseRepository(db).getProtectedOpenTextReport(tenantId, cycleId, 5, "engineering");
      expect(report.protected).toBe(false);
      if (report.protected) throw new Error("unreachable");
      expect(report.rows).toEqual([{ questionId: "q1", label: "What would help?", construct: "Support", n: 9, answers: ["More 1:1 time"] }]);
    });
  });
});
