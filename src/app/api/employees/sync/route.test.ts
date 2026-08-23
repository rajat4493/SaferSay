import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";

describe("HRIS/roster sync route", () => {
  const route = readFileSync("src/app/api/employees/sync/route.ts", "utf8");

  it("rate-limits before resolving the API key, so an invalid-key guessing loop still gets throttled", () => {
    const rateLimitIndex = route.indexOf("checkRateLimit(");
    const authIndex = route.indexOf("resolveTenantFromApiKey(request)");
    expect(rateLimitIndex).toBeGreaterThan(-1);
    expect(rateLimitIndex).toBeLessThan(authIndex);
  });

  it("reuses the same tenant API key mechanism as report export, not a separate credential", () => {
    expect(route).toContain('import { resolveTenantFromApiKey } from "@/lib/server/apiKeyAuth"');
  });

  it("reuses the same upsert path as the CSV admin-upload import, not a separate write path", () => {
    expect(route).toContain("repo.importEmployees(tenantId, preview.employees)");
  });

  it("validates managerEmail against the batch and existing roster, same as the CSV import route", () => {
    expect(route).toContain("listAllEmployeeEmails");
    expect(route).toContain("batchEmails.has(employee.managerEmail)");
  });
});
