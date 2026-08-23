import { describe, it, expect, vi } from "vitest";
import type { Pool, PoolClient } from "pg";
import { purgeExpiredCycleData, purgeExpiredCycleDataForAllTenants } from "@/lib/server/dataRetentionService";

function makeMockClient(expiredCycleIds: string[]) {
  const calls: string[] = [];
  const client = {
    query: vi.fn(async (sql: string) => {
      calls.push(sql.trim().slice(0, 40));
      if (sql.includes("select id from responses.survey_cycles")) {
        return { rows: expiredCycleIds.map((id) => ({ id })), rowCount: expiredCycleIds.length };
      }
      if (sql.includes("delete from responses.answers")) return { rows: [], rowCount: expiredCycleIds.length * 3 };
      if (sql.includes("delete from responses.submissions")) return { rows: [], rowCount: expiredCycleIds.length };
      if (sql.includes("delete from identity.invite_outbox")) return { rows: [], rowCount: expiredCycleIds.length };
      if (sql.includes("delete from identity.survey_participants")) return { rows: [], rowCount: expiredCycleIds.length };
      if (sql.includes("insert into identity.tenant_settings")) return { rows: [], rowCount: 1 };
      return { rows: [], rowCount: 0 };
    }),
    release: vi.fn(),
  } as unknown as PoolClient;
  return { client, calls };
}

describe("purgeExpiredCycleData", () => {
  it("does nothing and touches no tables when no cycles are past retention", async () => {
    const { client } = makeMockClient([]);
    const pool = { connect: vi.fn(async () => client) } as unknown as Pool;

    const result = await purgeExpiredCycleData(pool, "tenant-1", 24);

    expect(result).toEqual({
      tenantId: "tenant-1",
      retentionMonths: 24,
      cyclesPurged: 0,
      submissionsDeleted: 0,
      answersDeleted: 0,
      participantsDeleted: 0,
    });
    expect(client.query).toHaveBeenCalledWith("BEGIN");
    expect(client.query).toHaveBeenCalledWith("COMMIT");
    expect(client.query).not.toHaveBeenCalledWith(expect.stringContaining("delete"), expect.anything());
  });

  it("deletes answers before submissions before participants, in dependency order", async () => {
    const { client, calls } = makeMockClient(["cycle-a", "cycle-b"]);
    const pool = { connect: vi.fn(async () => client) } as unknown as Pool;

    const result = await purgeExpiredCycleData(pool, "tenant-1", 24);

    expect(result.cyclesPurged).toBe(2);
    expect(result.submissionsDeleted).toBe(2);
    expect(result.answersDeleted).toBe(6);
    expect(result.participantsDeleted).toBe(2);

    const answersIndex = calls.findIndex((c) => c.includes("delete from responses.answers"));
    const submissionsIndex = calls.findIndex((c) => c.includes("delete from responses.submissions"));
    const participantsIndex = calls.findIndex((c) => c.includes("delete from identity.survey_participants"));
    expect(answersIndex).toBeLessThan(submissionsIndex);
    expect(submissionsIndex).toBeLessThan(participantsIndex);
  });

  it("rolls back and rethrows if a delete fails partway through", async () => {
    const client = {
      query: vi.fn(async (sql: string) => {
        if (sql.includes("select id from responses.survey_cycles")) return { rows: [{ id: "cycle-a" }], rowCount: 1 };
        if (sql.includes("delete from responses.answers")) throw new Error("db exploded");
        return { rows: [], rowCount: 0 };
      }),
      release: vi.fn(),
    } as unknown as PoolClient;
    const pool = { connect: vi.fn(async () => client) } as unknown as Pool;

    await expect(purgeExpiredCycleData(pool, "tenant-1", 24)).rejects.toThrow("db exploded");
    expect(client.query).toHaveBeenCalledWith("ROLLBACK");
    expect(client.release).toHaveBeenCalled();
  });
});

describe("purgeExpiredCycleDataForAllTenants", () => {
  it("runs the purge once per tenant using each tenant's own retention_months", async () => {
    const { client } = makeMockClient([]);
    const pool = {
      connect: vi.fn(async () => client),
      query: vi.fn(async (sql: string) => {
        expect(sql).toContain("left join identity.tenant_settings");
        return {
          rows: [
            { id: "tenant-1", retention_months: 24 },
            { id: "tenant-2", retention_months: 36 },
          ],
        };
      }),
    } as unknown as Pool;

    const results = await purgeExpiredCycleDataForAllTenants(pool);

    expect(results).toHaveLength(2);
    expect(results[0]).toMatchObject({ tenantId: "tenant-1", retentionMonths: 24 });
    expect(results[1]).toMatchObject({ tenantId: "tenant-2", retentionMonths: 36 });
  });
});
