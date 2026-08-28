import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";

describe("first-run pilot guide", () => {
  it("exposes a protected pilot state API", () => {
    const route = readFileSync("src/app/api/pilot/state/route.ts", "utf8");
    expect(route).toContain("getSessionContext");
    expect(route).toContain("Unauthorized pilot state access.");
    expect(route).toContain("getPilotState");
  });

  it("gates pilot state on canViewSurveyResults, not just session existence", () => {
    // Regression test: this route originally checked only that a session
    // existed, letting any authenticated tenant member (including a
    // read-only auditor) read report/employee/invite aggregate counts it
    // shouldn't have access to. Fixed alongside cycles/seed.
    const route = readFileSync("src/app/api/pilot/state/route.ts", "utf8");
    expect(route).toContain("canViewSurveyResults");
    expect(route).toMatch(/canViewSurveyResults\(session\.role\)/);
  });

  it("tracks the core pilot steps", () => {
    const service = readFileSync("src/lib/server/pilotStateService.ts", "utf8");
    expect(service).toContain("Add your people");
    expect(service).toContain("Choose and create your first survey");
    expect(service).toContain("Review people and send confidential invites");
    expect(service).toContain("Review protected results");
  });

  it("adds a visible first-run route", () => {
    const appShell = readFileSync("src/components/AppShell.tsx", "utf8");
    const page = readFileSync("src/app/app/pilot/page.tsx", "utf8");
    expect(appShell).toContain("/app/pilot");
    expect(appShell).toContain("!info.firstRunCompleted");
    expect(page).toContain("PilotGuide");
    expect(page).toContain("data.firstRunCompleted");
  });
});
