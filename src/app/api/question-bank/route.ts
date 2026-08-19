import { NextResponse, type NextRequest } from "next/server";
import { getSessionContext } from "@/lib/server/authSession";
import { withTenantScopedDb } from "@/lib/server/db/tenantPool";
import { ResponseRepository } from "@/lib/server/repositories/responseRepository";
import { canCreateSurvey } from "@/lib/permissions";

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

  const body = (await request.json().catch(() => ({}))) as { construct?: string; text?: string; questionType?: string };
  const text = body.text?.trim();
  const questionType = body.questionType === "open_text" ? "open_text" : body.questionType === "scale" ? "scale" : null;
  if (!text || !questionType) {
    return NextResponse.json({ ok: false, error: "Question text and a valid type (scale or open_text) are required." }, { status: 400 });
  }

  const question = await withTenantScopedDb(session.tenant.id, (db) =>
    new ResponseRepository(db).addQuestionToBank(session.tenant.id, { construct: body.construct?.trim() || null, text, questionType }),
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
