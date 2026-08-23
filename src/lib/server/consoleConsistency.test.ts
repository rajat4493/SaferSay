import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";

describe("owner console commercial consistency", () => {
  it("shows AI as included with paid credits, not enterprise-only", () => {
    const plans = readFileSync("src/components/console/PlansFeaturesPanel.tsx", "utf8");
    expect(plans).toContain("AI insights included after paid credit purchase");
    expect(plans).toContain("Optional customer-owned AI provider/model");
    expect(plans).not.toContain('"AI insights", "Compliance retention');
  });

  it("does not describe Stripe checkout as missing after checkout routes are wired", () => {
    const billing = readFileSync("src/components/console/BillingPanel.tsx", "utf8");
    const overview = readFileSync("src/components/console/OverviewDashboard.tsx", "utf8");
    expect(billing).toContain("Checkout");
    expect(billing).toContain("Credits first, retention optional");
    expect(billing).toContain("Estimated retention MRR");
    expect(billing).toContain("Unused credits held");
    expect(billing).toContain("AI-enabled tenants");
    expect(billing).not.toContain("Connect Stripe to see revenue");
    expect(overview).not.toContain("once Stripe lands");
  });

  it("surfaces tenant credit and AI entitlement in the owner tenant list", () => {
    const directory = readFileSync("src/components/console/TenantsDirectory.tsx", "utf8");
    const repo = readFileSync("src/lib/server/repositories/identityRepository.ts", "utf8");
    expect(directory).toContain("Commercial");
    expect(directory).toContain("No retention");
    expect(directory).toContain("hasAIInsightsEntitlement");
    expect(repo).toContain("billingTerms: normalizeBillingTerms");
    expect(repo).toContain("features: extractBooleanFeatures");
  });
});
