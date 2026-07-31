import { NextResponse, type NextRequest } from "next/server";
import { getDatabasePool } from "@/lib/server/db/pool";
import { getRespondentSurveySession } from "@/lib/server/respondentSessionService";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  if (!token) return NextResponse.json({ ok: false, error: "Survey token is required." }, { status: 400 });

  const db = getDatabasePool();
  if (!db) return NextResponse.json({ ok: false, error: "Database-backed surveys are not configured." }, { status: 503 });

  const session = await getRespondentSurveySession({ db, rawToken: token });
  if (!session) return NextResponse.json({ ok: false, error: "This survey link is not active." }, { status: 404 });

  return NextResponse.json({ ok: true, session });
}
