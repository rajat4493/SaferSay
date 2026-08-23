import { describe, expect, it } from "vitest";
import { ResponseRepository } from "./responseRepository";
import type { Queryable } from "@/lib/server/db/tenantPool";

describe("closeCycle", () => {
  it("sets status and actual_closed_at, scoped to the tenant and cycle", async () => {
    const queries: Array<{ sql: string; params: unknown[] }> = [];
    const db: Queryable = {
      query: (async (sql: string, params: unknown[] = []) => {
        queries.push({ sql, params });
        return { rows: [], rowCount: 1 };
      }) as Queryable["query"],
    };
    const ok = await new ResponseRepository(db).closeCycle("tenant-1", "cycle-1");
    expect(ok).toBe(true);
    expect(queries[0].sql).toContain("actual_closed_at = now()");
    expect(queries[0].sql).toContain("where tenant_id = $1 and id = $2");
    expect(queries[0].params).toEqual(["tenant-1", "cycle-1"]);
  });

  it("returns false without throwing when the cycle is already closed (idempotent double-close)", async () => {
    const db: Queryable = {
      query: (async () => ({ rows: [] as never[], rowCount: 0 })) as unknown as Queryable["query"],
    };
    const ok = await new ResponseRepository(db).closeCycle("tenant-1", "cycle-1");
    expect(ok).toBe(false);
  });
});
