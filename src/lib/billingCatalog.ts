export type RetentionPlan = "none" | "monthly";
export type CreditPackId = "one" | "three" | "six";
export type SurveyCredit = {
  cycleId: string;
  employeeBand: "up_to_100";
  consumedAt: string;
};

export type BillingTerms = {
  surveyCredits: number;
  retentionPlan: RetentionPlan;
  aiInsightsIncluded: boolean;
  creditExpiryMonths: number;
  contractNote: string;
};

export const defaultBillingTerms: BillingTerms = {
  surveyCredits: 0,
  retentionPlan: "none",
  aiInsightsIncluded: false,
  creditExpiryMonths: 24,
  contractNote: "No annual contract. Buy a survey credit only when a confidential listening cycle is ready to open.",
};

export const surveyCreditPacks = [
  { id: "one", name: "1 Survey Credit", credits: 1, price: "$129", description: "One confidential survey cycle for up to 100 active employees. Includes safe aggregate insights." },
  { id: "three", name: "3 Survey Credits", credits: 3, price: "$349", description: "For occasional listening, with no annual contract or per-person fee." },
  { id: "six", name: "6 Survey Credits", credits: 6, price: "$649", description: "For regular pulse checks. Credits stay available for 24 months." },
] as const;

export const retentionPlans: Array<{ id: RetentionPlan; name: string; price: string; description: string }> = [
  { id: "none", name: "Release after export", price: "$0/month", description: "Export reports and stop paying. No monthly lock-in." },
  { id: "monthly", name: "Monthly report retention", price: "$19/month", description: "Keep protected reports and trend history, cancellable any month." },
];

export function normalizeBillingTerms(value: unknown): BillingTerms {
  const input = typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
  const legacyRetentionPlan = input.retentionPlan;
  const retentionPlan = legacyRetentionPlan === "report" || legacyRetentionPlan === "compliance"
    ? "monthly"
    : retentionPlans.some((plan) => plan.id === legacyRetentionPlan)
      ? legacyRetentionPlan as RetentionPlan
      : defaultBillingTerms.retentionPlan;
  return {
    surveyCredits: typeof input.surveyCredits === "number" ? Math.max(0, Math.floor(input.surveyCredits)) : defaultBillingTerms.surveyCredits,
    retentionPlan,
    aiInsightsIncluded: typeof input.aiInsightsIncluded === "boolean" ? input.aiInsightsIncluded : defaultBillingTerms.aiInsightsIncluded,
    creditExpiryMonths: typeof input.creditExpiryMonths === "number" ? Math.max(1, Math.floor(input.creditExpiryMonths)) : defaultBillingTerms.creditExpiryMonths,
    contractNote: typeof input.contractNote === "string" && input.contractNote.trim() ? input.contractNote.trim() : defaultBillingTerms.contractNote,
  };
}

export function hasAIInsightsEntitlement(features: Record<string, boolean>, billingTerms: BillingTerms) {
  return Boolean(features.aiInsights || billingTerms.aiInsightsIncluded);
}
