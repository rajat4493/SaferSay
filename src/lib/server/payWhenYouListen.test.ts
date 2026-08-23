import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import { surveyCreditPacks, retentionPlans } from "@/lib/billingCatalog";
import { buildDeterministicInsights, buildInsightsPayload } from "@/lib/server/aiInsightsContract";

describe("pay-when-you-listen commercial and privacy contract", () => {
  it("uses USD credits for up to 100 employees with optional monthly retention", () => {
    expect(surveyCreditPacks).toMatchObject([
      { id: "one", price: "$129" }, { id: "three", price: "$349" }, { id: "six", price: "$649" },
    ]);
    expect(surveyCreditPacks.every((pack) => pack.description.includes("100") || pack.id !== "one")).toBe(true);
    expect(retentionPlans).toContainEqual(expect.objectContaining({ id: "monthly", price: "$19/month" }));
  });

  it("opens a cycle only through the atomic credit-consuming repository method", () => {
    const repo = readFileSync("src/lib/server/repositories/identityRepository.ts", "utf8");
    const migration = readFileSync("db/migrations/0019_credits_and_public_commitments.sql", "utf8");
    expect(repo).toContain("openCycleWithSurveyCredit");
    expect(repo).toContain("for update skip locked");
    expect(repo).toContain("consumed_at = now()");
    expect(repo).toContain("count(*) <= 100 as allowed");
    expect(repo).toContain("syncSurveyCreditBalance");
    expect(migration).toContain("unique (tenant_id, cycle_id)");
  });

  it("enforces the k=5 launch floor in code and migrations", () => {
    const repo = readFileSync("src/lib/server/repositories/identityRepository.ts", "utf8");
    const migration = readFileSync("db/migrations/0020_enforce_k5_confidentiality_floor.sql", "utf8");
    expect(repo).toContain("Math.max(5, configured)");
    expect(repo).toContain("Math.max(5, Math.round(value))");
    expect(migration).toContain("check (default_min_group_size >= 5)");
    expect(migration).toContain("check (min_group_size >= 5)");
  });

  it("keeps the deterministic fallback aggregate-only", () => {
    const payload = buildInsightsPayload({ protected: false, n: 5, rows: [
      { questionId: "q1", label: "Clear priorities", n: 5, average: 2, scaleMax: 5 },
      { questionId: "q2", label: "Support", n: 5, average: 4, scaleMax: 5 },
      { questionId: "q3", label: "Growth", n: 5, average: 3, scaleMax: 5 },
    ] }, 5);
    expect(buildDeterministicInsights(payload).nextAction).toContain("clear priorities");
    expect(JSON.stringify(payload).toLowerCase()).not.toContain("email");
  });

  it("keeps commitments owner-only and out of the response schema", () => {
    const route = readFileSync("src/app/api/report/commitment/route.ts", "utf8");
    const migration = readFileSync("db/migrations/0019_credits_and_public_commitments.sql", "utf8");
    expect(route).toContain('session.role !== "customer_admin"');
    expect(route).toContain("getProtectedReportForTenant");
    expect(route).toContain("listCycleCommitmentRecipients");
    expect(route).not.toContain("delivery });");
    expect(migration).toContain("identity.cycle_commitments");
    expect(migration).not.toContain("responses.cycle_commitments");
  });
});
