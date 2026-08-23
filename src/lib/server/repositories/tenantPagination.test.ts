import { describe, expect, it } from "vitest";
import { IdentityRepository } from "./identityRepository";
import type { Queryable } from "@/lib/server/db/tenantPool";

/** Fake Queryable that returns `rowCount` fabricated rows, each carrying
 * the same `total_count` -- mirrors what count(*) over() actually returns
 * from Postgres (the full filtered total on every row, before LIMIT). */
function fakeDb(rowCount: number, total: number): Queryable {
  return {
    query: (async (_sql: string) => ({
      rows: Array.from({ length: rowCount }, (_, i) => ({
        id: `tenant-${i}`,
        name: `Tenant ${i}`,
        slug: `tenant-${i}`,
        created_at: "2026-01-01T00:00:00.000Z",
        plan_tier: "standard",
        employee_count: "3",
        latest_cycle_name: null,
        latest_cycle_status: null,
        last_activity_at: null,
        total_count: String(total),
      })),
    })) as Queryable["query"],
  };
}

describe("listTenantsWithStats pagination", () => {
  it("returns the page of tenants plus the full filtered total, not just the page size", async () => {
    const db = fakeDb(50, 237);
    const result = await new IdentityRepository(db).listTenantsWithStats({ limit: 50, offset: 0 });
    expect(result.tenants).toHaveLength(50);
    expect(result.total).toBe(237); // NOT 50 -- the caller needs the real total to paginate
  });

  it("clamps an oversized limit instead of letting a caller load the whole table", async () => {
    let capturedLimit: number | undefined;
    const db: Queryable = {
      query: (async (_sql: string, values?: unknown[]) => {
        capturedLimit = values?.[0] as number;
        return { rows: [] };
      }) as Queryable["query"],
    };
    await new IdentityRepository(db).listTenantsWithStats({ limit: 100000, offset: 0 });
    expect(capturedLimit).toBeLessThanOrEqual(200);
  });

  it("passes a search term through as a parameterized ilike pattern, not string-concatenated", async () => {
    let capturedSql = "";
    let capturedValues: unknown[] = [];
    const db: Queryable = {
      query: (async (sql: string, values?: unknown[]) => {
        capturedSql = sql;
        capturedValues = values ?? [];
        return { rows: [] };
      }) as Queryable["query"],
    };
    await new IdentityRepository(db).listTenantsWithStats({ search: "acme", limit: 10, offset: 0 });
    expect(capturedSql).toContain("ilike $3");
    expect(capturedValues).toContain("%acme%");
  });
});
