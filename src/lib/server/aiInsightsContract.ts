import type { ProtectedReport } from "@/lib/server/repositories/types";

export type AIInsights = {
  summary: string;
  strategicWork: string[];
  quickWins: string[];
  nextAction: string;
};

export type AIInsightsPayload = {
  n: number;
  minGroupSize: number;
  questions: Array<{ label: string; average: number; scaleMax: 5 | 10 }>;
};

const FORBIDDEN_KEYS = ["email", "name", "employeeid", "respondentid", "token", "userid", "answers", "textvalue", "submissionid", "ip", "useragent", "identity"];

/**
 * Non-negotiable data-contract check, run immediately before every API
 * call. This is a runtime safety net, not just a type-level guarantee.
 */
export function assertNoIndividualData(payload: AIInsightsPayload): void {
  const serialized = JSON.stringify(payload).toLowerCase();
  for (const key of FORBIDDEN_KEYS) {
    if (serialized.includes(`"${key}"`)) {
      throw new Error(`AI insights payload contains a forbidden key: ${key}`);
    }
  }
  if (!Number.isFinite(payload.n) || !Number.isFinite(payload.minGroupSize)) {
    throw new Error("AI insights payload is missing required aggregate counts.");
  }
}

/** Group-level rows only, unlocked (protected: false) report required. */
export function isEligibleForInsights(report: ProtectedReport): report is Extract<ProtectedReport, { protected: false }> {
  return !report.protected && report.rows.length >= 3;
}

/**
 * Builds the model payload from an already-unlocked, k-enforced report --
 * never touches the database. Only n, minGroupSize, and each question's
 * label, average, and scale survive; question IDs and everything else are dropped.
 */
export function buildInsightsPayload(report: Extract<ProtectedReport, { protected: false }>, minGroupSize: number): AIInsightsPayload {
  return {
    n: report.n,
    minGroupSize,
    questions: report.rows.map((row) => ({ label: row.label ?? "Untitled question", average: row.average ?? 0, scaleMax: row.scaleMax ?? 5 })),
  };
}

/** Safe fallback when a customer has paid for insight but no AI provider is
 * configured. It consumes the same aggregate-only payload as the model. */
export function buildDeterministicInsights(payload: AIInsightsPayload): AIInsights {
  const scored = payload.questions
    .map((question) => ({ ...question, normalized: question.average / question.scaleMax }))
    .sort((a, b) => a.normalized - b.normalized);
  const lowest = scored[0];
  const highest = scored.at(-1);
  const weakest = lowest ? `The clearest priority is ${lowest.label.toLowerCase()}.` : "No scored questions are available yet.";
  const strongest = highest ? `The strongest signal is ${highest.label.toLowerCase()}.` : "";
  return {
    summary: [weakest, strongest].filter(Boolean).join(" "),
    strategicWork: lowest && lowest.normalized < 0.65 ? [`Make a focused plan to improve ${lowest.label.toLowerCase()}.`] : [],
    quickWins: lowest ? [`Share a concrete update about ${lowest.label.toLowerCase()} this week.`] : [],
    nextAction: lowest ? `Publish one specific commitment to improve ${lowest.label.toLowerCase()} and give the team a target date.` : "Publish one specific commitment and target date.",
  };
}
