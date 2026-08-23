import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";

describe("production readiness artifacts", () => {
  it("has pilot-ready privacy and DPA pages instead of placeholders", () => {
    const privacy = readFileSync("src/app/privacy/page.tsx", "utf8");
    const dpa = readFileSync("src/app/dpa/page.tsx", "utf8");
    expect(privacy).toContain("Privacy Notice");
    expect(privacy).toContain("AI insights are generated only from the same k-enforced aggregate report");
    expect(dpa).toContain("Data Processing Agreement");
    expect(dpa).toContain("Data Controller");
    expect(privacy).not.toContain("Privacy Notice Placeholder");
    expect(dpa).not.toContain("Data Processing Agreement Placeholder");
  });

  it("documents pilot operations, staging actions, and outreach constraints", () => {
    const runbook = readFileSync("docs/OPERATIONS_RUNBOOK.md", "utf8");
    const staging = readFileSync("docs/STAGING_DEPLOYMENT_ACTIONS.md", "utf8");
    const outreach = readFileSync("docs/PILOT_OUTREACH_CHECKLIST.md", "utf8");
    expect(runbook).toContain("PII Handling");
    expect(runbook).toContain("Incident Response");
    expect(staging).toContain("/api/stripe/webhook");
    expect(staging).toContain("SUPABASE_OAUTH_PROVIDERS_CONFIRMED=true");
    expect(outreach).toContain("Do Not Promise Yet");
  });

  it("keeps readiness and first-run guidance action-oriented", () => {
    const readiness = readFileSync("src/components/console/ReadinessPanel.tsx", "utf8");
    const firstRun = readFileSync("src/components/FirstRunGuide.tsx", "utf8");
    expect(readiness).toContain("Next actions");
    expect(readiness).toContain("Verify a Resend sending domain");
    expect(firstRun).toContain("copy secure links manually");
  });
});
