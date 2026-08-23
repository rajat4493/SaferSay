import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";

describe("results page hides mutating survey controls from read-only roles", () => {
  const page = readFileSync("src/app/app/[surveyId]/results/page.tsx", "utf8");

  it("fetches the caller's role, same pattern the update-draft page already uses", () => {
    expect(page).toContain('fetch("/api/tenants/current")');
    expect(page).toContain("canRunSurvey");
  });

  it("gates the reminder/close/draft-update controls behind canManage", () => {
    // The closed-state "Draft an update" button and the open-state "Manage
    // survey" card (reminders + close) are each wrapped in their own
    // `canManage ? ( ... ) : null` -- two separate gates, since they render
    // in mutually exclusive branches of the same resultsState check.
    const gateCount = page.split("canManage ? (").length - 1;
    expect(gateCount).toBeGreaterThanOrEqual(2);

    // canManage itself must come from canRunSurvey, not be hardcoded true.
    expect(page).toContain("setCanManage(canRunSurvey(data.role as UserRole))");
  });
});

describe("the APIs those controls call already reject a read-only auditor", () => {
  it("invites/send requires canRunSurvey", () => {
    const route = readFileSync("src/app/api/invites/send/route.ts", "utf8");
    expect(route).toContain("canRunSurvey(session.role)");
  });

  it("cycles/[id]/close requires canRunSurvey", () => {
    const route = readFileSync("src/app/api/cycles/[id]/close/route.ts", "utf8");
    expect(route).toContain("canRunSurvey(session.role)");
  });
});
