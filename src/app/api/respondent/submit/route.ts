import { NextRequest, NextResponse } from "next/server";
import { getDatabasePool } from "@/lib/server/db/pool";
import { submitWithSeveredRepositories } from "@/lib/server/confidentialSubmissionService";
import { submitServerResponse } from "@/lib/serverStore";

export async function POST(request: NextRequest) {
  const body = (await request.json()) as {
    token: string;
    answers: Array<{ questionId: string; numberValue: number }>;
  };
  const db = getDatabasePool();
  if (db) {
    const submission = await submitWithSeveredRepositories({ db, rawToken: body.token, answers: body.answers });
    return NextResponse.json({ submissionId: submission.submissionId });
  }

  const submission = await submitServerResponse(body.token, body.answers);
  return NextResponse.json({ submissionId: submission.id });
}
