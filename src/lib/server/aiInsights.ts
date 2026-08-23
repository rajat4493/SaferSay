import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { assertNoIndividualData, type AIInsights, type AIInsightsPayload } from "@/lib/server/aiInsightsContract";

export type AIProvider = "anthropic" | "openai" | "openai-compatible";

type AIProviderConfig = {
  provider: AIProvider;
  model: string;
  apiKey?: string;
  baseUrl?: string;
};

const DEFAULT_MODELS: Record<AIProvider, string> = {
  anthropic: "claude-sonnet-4-6",
  openai: "gpt-5.2",
  "openai-compatible": "gpt-5.2",
};

const SYSTEM_PROMPT = `You analyze confidential employee-survey results for a company founder. You only ever see aggregate group scores -- never individual responses, never who said what, and the group is never smaller than the stated minimum group size. Each question includes its own scaleMax; compare each average against its own scale, not against a universal 5-point scale. Describe group-level patterns only. Never infer, describe, or speculate about any individual's emotional or psychological state -- that is a prohibited practice. Return exactly one JSON object matching the required schema. Do not add commentary, caveats, hedging, markdown, or advice outside those fields.`;

const INSIGHTS_JSON_SCHEMA = {
  type: "object" as const,
  properties: {
    summary: {
      type: "string" as const,
      description: "One paragraph, plain English, what the team is telling the founder in human terms. No jargon, no restated score numbers.",
    },
    strategicWork: {
      type: "array" as const,
      items: { type: "string" as const },
      description: "Short list of things that need real, sustained work -- derived from scores clearly below the attention threshold.",
    },
    quickWins: {
      type: "array" as const,
      items: { type: "string" as const },
      description: "Short list of things fixable this week -- derived from scores close to the attention threshold.",
    },
    nextAction: {
      type: "string" as const,
      description: "The single most impactful next action, based on the lowest-scoring question.",
    },
  },
  required: ["summary", "strategicWork", "quickWins", "nextAction"],
  additionalProperties: false,
};

const ANTHROPIC_INSIGHTS_TOOL = {
  name: "emit_insights",
  description: "Return the three structured insight outputs for this survey's aggregate group scores.",
  input_schema: INSIGHTS_JSON_SCHEMA,
};

export function getAIProviderConfig(): AIProviderConfig {
  const provider = normalizeProvider(process.env.AI_PROVIDER);
  return {
    provider,
    model: process.env.AI_MODEL?.trim() || DEFAULT_MODELS[provider],
    apiKey: provider === "anthropic" ? process.env.ANTHROPIC_API_KEY : process.env.OPENAI_API_KEY || process.env.AI_API_KEY,
    baseUrl: provider === "openai-compatible" ? process.env.AI_API_BASE_URL?.replace(/\/$/, "") : undefined,
  };
}

export function isAIInsightsConfigured() {
  const config = getAIProviderConfig();
  if (!config.apiKey) return false;
  if (config.provider === "openai-compatible" && !config.baseUrl) return false;
  return true;
}

function normalizeProvider(provider: string | undefined): AIProvider {
  const normalized = provider?.trim().toLowerCase();
  if (normalized === "openai") return "openai";
  if (normalized === "openai-compatible" || normalized === "compatible" || normalized === "custom") return "openai-compatible";
  return "anthropic";
}

/**
 * Zero-retention / no-training terms must be handled at the provider account
 * level. This code never logs prompt, payload, or response content.
 */
export async function generateInsights(payload: AIInsightsPayload): Promise<AIInsights> {
  assertNoIndividualData(payload);

  const config = getAIProviderConfig();
  if (!isAIInsightsConfigured()) {
    throw new Error("AI insights provider is not configured.");
  }

  if (config.provider === "anthropic") return generateWithAnthropic(config, payload);
  return generateWithOpenAICompatible(config, payload);
}

async function generateWithAnthropic(config: AIProviderConfig, payload: AIInsightsPayload): Promise<AIInsights> {
  const client = new Anthropic({ apiKey: config.apiKey });
  const message = await client.messages.create({
    model: config.model,
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    tools: [ANTHROPIC_INSIGHTS_TOOL],
    tool_choice: { type: "tool", name: "emit_insights" },
    messages: [{ role: "user", content: JSON.stringify(payload) }],
  });

  const toolUse = message.content.find((block): block is Anthropic.ToolUseBlock => block.type === "tool_use");
  if (!toolUse) throw new Error("The model did not return structured insights.");
  return normalizeInsights(toolUse.input);
}

async function generateWithOpenAICompatible(config: AIProviderConfig, payload: AIInsightsPayload): Promise<AIInsights> {
  const endpoint = `${config.baseUrl ?? "https://api.openai.com/v1"}/chat/completions`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      authorization: `Bearer ${config.apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: config.model,
      temperature: 0.2,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: JSON.stringify(payload) },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "safersay_ai_insights",
          strict: true,
          schema: INSIGHTS_JSON_SCHEMA,
        },
      },
    }),
  });

  if (!response.ok) throw new Error("AI provider request failed.");
  const data = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("The model did not return insights.");
  return normalizeInsights(JSON.parse(content));
}

function normalizeInsights(input: unknown): AIInsights {
  const value = input && typeof input === "object" ? (input as Record<string, unknown>) : {};
  return {
    summary: typeof value.summary === "string" ? value.summary : "",
    strategicWork: Array.isArray(value.strategicWork) ? value.strategicWork.map(String) : [],
    quickWins: Array.isArray(value.quickWins) ? value.quickWins.map(String) : [],
    nextAction: typeof value.nextAction === "string" ? value.nextAction : "",
  };
}
