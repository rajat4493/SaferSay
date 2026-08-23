import { describe, expect, it } from "vitest";
import { ResponseRepository } from "./responseRepository";
import type { Queryable } from "@/lib/server/db/tenantPool";

describe("closeCycle", () => {
  it("sets status and actual_closed_at, scoped to the tenant and cycle, and returns the updated row", async () => {
    const queries: Array<{ sql: string; params: unknown[] }> = [];
    const db: Queryable = {
      query: (async (sql: string, params: unknown[] = []) => {
        queries.push({ sql, params });
        return { rows: [{ id: "cycle-1", status: "closed" }], rowCount: 1 };
      }) as Queryable["query"],
    };
    const result = await new ResponseRepository(db).closeCycle("tenant-1", "cycle-1");
    expect(result).toEqual({ closed: true, row: { id: "cycle-1", status: "closed" } });
    expect(queries[0].sql).toContain("actual_closed_at = now()");
    expect(queries[0].sql).toContain("where tenant_id = $1 and id = $2");
    expect(queries[0].sql).toContain("returning id, status");
    expect(queries[0].params).toEqual(["tenant-1", "cycle-1"]);
  });

  it("when it can't close, looks up why (not found / already closed / wrong tenant) instead of a bare false", async () => {
    const db: Queryable = {
      query: (async (sql: string) => {
        if (sql.includes("update responses.survey_cycles")) return { rows: [], rowCount: 0 };
        return { rows: [{ id: "cycle-1", status: "closed", tenant_id: "tenant-1" }] };
      }) as unknown as Queryable["query"],
    };
    const result = await new ResponseRepository(db).closeCycle("tenant-1", "cycle-1");
    expect(result).toEqual({ closed: false, existing: { id: "cycle-1", status: "closed", tenant_id: "tenant-1" } });
  });

  it("reports a cycle that genuinely doesn't exist as such, distinct from already-closed", async () => {
    const db: Queryable = {
      query: (async (sql: string) => {
        if (sql.includes("update responses.survey_cycles")) return { rows: [], rowCount: 0 };
        return { rows: [] };
      }) as unknown as Queryable["query"],
    };
    const result = await new ResponseRepository(db).closeCycle("tenant-1", "cycle-missing");
    expect(result).toEqual({ closed: false, existing: null });
  });
});
