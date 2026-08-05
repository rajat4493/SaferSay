import { randomUUID } from "node:crypto";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { Pool } from "pg";
import { IdentityRepository } from "@/lib/server/repositories/identityRepository";
import { withTenantContext } from "@/lib/server/db/tenantPool";

/**
 * Proves the RLS guarantee in docs/strategy/SAFERSAY_CONFIDENTIALITY.md
 * §1.2: a query executed in tenant A's context cannot return tenant B's
 * rows, even with an explicit cross-tenant WHERE clause -- the database
 * itself refuses the row, not just the application's own filtering.
 *
 * Requires two real connection strings against the same database:
 * SAFERSAY_TEST_DATABASE_URL (privileged, for fixture setup/teardown) and
 * SAFERSAY_TEST_APP_DATABASE_URL (the restricted safersay_app role, what
 * the isolation claim is actually about). Skipped locally when unset.
 */
const adminConnectionString = process.env.SAFERSAY_TEST_DATABASE_URL;
const appConnectionString = process.env.SAFERSAY_TEST_APP_DATABASE_URL;
const describeIfDb = adminConnectionString && appConnectionString ? describe : describe.skip;

describeIfDb("RLS tenant isolation (restricted role)", () => {
  let adminPool: Pool;
  let appPool: Pool;
  const tenantIds: string[] = [];

  beforeAll(() => {
    adminPool = new Pool({ connectionString: adminConnectionString, ssl: { rejectUnauthorized: false } });
    appPool = new Pool({ connectionString: appConnectionString, ssl: { rejectUnauthorized: false } });
  });

  afterAll(async () => {
    await adminPool.end();
    await appPool.end();
  });

  afterEach(async () => {
    for (const tenantId of tenantIds.splice(0)) {
      await adminPool.query("delete from identity.employees where tenant_id = $1", [tenantId]);
      await adminPool.query("delete from identity.tenant_settings where tenant_id = $1", [tenantId]);
      await adminPool.query("delete from identity.tenants where id = $1", [tenantId]);
    }
  });

  async function seedTenantWithEmployees(name: string, count: number) {
    const identity = new IdentityRepository(adminPool);
    const tenant = await identity.createTenant(name, `rls-isolation-${randomUUID()}`);
    tenantIds.push(tenant.id);
    await identity.importEmployees(
      tenant.id,
      Array.from({ length: count }, (_, index) => ({ email: `rls-${index}-${randomUUID()}@example.com` })),
    );
    return tenant;
  }

  it("connects as a real non-superuser role", async () => {
    const result = await appPool.query("select current_user, current_setting('is_superuser') as is_superuser");
    expect(result.rows[0].is_superuser).toBe("off");
    expect(result.rows[0].current_user).not.toBe("postgres");
  });

  it("scoped to tenant A, only returns tenant A's rows -- even with no WHERE clause at all", async () => {
    const tenantA = await seedTenantWithEmployees("RLS Isolation Tenant A", 3);
    const tenantB = await seedTenantWithEmployees("RLS Isolation Tenant B", 5);

    const rowsForA = await withTenantContext(appPool, tenantA.id, (client) =>
      client.query("select tenant_id from identity.employees"),
    );
    expect(rowsForA.rows).toHaveLength(3);
    expect(rowsForA.rows.every((row) => row.tenant_id === tenantA.id)).toBe(true);

    const rowsForB = await withTenantContext(appPool, tenantB.id, (client) =>
      client.query("select tenant_id from identity.employees"),
    );
    expect(rowsForB.rows).toHaveLength(5);
    expect(rowsForB.rows.every((row) => row.tenant_id === tenantB.id)).toBe(true);
  });

  it("refuses an explicit cross-tenant WHERE clause -- the exact bug this exists to survive", async () => {
    const tenantA = await seedTenantWithEmployees("RLS Isolation Tenant C", 2);
    const tenantB = await seedTenantWithEmployees("RLS Isolation Tenant D", 4);

    // Simulates the "one missing/wrong WHERE clause" failure mode directly:
    // scoped to A, but the query explicitly asks for B's rows by id.
    const leaked = await withTenantContext(appPool, tenantA.id, (client) =>
      client.query("select * from identity.employees where tenant_id = $1", [tenantB.id]),
    );
    expect(leaked.rows).toHaveLength(0);
  });

  it("fails closed when no tenant context is set, rather than returning everything", async () => {
    await seedTenantWithEmployees("RLS Isolation Tenant E", 1);
    const client = await appPool.connect();
    try {
      await client.query("BEGIN");
      await expect(client.query("select * from identity.employees")).rejects.toThrow();
    } finally {
      await client.query("ROLLBACK").catch(() => undefined);
      client.release();
    }
  });

  it("never grants direct read access to raw response content", async () => {
    await expect(appPool.query("select * from responses.answers limit 1")).rejects.toThrow(/permission denied/);
  });
});
