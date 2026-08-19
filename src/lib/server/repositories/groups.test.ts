import { describe, expect, it } from "vitest";
import { IdentityRepository } from "./identityRepository";
import type { Queryable } from "@/lib/server/db/tenantPool";

function fakeDb(): { db: Queryable; queries: Array<{ sql: string; params: unknown[] }> } {
  const queries: Array<{ sql: string; params: unknown[] }> = [];
  const db: Queryable = {
    query: (async (sql: string, params: unknown[] = []) => {
      queries.push({ sql, params });
      if (sql.includes("group by team")) {
        return { rows: [{ team: "engineering", member_count: "5" }, { team: "sales", member_count: "2" }] };
      }
      return { rows: [], rowCount: 1 };
    }) as Queryable["query"],
  };
  return { db, queries };
}

describe("group (team) management", () => {
  it("listTeams returns normalized team labels with member counts", async () => {
    const { db } = fakeDb();
    const result = await new IdentityRepository(db).listTeams("tenant-1");
    expect(result).toEqual([
      { team: "engineering", memberCount: 5 },
      { team: "sales", memberCount: 2 },
    ]);
  });

  it("listTeams scopes to active employees only, matching countActiveEmployees' convention", async () => {
    const { db, queries } = fakeDb();
    await new IdentityRepository(db).listTeams("tenant-1");
    expect(queries[0].sql).toContain("employment_status = 'active'");
  });

  it("renameTeam normalizes both the source and target labels before updating", async () => {
    const { db, queries } = fakeDb();
    await new IdentityRepository(db).renameTeam("tenant-1", "  Engineering ", "Product Engineering");
    expect(queries[0].params).toEqual(["tenant-1", "engineering", "product engineering"]);
  });

  it("renameTeam rejects an empty target name without querying the database", async () => {
    const { db, queries } = fakeDb();
    await expect(new IdentityRepository(db).renameTeam("tenant-1", "engineering", "   ")).rejects.toThrow();
    expect(queries).toHaveLength(0);
  });

  it("mergeTeams applies renameTeam once per source label, skipping a source that already equals the target", async () => {
    const { db, queries } = fakeDb();
    const updated = await new IdentityRepository(db).mergeTeams("tenant-1", ["Sales", "sales", "Marketing"], "Sales");
    // "Sales" normalizes to the target and is skipped; "sales" also normalizes to the target and is skipped;
    // only "Marketing" differs and triggers an update.
    expect(queries).toHaveLength(1);
    expect(queries[0].params).toEqual(["tenant-1", "marketing", "sales"]);
    expect(updated).toBe(1);
  });
});
