import { NextResponse, type NextRequest } from "next/server";
import { getSessionContext } from "@/lib/server/authSession";
import { withTenantScopedDb } from "@/lib/server/db/tenantPool";
import { ResponseRepository } from "@/lib/server/repositories/responseRepository";
import { logSurveyQuestionsUpdated } from "@/lib/server/auditLog";
import { canCreateSurvey } from "@/lib/permissions";

type QuestionInput = {
  text: string;
  type: "likert_5" | "enps_0_10" | "open_text";
  construct?: string | null;
  optional?: boolean;
};

const ERROR_MESSAGES: Record<string, string> = {
  not_found: "That survey couldn't be found.",
  not_draft: "Questions can only be edited while the survey is still a draft.",
  empty: "A survey needs at least one question.",
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
    .map((question) => ({
      text: typeof question.text === "string" ? question.text.trim() : "",
      type: question.type === "enps_0_10" || question.type === "open_text" ? question.type : ("likert_5" as const),
      construct: typeof question.construct === "string" && question.construct.trim() ? question.construct.trim() : null,
      optional: Boolean(question.optional),
    }))
    .filter((question) => question.text.length > 0);

  if (questions.length === 0) {
    return NextResponse.json({ ok: false, error: ERROR_MESSAGES.empty }, { status: 400 });
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
