import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";

describe("department list report API", () => {
  const route = readFileSync("src/app/api/report/departments/route.ts", "utf8");

  it("gates on the same session/role/impersonation checks as the single-cycle report", () => {
    expect(route).toContain("getSessionContext");
    expect(route).toContain("canViewSurveyResults");
    expect(route).toContain("isPlatformOwnerImpersonating");
    expect(route).toContain("Platform owners cannot view tenant response content.");
  });

  it("never selects or returns a count -- labels only", () => {
    expect(route).not.toMatch(/count\(/i);
    expect(route).not.toMatch(/\bn\b\s*:/); // no "n:" field in the response shape
  });

  it("delegates to the repository's alphabetical, tenant-scoped department list", () => {
    expect(route).toContain("listDepartmentsForCycle");
  });

  it("is wired into the department picker on the results page", () => {
    const resultsPage = readFileSync("src/app/app/[surveyId]/results/page.tsx", "utf8");
    expect(resultsPage).toContain("/api/report/departments");
  });

  it("repository orders departments alphabetically, never by size", () => {
    const repo = readFileSync("src/lib/server/repositories/responseRepository.ts", "utf8");
    const match = repo.match(/listDepartmentsForCycle[\s\S]*?order by ([\s\S]*?)\n/);
    expect(match?.[1]).toContain("segment_team asc");
  });
});
