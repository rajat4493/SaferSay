import { NextResponse, type NextRequest } from "next/server";
import { getSessionContext } from "@/lib/server/authSession";
import { withTenantScopedDb } from "@/lib/server/db/tenantPool";
import { ResponseRepository } from "@/lib/server/repositories/responseRepository";
import { canCreateSurvey } from "@/lib/permissions";
import type { QuestionBankQuestionType, QuestionOption } from "@/lib/server/repositories/types";

const QUESTION_TYPES: QuestionBankQuestionType[] = ["scale", "open_text", "multiple_choice", "ranking", "matrix"];
const OPTION_TYPES: QuestionBankQuestionType[] = ["multiple_choice", "ranking", "matrix"];

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

export async function GET() {
  const session = await getSessionContext();
  if (!session) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }
  if (!canCreateSurvey(session.role)) {
    return NextResponse.json({ ok: false, error: "You don't have permission to view the question bank." }, { status: 403 });
  }

  const questions = await withTenantScopedDb(session.tenant.id, (db) => new ResponseRepository(db).listQuestionBank(session.tenant.id));

  return NextResponse.json({ ok: true, questions });
}

export async function POST(request: NextRequest) {
  const session = await getSessionContext();
  if (!session) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }
  if (!canCreateSurvey(session.role)) {
    return NextResponse.json({ ok: false, error: "You don't have permission to add questions." }, { status: 403 });
  }

  const body = (await request.json().catch(() => ({}))) as { construct?: string; text?: string; questionType?: string; options?: unknown };
  const text = body.text?.trim();
  const questionType = QUESTION_TYPES.includes(body.questionType as QuestionBankQuestionType) ? (body.questionType as QuestionBankQuestionType) : null;
  if (!text || !questionType) {
    return NextResponse.json({ ok: false, error: "Question text and a valid type are required." }, { status: 400 });
  }

  const options = OPTION_TYPES.includes(questionType) ? parseOptions(body.options) : null;
  if (OPTION_TYPES.includes(questionType) && (!options || options.length < 2)) {
    return NextResponse.json({ ok: false, error: "Multiple choice, ranking, and matrix questions need at least two options." }, { status: 400 });
  }

  const question = await withTenantScopedDb(session.tenant.id, (db) =>
    new ResponseRepository(db).addQuestionToBank(session.tenant.id, { construct: body.construct?.trim() || null, text, questionType, options }),
  );

  return NextResponse.json({ ok: true, question });
}

export async function DELETE(request: NextRequest) {
  const session = await getSessionContext();
  if (!session) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }
  if (!canCreateSurvey(session.role)) {
    return NextResponse.json({ ok: false, error: "You don't have permission to remove questions." }, { status: 403 });
  }

  const id = request.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ ok: false, error: "A question id is required." }, { status: 400 });
  }

  await withTenantScopedDb(session.tenant.id, (db) => new ResponseRepository(db).archiveQuestionFromBank(session.tenant.id, id));

  return NextResponse.json({ ok: true });
}
