import { randomUUID } from "node:crypto";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { Pool } from "pg";
import { IdentityRepository } from "@/lib/server/repositories/identityRepository";

// Exercises manager_id resolution against real Postgres -- the second
// pass in importEmployees that turns manager_email (free text) into a
// real self-referencing FK, which the report-rollup logic climbs.
const connectionString = process.env.SAFERSAY_TEST_DATABASE_URL;
const describeIfDb = connectionString ? describe : describe.skip;

describeIfDb("Postgres live manager hierarchy resolution", () => {
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

  it("resolves manager_id even when the manager appears later in the same import batch", async () => {
    const identity = new IdentityRepository(pool);
    const tenant = await identity.createTenant("Hierarchy E2E", `hierarchy-e2e-${randomUUID()}`);
    tenantIds.push(tenant.id);

    const reportEmail = `report-${randomUUID()}@example.com`;
    const managerEmail = `manager-${randomUUID()}@example.com`;
    // Report listed BEFORE their manager in the same batch -- the CSV/HRIS
    // payload has no ordering guarantee, and this must still resolve.
    await identity.importEmployees(tenant.id, [
      { email: reportEmail, managerEmail },
      { email: managerEmail },
    ]);

    const result = await pool.query<{ manager_id: string | null; id: string }>(
      "select id, manager_id from identity.employees where tenant_id = $1 and email = $2",
      [tenant.id, reportEmail],
    );
    const managerRow = await pool.query<{ id: string }>("select id from identity.employees where tenant_id = $1 and email = $2", [tenant.id, managerEmail]);
    expect(result.rows[0].manager_id).toBe(managerRow.rows[0].id);
  }, 30_000);

  it("builds a multi-level chain resolvable via WITH RECURSIVE", async () => {
    const identity = new IdentityRepository(pool);
    const tenant = await identity.createTenant("Hierarchy Chain E2E", `hierarchy-chain-e2e-${randomUUID()}`);
    tenantIds.push(tenant.id);

    const ceo = `ceo-${randomUUID()}@example.com`;
    const director = `director-${randomUUID()}@example.com`;
    const ic = `ic-${randomUUID()}@example.com`;
    await identity.importEmployees(tenant.id, [
      { email: ceo },
      { email: director, managerEmail: ceo },
      { email: ic, managerEmail: director, team: "Engineering" },
    ]);

    const chain = await pool.query<{ email: string; depth: number }>(
      `with recursive chain as (
         select id, email, manager_id, 0 as depth from identity.employees where tenant_id = $1 and email = $2
         union all
         select e.id, e.email, e.manager_id, chain.depth + 1
         from identity.employees e join chain on e.id = chain.manager_id
       )
       select email, depth from chain order by depth`,
      [tenant.id, ic],
    );
    expect(chain.rows.map((row) => row.email)).toEqual([ic, director, ceo]);
  }, 30_000);

  it("re-importing without managerEmail clears manager_id, matching manager_email's own overwrite semantics", async () => {
    const identity = new IdentityRepository(pool);
    const tenant = await identity.createTenant("Hierarchy Clear E2E", `hierarchy-clear-e2e-${randomUUID()}`);
    tenantIds.push(tenant.id);

    const reportEmail = `report-${randomUUID()}@example.com`;
    const managerEmail = `manager-${randomUUID()}@example.com`;
    await identity.importEmployees(tenant.id, [{ email: managerEmail }, { email: reportEmail, managerEmail }]);
    await identity.importEmployees(tenant.id, [{ email: reportEmail }]); // re-import, no managerEmail this time

    const result = await pool.query<{ manager_id: string | null }>("select manager_id from identity.employees where tenant_id = $1 and email = $2", [
      tenant.id,
      reportEmail,
    ]);
    expect(result.rows[0].manager_id).toBeNull();
  }, 30_000);

  it("leaves manager_id null for a flat org that never fills in managerEmail", async () => {
    const identity = new IdentityRepository(pool);
    const tenant = await identity.createTenant("Flat Org E2E", `flat-org-e2e-${randomUUID()}`);
    tenantIds.push(tenant.id);

    await identity.importEmployees(tenant.id, [{ email: `a-${randomUUID()}@example.com` }, { email: `b-${randomUUID()}@example.com` }]);

    const result = await pool.query<{ manager_id: string | null }>("select manager_id from identity.employees where tenant_id = $1", [tenant.id]);
    expect(result.rows.every((row) => row.manager_id === null)).toBe(true);
  }, 30_000);
});
