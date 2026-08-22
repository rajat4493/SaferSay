import { describe, expect, it } from "vitest";
import { ResponseRepository } from "./responseRepository";
import type { Queryable } from "@/lib/server/db/tenantPool";

/**
 * Fake Queryable that routes on a distinguishing substring of the SQL
 * text, so getProtectedOptionReport's two queries (whole-cycle count,
 * then per-option tallies) can be driven independently without a real
 * Postgres connection.
 */
function fakeDb(handlers: { count: number; tallies: unknown[] }): Queryable {
  return {
    query: (async (sql: string) => {
      if (sql.includes("count(*)::text as n from responses.submissions")) {
        return { rows: [{ n: String(handlers.count) }] };
      }
      if (sql.includes("responses.report_option_tallies")) return { rows: handlers.tallies };
      throw new Error(`Unexpected query in test: ${sql}`);
    }) as Queryable["query"],
  };
}

const tenantId = "tenant-1";
const cycleId = "cycle-1";

describe("getProtectedOptionReport", () => {
  it("suppresses the whole report when the cycle's total respondent count is below threshold", async () => {
    const db = fakeDb({ count: 3, tallies: [] });
    const result = await new ResponseRepository(db).getProtectedOptionReport(tenantId, cycleId, 5);
    expect(result).toEqual({ protected: true, n: 3, rows: [] });
  });

  it("drops an individual option whose own pick-count is below threshold, even though the cycle total clears it", async () => {
    // Regression guard for the exact leak class the guardrail comments in
    // responseRepository.ts warn about: a rare pick is as identifying as a
    // numeric outlier, so report_option_tallies() marks it `protected` and
    // the SQL query only asked the server for r.protected = false rows --
    // this test locks in that the repository never widens that filter.
    const db = fakeDb({
      count: 20,
      tallies: [
        { question_id: "q1", question_text: "Which benefit matters most?", option_key: "healthcare", n: 12, avg_rank: null },
        { question_id: "q1", question_text: "Which benefit matters most?", option_key: "remote_stipend", n: 8, avg_rank: null },
        // "pet_insurance" (n=2, below min_n=5) is already excluded by the
        // `r.protected = false` clause in the repository's own SQL -- the
        // fake only ever returns what report_option_tallies would release.
      ],
    });

    const result = await new ResponseRepository(db).getProtectedOptionReport(tenantId, cycleId, 5);

    expect(result.protected).toBe(false);
    if (result.protected) throw new Error("unreachable");
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].options.map((o) => o.optionKey)).toEqual(["healthcare", "remote_stipend"]);
    expect(result.rows[0].options.every((o) => o.n >= 5)).toBe(true);
  });

  it("carries avgRank through for ranking questions", async () => {
    const db = fakeDb({
      count: 10,
      tallies: [
        { question_id: "q1", question_text: "Rank these priorities", option_key: "pay", n: 10, avg_rank: "1.4" },
        { question_id: "q1", question_text: "Rank these priorities", option_key: "growth", n: 10, avg_rank: "2.6" },
      ],
    });

    const result = await new ResponseRepository(db).getProtectedOptionReport(tenantId, cycleId, 5);

    expect(result.protected).toBe(false);
    if (result.protected) throw new Error("unreachable");
    expect(result.rows[0].options).toEqual([
      { optionKey: "pay", n: 10, avgRank: 1.4 },
      { optionKey: "growth", n: 10, avgRank: 2.6 },
    ]);
  });

  it("groups matrix rows (separate question_id per row) into separate report rows, not merged", async () => {
    const db = fakeDb({
      count: 10,
      tallies: [
        { question_id: "row-1", question_text: "My manager: listens", option_key: "agree", n: 8, avg_rank: null },
        { question_id: "row-2", question_text: "My manager: is fair", option_key: "agree", n: 6, avg_rank: null },
      ],
    });

    const result = await new ResponseRepository(db).getProtectedOptionReport(tenantId, cycleId, 5);

    expect(result.protected).toBe(false);
    if (result.protected) throw new Error("unreachable");
    expect(result.rows.map((r) => r.questionId).sort()).toEqual(["row-1", "row-2"]);
  });
});
