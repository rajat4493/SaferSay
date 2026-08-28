import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";

describe("tenant foundation", () => {
  it("requires an authenticated session to resolve a report's tenant", () => {
    const reportRoute = readFileSync("src/app/api/report/route.ts", "utf8");
    expect(reportRoute).toContain("getSessionContext");
    expect(reportRoute).toContain("getLatestCycleForTenant");
  });

  it("adds a tenant bootstrap API and tenant database migration", () => {
    const bootstrapRoute = readFileSync("src/app/api/tenants/bootstrap/route.ts", "utf8");
    const migration = readFileSync("db/migrations/0002_tenant_bootstrap.sql", "utf8");
    expect(bootstrapRoute).toContain("getOrCreateTenant");
    expect(migration).toContain("identity.tenant_settings");
    expect(migration).toContain("tenants_slug_key");
  });
});
