import { randomUUID } from "node:crypto";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { Pool } from "pg";
import { IdentityRepository } from "@/lib/server/repositories/identityRepository";
import type { BrandTheme } from "@/lib/brand";

// Exercises the real JSONB round-trip for getBrand/setBrand -- the fake-
// Queryable unit tests in tenantBrand.test.ts cover the repository's own
// query shape, but not whether Postgres actually serializes/deserializes
// the object correctly through the pg driver's jsonb handling.
const connectionString = process.env.SAFERSAY_TEST_DATABASE_URL;
const describeIfDb = connectionString ? describe : describe.skip;

describeIfDb("Postgres live tenant brand", () => {
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
      await pool.query("delete from identity.tenant_settings where tenant_id = $1", [tenantId]);
      await pool.query("delete from identity.tenants where id = $1", [tenantId]);
    }
  });

  it("returns null before any brand is saved, then round-trips the exact object afterward", async () => {
    const identity = new IdentityRepository(pool);
    const tenant = await identity.createTenant("Brand E2E", `brand-e2e-${randomUUID()}`);
    tenantIds.push(tenant.id);

    expect(await identity.getBrand(tenant.id)).toBeNull();

    const brand: BrandTheme = { name: "Acme Corp", tagline: "We ship things.", logoDataUrl: "data:image/png;base64,abc", accentColor: "#3366cc", fontFamily: "georgia" };
    await identity.setBrand(tenant.id, brand);

    expect(await identity.getBrand(tenant.id)).toEqual(brand);
  }, 30_000);

  it("a second save overwrites the first, not merges", async () => {
    const identity = new IdentityRepository(pool);
    const tenant = await identity.createTenant("Brand E2E 2", `brand-e2e-2-${randomUUID()}`);
    tenantIds.push(tenant.id);

    await identity.setBrand(tenant.id, { name: "First", tagline: "A", logoDataUrl: null, accentColor: "#111111", fontFamily: "inter" });
    await identity.setBrand(tenant.id, { name: "Second", tagline: "B", logoDataUrl: null, accentColor: null, fontFamily: null });

    const result = await identity.getBrand(tenant.id);
    expect(result).toEqual({ name: "Second", tagline: "B", logoDataUrl: null, accentColor: null, fontFamily: null });
  }, 30_000);
});
