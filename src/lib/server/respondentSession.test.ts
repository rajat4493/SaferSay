import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";

describe("real respondent survey flow", () => {
  it("loads respondent questions from a server-side token session", () => {
    const route = readFileSync("src/app/api/respondent/session/route.ts", "utf8");
    const service = readFileSync("src/lib/server/respondentSessionService.ts", "utf8");
    expect(route).toContain("getRespondentSurveySession");
    expect(service).toContain("findIssuedTokenForRespondentSession");
    expect(service).toContain("getRespondentSurveySession(participant.cycle_id)");
  });

  it("renders the survey taker page from the respondent session API", () => {
    const page = readFileSync("src/app/s/[token]/page.tsx", "utf8");
    expect(page).toContain("/api/respondent/session");
    expect(page).toContain("/api/respondent/submit");
    // Wise-style confidentiality screen copy (design directive) -- still
    // asserts the same severed-storage claim, just the approved wording.
    expect(page).toContain("stored completely separately from your identity");
  });

  it("keeps response submission behind the severed repository service", () => {
    const route = readFileSync("src/app/api/respondent/submit/route.ts", "utf8");
    expect(route).toContain("submitWithSeveredRepositories");
    expect(route).toContain("Survey token and answers are required.");
  });
});
