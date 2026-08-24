import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";

describe("super-admin survey credit grants", () => {
  const route = readFileSync("src/app/api/super-admin/tenants/[id]/credits/route.ts", "utf8");
  const panel = readFileSync("src/components/console/TenantDetailPanel.tsx", "utf8");

  it("creates immutable credit-ledger entries with an admin-specific source reference", () => {
    expect(route).toContain("grantSurveyCredits");
    expect(route).toContain("admin:${gate.session.userId}:${randomUUID()}");
    expect(route).not.toContain("stripe:");
    expect(route).toContain("addSupportNote");
    expect(route).toContain("logSuperAdminAccess");
  });

  it("keeps the balance ledger-derived while exposing a separately audited grant action", () => {
    expect(panel).toContain("Ledger-derived");
    expect(panel).toContain("Grant credits");
    expect(panel).toContain("/credits");
  });
});
