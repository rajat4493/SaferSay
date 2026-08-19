import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import { IdentityRepository } from "./repositories/identityRepository";
import type { Queryable } from "@/lib/server/db/tenantPool";

describe("setDedicatedDatabaseUrl", () => {
  it("encrypts the connection string before it ever reaches a query parameter", async () => {
    const queries: Array<{ params: unknown[] }> = [];
    const db: Queryable = {
      query: (async (_sql: string, params: unknown[] = []) => {
        queries.push({ params });
        return { rows: [] };
      }) as Queryable["query"],
    };
    await new IdentityRepository(db).setDedicatedDatabaseUrl("tenant-1", "postgresql://user:pass@host/db");
    expect(queries[0].params).not.toContain("postgresql://user:pass@host/db");
  });

  it("passes null straight through to clear it (no encryption of null)", async () => {
    const queries: Array<{ params: unknown[] }> = [];
    const db: Queryable = {
      query: (async (_sql: string, params: unknown[] = []) => {
        queries.push({ params });
        return { rows: [] };
      }) as Queryable["query"],
    };
    await new IdentityRepository(db).setDedicatedDatabaseUrl("tenant-1", null);
    expect(queries[0].params).toEqual(["tenant-1", null]);
  });
});

describe("tenant_dedicated_db migration", () => {
  const migration = readFileSync("db/migrations/0027_tenant_dedicated_db.sql", "utf8");

  it("adds a nullable column with no default -- absent means the shared database, unchanged for every existing tenant", () => {
    expect(migration).toContain("add column if not exists database_url_encrypted text");
    expect(migration).not.toMatch(/database_url_encrypted text.*default/i);
  });

  it("lives on identity.tenants (the control plane), not tenant_settings", () => {
    expect(migration).toContain("alter table identity.tenants");
  });
});

describe("getPoolForTenant / withTenantScopedDb", () => {
  const source = readFileSync("src/lib/server/db/tenantPool.ts", "utf8");

  it("checks for a dedicated database before falling back to the shared tenant pool", () => {
    const fnBody = source.slice(source.indexOf("async function getPoolForTenant"), source.indexOf("async function getPoolForTenant") + 1200);
    const dedicatedCheckIndex = fnBody.indexOf("database_url_encrypted");
    const fallbackIndex = fnBody.indexOf("return getTenantPool()");
    expect(dedicatedCheckIndex).toBeGreaterThan(-1);
    expect(fallbackIndex).toBeGreaterThan(dedicatedCheckIndex);
  });

  it("caches dedicated pools by connection string, not by tenant id -- avoids leaking a connection per request", () => {
    expect(source).toContain("dedicatedPools.get(connectionString)");
    expect(source).toContain("dedicatedPools.set(connectionString, dedicated)");
  });

  it("decrypts the stored connection string before connecting -- it's stored encrypted, never plaintext", () => {
    expect(source).toContain("decryptSecret(encrypted)");
  });
});

describe("dedicated-db provisioning route", () => {
  const route = readFileSync("src/app/api/super-admin/tenants/[id]/dedicated-db/route.ts", "utf8");

  it("is gated to super admins only, same pattern as other super-admin tenant routes", () => {
    expect(route).toContain("session.isSuperAdmin");
  });

  it("runs the migration runner against the target before recording the connection string as active", () => {
    const runIndex = route.indexOf("run-migrations.mjs");
    const setIndex = route.indexOf("setDedicatedDatabaseUrl(id, connectionString)");
    expect(runIndex).toBeGreaterThan(-1);
    expect(runIndex).toBeLessThan(setIndex);
  });

  it("never records the connection string if the migration run failed", () => {
    const catchIndex = route.indexOf("} catch (error)");
    const catchBlockEnd = route.indexOf("}", route.indexOf("status: 502") + 20) + 1;
    const catchBlock = route.slice(catchIndex, catchBlockEnd);
    expect(catchBlock).not.toContain("setDedicatedDatabaseUrl");
  });

  it("supports moving a tenant back to the shared database", () => {
    expect(route).toContain("export async function DELETE");
    expect(route).toContain("setDedicatedDatabaseUrl(id, null)");
  });
});
