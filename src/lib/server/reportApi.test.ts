import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";

describe("real protected report flow", () => {
  it("protects the report API and reads latest tenant cycle", () => {
    const route = readFileSync("src/app/api/report/route.ts", "utf8");
    expect(route).toContain("getSessionContext");
    expect(route).toContain("Unauthorized report access.");
    expect(route).toContain("getLatestProtectedReportForTenant");
  });

  it("keeps report repository reads in response schema only", () => {
    const repo = readFileSync("src/lib/server/repositories/responseRepository.ts", "utf8");
    expect(repo).toContain("getLatestProtectedReportForTenant");
    expect(repo).toContain("responses.report_question_scores");
    expect(repo).not.toContain("identity.employees");
    expect(repo).not.toContain("identity.survey_participants");
  });

  it("uses the shared real report panel in admin and viewer pages", () => {
    // Reports moved from the standalone /app/reports route into the
    // per-survey Results stage (docs/strategy/CLAUDE_CODE_ADMIN_REFACTOR.md
    // §1) -- same shared panel, now cycle-scoped via a cycleId prop.
    const adminPage = readFileSync("src/app/app/[surveyId]/results/page.tsx", "utf8");
    const viewerPage = readFileSync("src/app/viewer/page.tsx", "utf8");
    expect(adminPage).toContain("ProtectedReportPanel");
    expect(viewerPage).toContain("ProtectedReportPanel");
  });
});
