import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";

describe("cross-cycle trend report API", () => {
  const route = readFileSync("src/app/api/report/trend/route.ts", "utf8");

  it("gates on the same session/role/impersonation checks as the single-cycle report", () => {
    expect(route).toContain("getSessionContext");
    expect(route).toContain("Unauthorized report access.");
    expect(route).toContain("canViewSurveyResults");
    expect(route).toContain("isPlatformOwnerImpersonating");
    expect(route).toContain("Platform owners cannot view tenant response content.");
  });

  it("delegates aggregation to the repository instead of querying answers directly", () => {
    expect(route).toContain("getCrossCycleTrendForTenant");
    expect(route).not.toContain("responses.answers");
  });

  it("keeps raw response content behind a SECURITY DEFINER function, same as the single-cycle report", () => {
    const repo = readFileSync("src/lib/server/repositories/responseRepository.ts", "utf8");
    expect(repo).toContain("responses.report_question_trend");
    expect(repo).not.toContain("identity.employees");
    expect(repo).not.toContain("identity.survey_participants");
  });

  it("is wired into the results and org viewer pages", () => {
    const resultsPage = readFileSync("src/app/app/[surveyId]/results/page.tsx", "utf8");
    const orgViewerPage = readFileSync("src/app/viewer/org/page.tsx", "utf8");
    expect(resultsPage).toContain("CycleTrendPanel");
    expect(orgViewerPage).toContain("CycleTrendPanel");
  });
});
