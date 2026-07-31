import { NextRequest, NextResponse } from "next/server";
import { getDatabasePool } from "@/lib/server/db/pool";
import { submitWithSeveredRepositories } from "@/lib/server/confidentialSubmissionService";
import { submitServerResponse } from "@/lib/serverStore";

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as {
    token: string;
    answers: Array<{ questionId: string; numberValue?: number; textValue?: string }>;
  };
  if (!body.token || !Array.isArray(body.answers)) {
    return NextResponse.json({ ok: false, error: "Survey token and answers are required." }, { status: 400 });
  }

  const db = getDatabasePool();
  if (db) {
    try {
      const submission = await submitWithSeveredRepositories({ db, rawToken: body.token, answers: body.answers });
      return NextResponse.json({ ok: true, submissionId: submission.submissionId });
    } catch (error) {
      return NextResponse.json(
        { ok: false, error: error instanceof Error ? error.message : "Response could not be submitted." },
        { status: 400 },
      );
    }
  }

  const submission = await submitServerResponse(
    body.token,
    body.answers
      .filter((answer): answer is { questionId: string; numberValue: number } => typeof answer.numberValue === "number")
      .map((answer) => ({ questionId: answer.questionId, numberValue: answer.numberValue })),
  );
  return NextResponse.json({ ok: true, submissionId: submission.id });
}
