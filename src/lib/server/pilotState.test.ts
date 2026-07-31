import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";

describe("first-run pilot guide", () => {
  it("exposes a protected pilot state API", () => {
    const route = readFileSync("src/app/api/pilot/state/route.ts", "utf8");
    expect(route).toContain("hasAdminApiAccess");
    expect(route).toContain("Unauthorized pilot state access.");
    expect(route).toContain("getPilotState");
  });

  it("tracks the core pilot steps", () => {
    const service = readFileSync("src/lib/server/pilotStateService.ts", "utf8");
    expect(service).toContain("Upload employees");
    expect(service).toContain("Create survey cycle");
    expect(service).toContain("Prepare invite outbox");
    expect(service).toContain("Review safe report");
  });

  it("adds a visible first-run route", () => {
    const appShell = readFileSync("src/components/AppShell.tsx", "utf8");
    const page = readFileSync("src/app/app/pilot/page.tsx", "utf8");
    expect(appShell).toContain("/app/pilot");
    expect(page).toContain("PilotGuide");
  });
});
