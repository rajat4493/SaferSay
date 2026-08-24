import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("launch-readiness product flow", () => {
  it("states the usage-based credit model on the public landing page", () => {
    const page = readFileSync("src/app/page.tsx", "utf8");
    expect(page).toContain("Pay when you listen.");
    expect(page).toContain("No annual contract. No per-person fee.");
    expect(page).toContain("surveyCreditPacks");
    expect(page).toContain("ProductDemo");
    expect(page).toContain("It uses fictional people in your browser only");
  });

  it("offers a downloadable import template instead of loading fake people into a tenant", () => {
    const importer = readFileSync("src/components/EmployeeCsvImport.tsx", "utf8");
    expect(importer).toContain("Download template");
    expect(importer).toContain("safersay-employee-import-template.csv");
    expect(importer).toContain("manager_email");
    expect(importer).not.toContain("Use sample CSV");
  });

  it("shows the protected-report threshold before a survey is created", () => {
    const page = readFileSync("src/app/app/surveys/new/page.tsx", "utf8");
    const creator = readFileSync("src/components/CreateSurveyCycle.tsx", "utf8");
    expect(page).toContain("Participant data check");
    expect(creator).toContain("reports remain protected until five submissions");
  });

  it("keeps developer-only invite controls out of production", () => {
    const outbox = readFileSync("src/components/InviteOutboxPanel.tsx", "utf8");
    expect(outbox).toContain('setDeveloperMode(data.mode !== "production")');
    expect(outbox).toContain('developerMode && sendState?.cycleStatus !== "closed"');
  });
});
