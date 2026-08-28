import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";

describe("restricted sidebar navigation", () => {
  it("keeps People Leaders on their protected reports path only", () => {
    const source = readFileSync("src/components/AppShell.tsx", "utf8");
    expect(source).toContain('label: "Reports"');
    expect(source).toContain('case "people_leader":');
    expect(source).toContain("return peopleLeaderNavItems");
    expect(source).toContain('role === "customer_admin" || role === "survey_creator"');
  });

  it("gives report, compliance, and IT personas a focused primary menu", () => {
    const source = readFileSync("src/components/AppShell.tsx", "utf8");
    expect(source).toContain("const reportViewerNavItems");
    expect(source).toContain("const integrationNavItems");
    expect(source).toContain('case "auditor":');
    expect(source).toContain('case "compliance_reviewer":');
    expect(source).toContain('case "integration_admin":');
  });

  it("does not flash role-restricted links before the session loads", () => {
    const source = readFileSync("src/components/AppShell.tsx", "utf8");
    expect(source).toContain("if (!info) return false;");
    expect(source).toContain("const { info, loaded } = useTenantSession()");
  });
});
