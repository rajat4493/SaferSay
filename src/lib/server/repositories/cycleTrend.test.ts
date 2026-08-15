import { describe, expect, it } from "vitest";
import { ResponseRepository } from "./responseRepository";
import type { Queryable } from "@/lib/server/db/tenantPool";

/**
 * Fake Queryable that routes on a distinguishing substring of the SQL text,
 * so getCrossCycleTrendForTenant's two queries (cycle list, then trend
 * rows) can be driven independently without a real Postgres connection.
 */
function fakeDb(handlers: { cycles: unknown[]; trend: unknown[] }): Queryable {
  return {
    query: (async (sql: string) => {
      if (sql.includes("responses.survey_cycles c")) return { rows: handlers.cycles };
      if (sql.includes("responses.report_question_trend")) return { rows: handlers.trend };
      throw new Error(`Unexpected query in test: ${sql}`);
    }) as Queryable["query"],
  };
}

const tenantId = "tenant-1";

describe("getCrossCycleTrendForTenant", () => {
  it("matches a question across cycles by normalized text even when question_id differs", async () => {
    // Mirrors surveyCycleService.ts: an edited template gets a fresh
    // question_id per cycle, so cycle A's and cycle B's "How supported..."
    // question share text but not id.
    const db = fakeDb({
      cycles: [
        { id: "cycle-b", name: "Q2 Pulse", status: "closed", min_group_size: 5, created_at: "2026-04-01", response_count: 8 },
        { id: "cycle-a", name: "Q1 Pulse", status: "closed", min_group_size: 5, created_at: "2026-01-01", response_count: 6 },
      ],
      trend: [
        { cycle_id: "cycle-a", question_id: "q-a1", question_text: "How supported do you feel?", n: 6, average: "3.5", protected: false },
        { cycle_id: "cycle-b", question_id: "q-b1", question_text: "how supported do you feel? ", n: 8, average: "4.0", protected: false },
      ],
    });

    const result = await new ResponseRepository(db).getCrossCycleTrendForTenant(tenantId);

    expect(result).toHaveLength(1);
    expect(result[0].points.map((p) => p.cycleId)).toEqual(["cycle-a", "cycle-b"]); // oldest first
    expect(result[0].points.map((p) => p.average)).toEqual([3.5, 4]);
  });

  it("keeps a question below its cycle's min_group_size hidden as protected, not a real average", async () => {
    const db = fakeDb({
      cycles: [
        { id: "cycle-b", name: "Q2 Pulse", status: "closed", min_group_size: 5, created_at: "2026-04-01", response_count: 8 },
        { id: "cycle-a", name: "Q1 Pulse", status: "closed", min_group_size: 5, created_at: "2026-01-01", response_count: 2 },
      ],
      trend: [
        { cycle_id: "cycle-a", question_id: "q-a1", question_text: "Team trust", n: 2, average: null, protected: true },
        { cycle_id: "cycle-b", question_id: "q-b1", question_text: "Team trust", n: 8, average: "4.2", protected: false },
      ],
    });

    const result = await new ResponseRepository(db).getCrossCycleTrendForTenant(tenantId);

    const point = result[0].points.find((p) => p.cycleId === "cycle-a");
    expect(point?.protected).toBe(true);
    expect(point?.average).toBeNull();
  });

  it("omits a question with only one cycle of history -- nothing to compare, so no trend line", async () => {
    const db = fakeDb({
      cycles: [
        { id: "cycle-b", name: "Q2 Pulse", status: "closed", min_group_size: 5, created_at: "2026-04-01", response_count: 8 },
        { id: "cycle-a", name: "Q1 Pulse", status: "closed", min_group_size: 5, created_at: "2026-01-01", response_count: 6 },
      ],
      trend: [
        // Reworded before cycle-b, so it only ever appears once under any
        // given text -- surfaced as no trend line, not a special label.
        { cycle_id: "cycle-a", question_id: "q-a1", question_text: "Old wording", n: 6, average: "3.0", protected: false },
        { cycle_id: "cycle-b", question_id: "q-b1", question_text: "New wording", n: 8, average: "3.2", protected: false },
      ],
    });

    const result = await new ResponseRepository(db).getCrossCycleTrendForTenant(tenantId);

    expect(result).toHaveLength(0);
  });

  it("returns nothing for a tenant with zero cycles", async () => {
    const db = fakeDb({ cycles: [], trend: [] });
    const result = await new ResponseRepository(db).getCrossCycleTrendForTenant(tenantId);
    expect(result).toEqual([]);
  });
});
