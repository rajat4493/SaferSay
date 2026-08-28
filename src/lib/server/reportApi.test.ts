import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";

describe("real protected report flow", () => {
  it("protects the report API and reads latest tenant cycle", () => {
    const route = readFileSync("src/app/api/report/route.ts", "utf8");
    expect(route).toContain("getSessionContext");
    expect(route).toContain("Unauthorized report access.");
    expect(route).toContain("getLatestCycleForTenant");
  });

  it("distinguishes an unavailable requested cycle from a real protected report", () => {
    const route = readFileSync("src/app/api/report/route.ts", "utf8");
    const resultsPage = readFileSync("src/app/app/[surveyId]/results/page.tsx", "utf8");
    const panel = readFileSync("src/components/ProtectedReportPanel.tsx", "utf8");
    expect(route).toContain("notFound: true");
    expect(resultsPage).toContain("Survey not found");
    expect(panel).toContain("result?.notFound");
  });

  it("keeps report repository reads in response schema only", () => {
    const repo = readFileSync("src/lib/server/repositories/responseRepository.ts", "utf8");
    expect(repo).toContain("getLatestProtectedReportForTenant");
    expect(repo).toContain("responses.report_question_scores");
    expect(repo).toContain("q.question_type");
    expect(repo).toContain("scaleMaxForQuestionType");
    expect(repo).not.toContain("identity.employees");
    expect(repo).not.toContain("identity.survey_participants");
  });

  it("suppresses a department-scoped request rather than silently rolling it up", () => {
    const route = readFileSync("src/app/api/report/route.ts", "utf8");
    const reportType = readFileSync("src/lib/server/repositories/types.ts", "utf8");
    const panel = readFileSync("src/components/ProtectedReportPanel.tsx", "utf8");
    expect(route).toContain('{ type: "department", department }');
    expect(route).not.toContain("getManagerRollupReport");
    expect(reportType).not.toContain("rolledUpTo");
    expect(panel).not.toContain("rolledUpTo");
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

  it("locks report notes once a survey is closed", () => {
    const route = readFileSync("src/app/api/report/action/route.ts", "utf8");
    const page = readFileSync("src/app/app/[surveyId]/results/page.tsx", "utf8");
    expect(route).toContain('cycle.status === "closed"');
    expect(route).toContain("Survey is closed and locked.");
    expect(page).toContain("No further responses can be submitted");
  });

  it("blocks both reading and writing report actions while a platform owner impersonates a tenant", () => {
    const route = readFileSync("src/app/api/report/action/route.ts", "utf8");
    const getStart = route.indexOf("export async function GET");
    const postStart = route.indexOf("export async function POST");
    expect(route.slice(getStart, postStart)).toContain("isPlatformOwnerImpersonating(session)");
    expect(route.slice(postStart)).toContain("isPlatformOwnerImpersonating(session)");
  });

  it("does not keep a survey visually stuck in draft after launch or manual responses", () => {
    const inviteRoute = readFileSync("src/app/api/invites/send/route.ts", "utf8");
    const identityRepo = readFileSync("src/lib/server/repositories/identityRepository.ts", "utf8");
    expect(identityRepo).toContain("openCycleWithSurveyCredit");
    expect(inviteRoute).toContain("openCycleWithSurveyCredit");
  });

  it("routes a closed survey to its final results instead of its send step", () => {
    const buildPage = readFileSync("src/app/app/[surveyId]/page.tsx", "utf8");
    const sendPage = readFileSync("src/app/app/[surveyId]/send/page.tsx", "utf8");
    expect(buildPage).toContain('detail.cycle.status === "closed" ? "results" : "send"');
    expect(sendPage).toContain('if (status === "closed") router.replace(`/app/${surveyId}/results`)');
  });
});
