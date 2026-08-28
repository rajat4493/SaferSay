import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";

describe("restricted sidebar navigation", () => {
  it("keeps People Leaders on their protected reports path only", () => {
    const source = readFileSync("src/components/AppShell.tsx", "utf8");
    expect(source).toContain('label: "Reports"');
    expect(source).toContain('info?.role === "people_leader" ? peopleLeaderNavItems : primaryNavItems');
    expect(source).toContain('role !== "people_leader"');
  });

  it("does not flash role-restricted links before the session loads", () => {
    const source = readFileSync("src/components/AppShell.tsx", "utf8");
    expect(source).toContain("if (!info) return false;");
    expect(source).toContain("const { info, loaded } = useTenantSession()");
  });
});
