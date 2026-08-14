import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";

describe("cycles/seed authorization", () => {
  it("gates seeding on canImportEmployees, not just session existence", () => {
    // Regression test: this route originally checked only that a session
    // existed before mutating tenant data (creating a cycle, importing 31
    // fake employees, issuing tokens) -- letting a read-only auditor write
    // data despite isReadOnlyRole() promising otherwise. Fixed alongside
    // pilot/state.
    const route = readFileSync("src/app/api/cycles/seed/route.ts", "utf8");
    expect(route).toContain("getSessionContext");
    expect(route).toContain("canImportEmployees");
    expect(route).toMatch(/canImportEmployees\(session\.role\)/);
    expect(route).toContain("403");
  });
});
