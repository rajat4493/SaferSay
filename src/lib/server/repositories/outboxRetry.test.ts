import { describe, expect, it } from "vitest";
import { IdentityRepository } from "./identityRepository";
import type { Queryable } from "@/lib/server/db/tenantPool";

/**
 * Fake Queryable that records every query and returns a canned rowCount
 * per call, routed by a distinguishing SQL substring -- same pattern as
 * responseRepository's cycleTrend.test.ts.
 */
function fakeDb(rowCounts: { reset?: number; insert?: number }): { db: Queryable; calls: string[] } {
  const calls: string[] = [];
  const db: Queryable = {
    query: (async (sql: string) => {
      if (sql.includes("set delivery_status = 'pending'")) {
        calls.push("reset");
        return { rowCount: rowCounts.reset ?? 0, rows: [] };
      }
      if (sql.includes("insert into identity.invite_outbox")) {
        calls.push("insert");
        return { rowCount: rowCounts.insert ?? 0, rows: [] };
      }
      throw new Error(`Unexpected query in test: ${sql}`);
    }) as Queryable["query"],
  };
  return { db, calls };
}

const tenantId = "tenant-1";
const cycleId = "cycle-1";

describe("prepareInviteOutbox retry behavior", () => {
  it("resets failed rows before inserting new ones, and combines both counts", async () => {
    const { db, calls } = fakeDb({ reset: 3, insert: 2 });
    const prepared = await new IdentityRepository(db).prepareInviteOutbox(tenantId, cycleId);

    expect(calls).toEqual(["reset", "insert"]); // reset must happen first
    expect(prepared).toBe(5); // 3 retried + 2 genuinely new
  });

  it("still works when nothing needs retrying", async () => {
    const { db } = fakeDb({ reset: 0, insert: 4 });
    const prepared = await new IdentityRepository(db).prepareInviteOutbox(tenantId, cycleId);
    expect(prepared).toBe(4);
  });
});

describe("prepareReminderOutbox retry behavior", () => {
  it("resets failed reminder rows before inserting new ones", async () => {
    const { db, calls } = fakeDb({ reset: 2, insert: 1 });
    const prepared = await new IdentityRepository(db).prepareReminderOutbox(tenantId, cycleId);

    expect(calls).toEqual(["reset", "insert"]);
    expect(prepared).toBe(3);
  });
});

describe("resetFailedOutbox SQL shape", () => {
  it("only resets failed rows for still-eligible participants, scoped to tenant/cycle/delivery type", async () => {
    const queries: Array<{ sql: string; params: unknown[] }> = [];
    const db: Queryable = {
      query: (async (sql: string, params: unknown[]) => {
        queries.push({ sql, params });
        return { rowCount: 0, rows: [] };
      }) as Queryable["query"],
    };
    await new IdentityRepository(db).prepareInviteOutbox(tenantId, cycleId);

    const resetCall = queries[0]; // reset runs before the insert
    expect(resetCall.sql).toContain("delivery_status = 'failed'");
    expect(resetCall.sql).toContain("token_status = 'issued'");
    expect(resetCall.sql).toContain("o.tenant_id = $1");
    expect(resetCall.sql).toContain("o.cycle_id = $2");
    expect(resetCall.sql).toContain("o.delivery_type = $3");
    expect(resetCall.params).toEqual([tenantId, cycleId, "invite"]);
  });
});
