import { NextResponse, type NextRequest } from "next/server";
import { getSessionContext } from "@/lib/server/authSession";
import { withTenantScopedDb } from "@/lib/server/db/tenantPool";
import { ResponseRepository } from "@/lib/server/repositories/responseRepository";
import { logSurveyQuestionsUpdated } from "@/lib/server/auditLog";
import { canCreateSurvey } from "@/lib/permissions";
import { normalizeTeamLabel } from "@/lib/server/repositories/identityRepository";
import type { QuestionType, QuestionOption, ShowIfCondition } from "@/lib/server/repositories/types";

const QUESTION_TYPES: QuestionType[] = ["likert_5", "enps_0_10", "open_text", "multiple_choice", "ranking", "matrix"];
const OPTION_TYPES: QuestionType[] = ["multiple_choice", "ranking", "matrix"];

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
      const options = OPTION_TYPES.includes(type) ? parseOptions(question.options) : null;
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

  if (questions.some((question) => OPTION_TYPES.includes(question.type) && (!question.options || question.options.length < 2))) {
    return NextResponse.json({ ok: false, error: ERROR_MESSAGES.needs_options }, { status: 400 });
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
