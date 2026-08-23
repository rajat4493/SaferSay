import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import { assertNoIndividualData, buildInsightsPayload, isEligibleForInsights } from "@/lib/server/aiInsightsContract";
import type { ProtectedReport } from "@/lib/server/repositories/types";

describe("AI insights confidentiality contract", () => {
  const unlockedReport: ProtectedReport = {
    protected: false,
    n: 8,
    rows: [
      { questionId: "q1", label: "I know what matters this quarter", n: 8, average: 3.1, scaleMax: 5 },
      { questionId: "q2", label: "Workload feels sustainable", n: 8, average: 2.8, scaleMax: 5 },
      { questionId: "q3", label: "How likely are you to recommend this company as a place to work?", n: 8, average: 5.33, scaleMax: 10 },
    ],
  };

  it("only builds a model payload from aggregate report rows", () => {
    const payload = buildInsightsPayload(unlockedReport, 5);
    expect(payload).toEqual({
      n: 8,
      minGroupSize: 5,
      questions: [
        { label: "I know what matters this quarter", average: 3.1, scaleMax: 5 },
        { label: "Workload feels sustainable", average: 2.8, scaleMax: 5 },
        { label: "How likely are you to recommend this company as a place to work?", average: 5.33, scaleMax: 10 },
      ],
    });
    expect(JSON.stringify(payload)).not.toContain("questionId");
  });

  it("blocks known individual-response identifiers before the provider call", () => {
    expect(() =>
      assertNoIndividualData({
        n: 8,
        minGroupSize: 5,
        questions: [{ label: "Workload", average: 3, scaleMax: 5 }],
      }),
    ).not.toThrow();

    expect(() =>
      assertNoIndividualData({
        n: 8,
        minGroupSize: 5,
        questions: [{ label: "Workload", average: 3, scaleMax: 5 }],
        token: "should-never-be-here",
      } as never),
    ).toThrow(/forbidden key: token/);
  });

  it("requires an unlocked report with at least three aggregate question rows", () => {
    expect(isEligibleForInsights(unlockedReport)).toBe(true);
    expect(isEligibleForInsights({ protected: true, n: 4, rows: [] })).toBe(false);
    expect(isEligibleForInsights({ protected: false, n: 8, rows: unlockedReport.rows.slice(0, 2) })).toBe(false);
  });

  it("keeps the route on the protected report repository path only", () => {
    const route = readFileSync("src/app/api/report/insights/route.ts", "utf8");
    expect(route).toContain("getProtectedReportForTenant");
    expect(route).toContain("getLatestProtectedReportForTenant");
    expect(route).toContain("buildInsightsPayload");
    expect(route).toContain("hasAIInsightsEntitlement");
    expect(route).not.toContain("responses.answers");
    expect(route).not.toContain("identity.employees");
    expect(route).not.toContain("text_value");
  });

  it("treats AI insights as a paid-credit entitlement, not a standalone customer SKU", () => {
    const catalog = readFileSync("src/lib/billingCatalog.ts", "utf8");
    const billingPage = readFileSync("src/app/app/workspace/billing/page.tsx", "utf8");
    const webhook = readFileSync("src/app/api/stripe/webhook/route.ts", "utf8");
    expect(catalog).toContain("aiInsightsIncluded");
    expect(catalog).toContain("hasAIInsightsEntitlement");
    expect(billingPage).toContain("AI interpretation is included with paid credits");
    expect(webhook).toContain("aiInsights: true");
    expect(webhook).toContain("aiInsightsIncluded: true");
  });

  it("keeps provider selection configurable while requiring structured output", () => {
    const helper = readFileSync("src/lib/server/aiInsights.ts", "utf8");
    expect(helper).toContain('export type AIProvider = "anthropic" | "openai" | "openai-compatible"');
    expect(helper).toContain("AI_PROVIDER");
    expect(helper).toContain("AI_MODEL");
    expect(helper).toContain('tool_choice: { type: "tool", name: "emit_insights" }');
    expect(helper).toContain('response_format:');
    expect(helper).toContain('type: "json_schema"');
    expect(helper).toContain("Never infer, describe, or speculate about any individual's emotional or psychological state");
  });
});
