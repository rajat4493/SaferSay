import { randomUUID } from "node:crypto";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { Pool } from "pg";
import { IdentityRepository } from "@/lib/server/repositories/identityRepository";

// Exercises the real self-serve-signup gate (see authSession.ts's
// resolveUserRecord) against a live Postgres instance -- the disposable-
// email check and the DB-backed rate limit both need real rows (identity
// tables, identity.rate_limits) to prove they actually block a brand-new
// tenant from being created, not just that the pure helper functions
// return the right boolean in isolation.
const connectionString = process.env.SAFERSAY_TEST_DATABASE_URL;
const describeIfDb = connectionString ? describe : describe.skip;

let mockIp = "203.0.113.9";
vi.mock("next/headers", () => ({
  headers: async () => new Headers({ "x-forwarded-for": mockIp }),
  cookies: async () => ({ get: () => undefined }),
}));

describeIfDb("self-serve signup gate", () => {
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
      await pool.query("delete from identity.users where tenant_id = $1", [tenantId]);
      await pool.query("delete from identity.onboarding_events where tenant_id = $1", [tenantId]);
      await pool.query("delete from identity.tenant_settings where tenant_id = $1", [tenantId]);
      await pool.query("delete from identity.tenants where id = $1", [tenantId]);
    }
  });

  it("blocks a brand-new tenant for a disposable-email address, creating no rows", async () => {
    const { resolveUserRecord, SignupBlockedError } = await import("@/lib/server/authSession");
    const repo = new IdentityRepository(pool);
    const email = `throwaway-${randomUUID()}@mailinator.com`;

    await expect(resolveUserRecord(repo, randomUUID(), email, undefined, "supabase")).rejects.toBeInstanceOf(SignupBlockedError);

    const check = await pool.query("select 1 from identity.users where email = $1", [email]);
    expect(check.rowCount).toBe(0);
  });

  it("still allows a real-looking email through to create a tenant (no regression)", async () => {
    const { resolveUserRecord } = await import("@/lib/server/authSession");
    const repo = new IdentityRepository(pool);
    mockIp = `198.51.100.${Math.floor(Math.random() * 200) + 1}`;
    const email = `real-user-${randomUUID()}@example.com`;

    const user = await resolveUserRecord(repo, randomUUID(), email, undefined, "supabase");
    tenantIds.push(user.tenantId);

    expect(user.email).toBe(email);
    expect(user.role).toBe("customer_admin");
  });

  it("rate-limits repeated brand-new-tenant creation from the same IP", async () => {
    const { resolveUserRecord, SignupBlockedError } = await import("@/lib/server/authSession");
    const repo = new IdentityRepository(pool);
    mockIp = `198.51.100.${Math.floor(Math.random() * 200) + 1}`;

    for (let i = 0; i < 3; i++) {
      const user = await resolveUserRecord(repo, randomUUID(), `rl-user-${i}-${randomUUID()}@example.com`, undefined, "supabase");
      tenantIds.push(user.tenantId);
    }

    await expect(
      resolveUserRecord(repo, randomUUID(), `rl-user-blocked-${randomUUID()}@example.com`, undefined, "supabase"),
    ).rejects.toBeInstanceOf(SignupBlockedError);
  });

  it("never gates the dev-bypass auth provider", async () => {
    const { resolveUserRecord } = await import("@/lib/server/authSession");
    const repo = new IdentityRepository(pool);
    const email = `dev-bypass-${randomUUID()}@mailinator.com`;

    const user = await resolveUserRecord(repo, email, email, undefined, "dev-bypass");
    tenantIds.push(user.tenantId);

    expect(user.email).toBe(email);
  });
});
