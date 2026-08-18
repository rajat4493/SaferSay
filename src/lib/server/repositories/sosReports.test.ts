import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import { IdentityRepository } from "./identityRepository";
import type { Queryable } from "@/lib/server/db/tenantPool";

function fakeDb(): { db: Queryable; queries: Array<{ sql: string; params: unknown[] }> } {
  const queries: Array<{ sql: string; params: unknown[] }> = [];
  const db: Queryable = {
    query: (async (sql: string, params: unknown[] = []) => {
      queries.push({ sql, params });
      if (sql.includes("select safety_contact_email")) return { rows: [{ safety_contact_email: "hr@example.com" }] };
      if (sql.includes("select p.tenant_id, p.cycle_id, p.employee_id")) {
        return { rows: [{ tenant_id: "t1", cycle_id: "c1", employee_id: "e1", employee_email: "person@example.com", employee_name: "Person" }] };
      }
      return { rows: [] };
    }) as Queryable["query"],
  };
  return { db, queries };
}

describe("SOS repository methods", () => {
  it("getSafetyContactEmail returns null when unset, not a fallback contact", async () => {
    const db: Queryable = { query: (async (_sql: string) => ({ rows: [] })) as Queryable["query"] };
    const result = await new IdentityRepository(db).getSafetyContactEmail("tenant-1");
    expect(result).toBeNull();
  });

  it("getSafetyContactEmail returns the configured value", async () => {
    const { db } = fakeDb();
    const result = await new IdentityRepository(db).getSafetyContactEmail("tenant-1");
    expect(result).toBe("hr@example.com");
  });

  it("setSafetyContactEmail upserts against tenant_settings, keyed on tenant_id", async () => {
    const { db, queries } = fakeDb();
    await new IdentityRepository(db).setSafetyContactEmail("tenant-1", "safety@example.com");
    expect(queries[0].sql).toContain("insert into identity.tenant_settings");
    expect(queries[0].sql).toContain("on conflict (tenant_id) do update");
    expect(queries[0].params).toEqual(["tenant-1", "safety@example.com"]);
  });

  it("setSafetyContactEmail(null) clears the contact -- no fallback value is ever written", async () => {
    const { db, queries } = fakeDb();
    await new IdentityRepository(db).setSafetyContactEmail("tenant-1", null);
    expect(queries[0].params).toEqual(["tenant-1", null]);
  });

  it("findParticipantIdentityForSos is a distinct method from findIssuedToken -- does not select employee_id there", () => {
    const repoSource = readFileSync("src/lib/server/repositories/identityRepository.ts", "utf8");
    const findIssuedTokenBody = repoSource.slice(
      repoSource.indexOf("async findIssuedToken(tokenHash"),
      repoSource.indexOf("async findIssuedToken(tokenHash") + 400,
    );
    expect(findIssuedTokenBody).not.toContain("employee_id");
    expect(findIssuedTokenBody).not.toContain("identity.employees");
  });

  it("createSosReport always sets consent_ack = true -- the API layer must have already validated it", async () => {
    const { db, queries } = fakeDb();
    await new IdentityRepository(db).createSosReport({
      tenantId: "t1",
      cycleId: "c1",
      employeeId: "e1",
      message: "help",
      routedToEmail: "hr@example.com",
    });
    expect(queries[0].sql).toContain("consent_ack");
    expect(queries[0].sql).toContain("values ($1, $2, $3, $4, $5, true, $6)");
  });
});
