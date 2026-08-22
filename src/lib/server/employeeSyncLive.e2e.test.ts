import { randomUUID } from "node:crypto";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { Pool } from "pg";
import { IdentityRepository } from "@/lib/server/repositories/identityRepository";

// Exercises the real coalesce-on-upsert behavior for external_id/
// source_system (0031_employee_sync.sql) against real Postgres -- a plain
// CSV re-import (which never supplies these fields) must not blank out a
// value an earlier HRIS sync already set for the same employee.
const connectionString = process.env.SAFERSAY_TEST_DATABASE_URL;
const describeIfDb = connectionString ? describe : describe.skip;

describeIfDb("Postgres live employee sync upsert", () => {
  let pool: Pool;
  const tenantIds: string[] = [];

  beforeAll(() => {
    pool = new Pool({ connectionString, ssl: { rejectUnauthorized: false } });
  });

  afterAll(async () => {
    await pool.end();
  });

  afterEach(async () => {
    for (const tenantId of tenantIds.splice(0)) {
      await pool.query("delete from identity.employees where tenant_id = $1", [tenantId]);
      await pool.query("delete from identity.tenant_settings where tenant_id = $1", [tenantId]);
      await pool.query("delete from identity.tenants where id = $1", [tenantId]);
    }
  });

  it("does not blank out a previously-synced external_id when a later CSV import omits it", async () => {
    const identity = new IdentityRepository(pool);
    const tenant = await identity.createTenant("Employee Sync E2E", `employee-sync-e2e-${randomUUID()}`);
    tenantIds.push(tenant.id);

    await identity.importEmployees(tenant.id, [{ email: "a@example.com", name: "A", externalId: "wd-123", sourceSystem: "workday" }]);
    await identity.importEmployees(tenant.id, [{ email: "a@example.com", name: "A (renamed)" }]); // plain CSV re-import, no externalId

    const result = await pool.query<{ external_id: string | null; source_system: string | null; name: string | null }>(
      "select external_id, source_system, name from identity.employees where tenant_id = $1 and email = 'a@example.com'",
      [tenant.id],
    );
    expect(result.rows[0]).toMatchObject({ external_id: "wd-123", source_system: "workday", name: "A (renamed)" });
  }, 30_000);

  it("lets a later HRIS sync legitimately overwrite external_id with a new value", async () => {
    const identity = new IdentityRepository(pool);
    const tenant = await identity.createTenant("Employee Sync E2E 2", `employee-sync-e2e-2-${randomUUID()}`);
    tenantIds.push(tenant.id);

    await identity.importEmployees(tenant.id, [{ email: "a@example.com", externalId: "wd-123", sourceSystem: "workday" }]);
    await identity.importEmployees(tenant.id, [{ email: "a@example.com", externalId: "bh-999", sourceSystem: "bamboohr" }]);

    const result = await pool.query<{ external_id: string | null; source_system: string | null }>(
      "select external_id, source_system from identity.employees where tenant_id = $1 and email = 'a@example.com'",
      [tenant.id],
    );
    expect(result.rows[0]).toEqual({ external_id: "bh-999", source_system: "bamboohr" });
  }, 30_000);
});
