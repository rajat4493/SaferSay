import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";

describe("role-aware home routing", () => {
  it("redirects non-operational personas away from Home", () => {
    const source = readFileSync("src/app/app/page.tsx", "utf8");
    expect(source).toContain('router.replace("/app/integrations")');
    expect(source).toContain('data.role === "auditor" || data.role === "people_leader" || data.role === "compliance_reviewer"');
    expect(source).toContain('router.replace("/app/surveys")');
  });
});
