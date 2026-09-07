import { NextResponse, type NextRequest } from "next/server";
import { getSessionContext } from "@/lib/server/authSession";
import { withTenantScopedDb } from "@/lib/server/db/tenantPool";
import { ResponseRepository } from "@/lib/server/repositories/responseRepository";
import { logSurveyQuestionsUpdated } from "@/lib/server/auditLog";
import { canCreateSurvey } from "@/lib/permissions";
import { normalizeTeamLabel } from "@/lib/server/repositories/identityRepository";
import type { QuestionType, QuestionOption, ScaleConfig, ShowIfCondition } from "@/lib/server/repositories/types";

const QUESTION_TYPES: QuestionType[] = ["likert_5", "enps_0_10", "scale", "open_text", "multiple_choice", "ranking", "matrix"];
const OPTION_TYPES: QuestionType[] = ["multiple_choice", "ranking", "matrix"];
const SCALE_MIN_ALLOWED = -100;
const SCALE_MAX_ALLOWED = 100;
// The taker UI renders one button per integer value in range (same shape
// as the existing eNPS 0-10 row) -- capped so a typo (or a genuinely huge
// range) can't produce dozens of buttons no one could usably tap through.
const SCALE_MAX_SPAN = 10;
const SCALE_LABEL_MAX_LENGTH = 80;

// Option-B branching enforcement point: this is the ONLY place show_if is
// accepted from a client. Restricted to structural facts snapshotted at
// invite time (identity.survey_participants.team/location) -- never a
// prior answer -- so this can't quietly grow into opinion-based branching
// later. See plan history: "Design thinking: survey branching vs. the
// k-anonymity engine."
function parseShowIf(raw: unknown): ShowIfCondition | null {
  if (!raw || typeof raw !== "object") return null;
  const value = raw as Record<string, unknown>;
  if (value.attribute !== "team" && value.attribute !== "location") return null;
  if (value.op !== "eq" && value.op !== "neq") return null;
  if (typeof value.value !== "string" || !value.value.trim()) return null;
  // identity.employees.team is stored normalized (trimmed/collapsed/
  // lowercased, see normalizeTeamLabel) and snapshotted verbatim onto
  // survey_participants.team -- the condition's value must match that
  // same normalization, or a real team never equals what an admin typed.
  const normalizedValue = value.attribute === "team" ? normalizeTeamLabel(value.value) : value.value.trim();
  if (!normalizedValue) return null;
  return { attribute: value.attribute, op: value.op, value: normalizedValue };
}

/** Validates a "scale" question's configured range/anchor labels before
 * it's ever stored. min < max (both finite, within a sane bound so a typo
 * can't produce a scale so wide the report's normalization math becomes
 * meaningless) -- anchor labels are optional, trimmed, and length-capped. */
function parseScaleConfig(raw: unknown): ScaleConfig | null {
  if (!raw || typeof raw !== "object") return null;
  const value = raw as Record<string, unknown>;
  const min = typeof value.min === "number" ? value.min : Number(value.min);
  const max = typeof value.max === "number" ? value.max : Number(value.max);
  if (!Number.isInteger(min) || !Number.isInteger(max)) return null;
  if (min < SCALE_MIN_ALLOWED || max > SCALE_MAX_ALLOWED || max <= min || max - min > SCALE_MAX_SPAN) return null;
  const lowLabel = typeof value.lowLabel === "string" ? value.lowLabel.trim().slice(0, SCALE_LABEL_MAX_LENGTH) : undefined;
  const highLabel = typeof value.highLabel === "string" ? value.highLabel.trim().slice(0, SCALE_LABEL_MAX_LENGTH) : undefined;
  return { min, max, ...(lowLabel ? { lowLabel } : {}), ...(highLabel ? { highLabel } : {}) };
}

function parseOptions(raw: unknown): QuestionOption[] | null {
  if (!Array.isArray(raw)) return null;
  const options = raw
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const value = item as Record<string, unknown>;
      const key = typeof value.key === "string" ? value.key.trim() : "";
      const label = typeof value.label === "string" ? value.label.trim() : "";
      return key && label ? { key, label } : null;
    })
    .filter((option): option is QuestionOption => option !== null);
  return options.length > 0 ? options : null;
}

type QuestionInput = {
  text: string;
  type: QuestionType;
  construct?: string | null;
  optional?: boolean;
  options?: unknown;
  showIf?: unknown;
  matrixGroupId?: string | null;
};

const ERROR_MESSAGES: Record<string, string> = {
  not_found: "That survey couldn't be found.",
  not_draft: "Questions can only be edited while the survey is still a draft.",
  empty: "A survey needs at least one question.",
  needs_options: "Multiple choice, ranking, and matrix questions need at least two options.",
  needs_scale: "Scale questions need a valid minimum and maximum (max greater than min).",
};

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const session = await getSessionContext();
  if (!session) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }
  if (!canCreateSurvey(session.role)) {
    return NextResponse.json({ ok: false, error: "You don't have permission to edit this survey." }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as { questions?: QuestionInput[] } | null;
  const rawQuestions = body?.questions;
  if (!Array.isArray(rawQuestions)) {
    return NextResponse.json({ ok: false, error: "Questions are required." }, { status: 400 });
  }

  const questions = rawQuestions
    .map((question) => {
      const type = QUESTION_TYPES.includes(question.type) ? question.type : ("likert_5" as const);
      const options: QuestionOption[] | ScaleConfig | null = OPTION_TYPES.includes(type)
        ? parseOptions(question.options)
        : type === "scale"
          ? parseScaleConfig(question.options)
          : null;
      return {
        text: typeof question.text === "string" ? question.text.trim() : "",
        type,
        construct: typeof question.construct === "string" && question.construct.trim() ? question.construct.trim() : null,
        optional: Boolean(question.optional),
        options,
        showIf: parseShowIf(question.showIf),
        matrixGroupId: type === "matrix" && typeof question.matrixGroupId === "string" ? question.matrixGroupId : null,
      };
    })
    .filter((question) => question.text.length > 0);

  if (questions.length === 0) {
    return NextResponse.json({ ok: false, error: ERROR_MESSAGES.empty }, { status: 400 });
  }

  if (questions.some((question) => OPTION_TYPES.includes(question.type) && (!Array.isArray(question.options) || question.options.length < 2))) {
    return NextResponse.json({ ok: false, error: ERROR_MESSAGES.needs_options }, { status: 400 });
  }

  if (questions.some((question) => question.type === "scale" && !question.options)) {
    return NextResponse.json({ ok: false, error: ERROR_MESSAGES.needs_scale }, { status: 400 });
  }

  const { id: cycleId } = await context.params;
  const { tenant } = session;

  const result = await withTenantScopedDb(tenant.id, (db) => new ResponseRepository(db).updateTemplateQuestions(tenant.id, cycleId, questions));

  if (!result.ok) {
    const status = result.error === "not_found" ? 404 : 400;
    return NextResponse.json({ ok: false, error: ERROR_MESSAGES[result.error] }, { status });
  }

  logSurveyQuestionsUpdated(tenant.id, session.role, session.email, cycleId, questions.length).catch((error) => {
    console.error(`Audit log for survey_questions_updated (${cycleId}) failed:`, error);
  });

  return NextResponse.json({ ok: true });
}
