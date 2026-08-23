import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import { ResponseRepository, nextRunAtFrom } from "./responseRepository";
import type { Queryable } from "@/lib/server/db/tenantPool";

describe("nextRunAtFrom", () => {
  const anchor = new Date("2026-01-15T00:00:00Z");

  it("weekly adds 7 days", () => {
    expect(nextRunAtFrom(anchor, "weekly").toISOString()).toBe("2026-01-22T00:00:00.000Z");
  });

  it("monthly adds a calendar month, anchored to the same day", () => {
    expect(nextRunAtFrom(anchor, "monthly").toISOString()).toBe("2026-02-15T00:00:00.000Z");
  });

  it("quarterly adds 3 calendar months", () => {
    expect(nextRunAtFrom(anchor, "quarterly").toISOString()).toBe("2026-04-15T00:00:00.000Z");
  });
});

describe("survey recurrence CRUD", () => {
  it("createRecurrence computes next_run_at from the interval, not a caller-supplied value", async () => {
    const queries: Array<{ sql: string; params: unknown[] }> = [];
    const db: Queryable = {
      query: (async (sql: string, params: unknown[] = []) => {
        queries.push({ sql, params });
        return { rows: [] };
      }) as Queryable["query"],
    };
    await new ResponseRepository(db).createRecurrence({ tenantId: "tenant-1", templateSlug: "engagement-check", interval: "monthly", autoSend: true });
    expect(queries[0].params[3]).toBe("monthly");
    expect(queries[0].params[5]).toBeInstanceOf(Date);
  });

  it("listRecurrencesForTenant maps disabled_at to a boolean, never leaks the raw timestamp shape", async () => {
    const db: Queryable = {
      query: (async (_sql: string) => ({
        rows: [{ id: "r1", template_slug: "engagement-check", interval: "monthly", auto_send: true, next_run_at: "2026-02-01", disabled_at: null }],
      })) as Queryable["query"],
    };
    const result = await new ResponseRepository(db).listRecurrencesForTenant("tenant-1");
    expect(result).toEqual([{ id: "r1", templateSlug: "engagement-check", interval: "monthly", autoSend: true, nextRunAt: "2026-02-01", disabled: false }]);
  });

  it("deleteRecurrence scopes to the tenant, returns false when nothing matched", async () => {
    const db: Queryable = { query: (async (_sql: string) => ({ rows: [], rowCount: 0 })) as Queryable["query"] };
    const result = await new ResponseRepository(db).deleteRecurrence("tenant-1", "missing");
    expect(result).toBe(false);
  });
});

describe("survey_recurrences migration", () => {
  const migration = readFileSync("db/migrations/0033_survey_recurrences.sql", "utf8");

  it("enables RLS with a tenant-isolation policy, same as every other tenant-scoped table", () => {
    expect(migration).toContain("alter table responses.survey_recurrences enable row level security");
    expect(migration).toContain("create policy tenant_isolation on responses.survey_recurrences");
  });

  it("restricts interval to the three supported values", () => {
    expect(migration).toContain("check (interval in ('weekly', 'monthly', 'quarterly'))");
  });
});

describe("cycle-scheduler route", () => {
  const route = readFileSync("src/app/api/internal/cycle-scheduler/route.ts", "utf8");

  it("fails closed when no secret is configured, same as retention-purge", () => {
    expect(route).toContain('"Cycle scheduler is not configured."');
    expect(route).toContain("status: 503");
  });

  it("authenticates with the same Bearer-secret convention as retention-purge", () => {
    expect(route).toContain("Authorization");
    expect(route).toContain("`Bearer ${secret}`");
  });
});
