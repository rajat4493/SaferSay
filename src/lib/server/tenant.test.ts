import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";

describe("tenant foundation", () => {
  it("requires admin report access to resolve a tenant context", () => {
    const reportRoute = readFileSync("src/app/api/report/route.ts", "utf8");
    expect(reportRoute).toContain("resolveTenantContext");
    expect(reportRoute).toContain("getLatestProtectedReportForTenant");
  });

  it("adds a tenant bootstrap API and tenant database migration", () => {
    const bootstrapRoute = readFileSync("src/app/api/tenants/bootstrap/route.ts", "utf8");
    const migration = readFileSync("db/migrations/0002_tenant_bootstrap.sql", "utf8");
    expect(bootstrapRoute).toContain("getOrCreateTenant");
    expect(migration).toContain("identity.tenant_settings");
    expect(migration).toContain("tenants_slug_key");
  });
});
