import { describe, expect, it } from "vitest";
import { IdentityRepository } from "./identityRepository";
import type { Queryable } from "@/lib/server/db/tenantPool";

/**
 * Fake Queryable that captures every query's SQL + params, so we can
 * assert the team filter is applied to BOTH the count and rows queries
 * (not just one), and that it's normalized the same way every other
 * team-label comparison in this codebase is (see normalizeTeamLabel).
 */
function fakeDb(): { db: Queryable; queries: Array<{ sql: string; params: unknown[] }> } {
  const queries: Array<{ sql: string; params: unknown[] }> = [];
  const db: Queryable = {
    query: (async (sql: string, params: unknown[] = []) => {
      queries.push({ sql, params });
      if (sql.includes("count(*)::text as count")) return { rows: [{ count: "2" }] };
      return { rows: [] };
    }) as Queryable["query"],
  };
  return { db, queries };
}

const tenantId = "tenant-1";

describe("listEmployees team filter", () => {
  it("applies an exact, normalized team match to both the count and rows queries", async () => {
    const { db, queries } = fakeDb();
    const result = await new IdentityRepository(db).listEmployees(tenantId, { team: "  Engineering  " });

    expect(result.total).toBe(2);
    expect(queries).toHaveLength(2);
    for (const { sql, params } of queries) {
      expect(sql).toContain("e.team = $2");
      expect(params.slice(0, 2)).toEqual([tenantId, "engineering"]);
    }
  });

  it("omits the team clause entirely when no team is given", async () => {
    const { db, queries } = fakeDb();
    await new IdentityRepository(db).listEmployees(tenantId, {});
    for (const { sql, params } of queries) {
      expect(sql).not.toContain("e.team =");
      expect(params[0]).toBe(tenantId);
    }
  });

  it("combines search and team as two independent conditions, correctly numbered", async () => {
    const { db, queries } = fakeDb();
    await new IdentityRepository(db).listEmployees(tenantId, { search: "alice", team: "sales" });
    const [{ sql, params }] = queries;
    expect(sql).toContain("$2");
    expect(sql).toContain("e.team = $3");
    expect(params).toEqual([tenantId, "%alice%", "sales"]);
  });
});
