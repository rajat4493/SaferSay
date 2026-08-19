import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import { IdentityRepository } from "./identityRepository";
import type { Queryable } from "@/lib/server/db/tenantPool";

function fakeDb(): { db: Queryable; queries: Array<{ sql: string; params: unknown[] }> } {
  const queries: Array<{ sql: string; params: unknown[] }> = [];
  const db: Queryable = {
    query: (async (sql: string, params: unknown[] = []) => {
      queries.push({ sql, params });
      if (sql.includes("select tenant_id from identity.tenant_api_keys")) {
        return { rows: [{ tenant_id: "tenant-1" }] };
      }
      return { rows: [], rowCount: 1 };
    }) as Queryable["query"],
  };
  return { db, queries };
}

describe("tenant API keys", () => {
  it("createApiKey only ever stores a hash, never the raw key", async () => {
    const { db, queries } = fakeDb();
    const { rawKey } = await new IdentityRepository(db).createApiKey("tenant-1", "PowerBI");
    expect(rawKey.startsWith("ssk_")).toBe(true);
    expect(queries[0].sql).toContain("key_hash");
    expect(queries[0].params).not.toContain(rawKey);
  });

  it("revokeApiKey scopes to the tenant and throws when nothing matched", async () => {
    const db: Queryable = { query: (async (_sql: string) => ({ rows: [], rowCount: 0 })) as Queryable["query"] };
    await expect(new IdentityRepository(db).revokeApiKey("tenant-1", "missing")).rejects.toThrow();
  });

  it("findTenantForApiKey hashes the raw key before querying, never queries with plaintext", async () => {
    const { db, queries } = fakeDb();
    const result = await new IdentityRepository(db).findTenantForApiKey("ssk_rawvalue");
    expect(result).toEqual({ tenantId: "tenant-1" });
    expect(queries[0].params[0]).not.toBe("ssk_rawvalue");
  });

  it("findTenantForApiKey excludes revoked keys at the SQL level", async () => {
    const { db, queries } = fakeDb();
    await new IdentityRepository(db).findTenantForApiKey("ssk_rawvalue");
    expect(queries[0].sql).toContain("revoked_at is null");
  });
});

describe("tenant_api_keys migration", () => {
  const migration = readFileSync("db/migrations/0025_tenant_api_keys.sql", "utf8");

  it("enables RLS with a tenant-isolation policy", () => {
    expect(migration).toContain("alter table identity.tenant_api_keys enable row level security");
    expect(migration).toContain("create policy tenant_isolation on identity.tenant_api_keys");
  });

  it("stores only key_hash, with a uniqueness constraint, never a raw key column", () => {
    expect(migration).toContain("key_hash text not null unique");
    expect(migration).not.toMatch(/raw_key|plaintext/i);
  });
});

describe("report export route", () => {
  const route = readFileSync("src/app/api/report/export/route.ts", "utf8");

  it("accepts either a session or a Bearer API key, resolving the API key first", () => {
    const apiKeyIndex = route.indexOf("resolveTenantFromApiKey(request)");
    const sessionIndex = route.indexOf("getSessionContext()");
    expect(apiKeyIndex).toBeGreaterThan(-1);
    expect(apiKeyIndex).toBeLessThan(sessionIndex);
  });

  it("reuses the same k-anonymity-gated repository methods as /api/report, not a separate raw-data path", () => {
    expect(route).toContain("getProtectedReportForTenant");
    expect(route).toContain("getLatestProtectedReportForTenant");
    expect(route).not.toContain("responses.answers");
  });

  it("rejects a platform owner impersonating a tenant, same as /api/report", () => {
    expect(route).toContain("isPlatformOwnerImpersonating");
  });
});
