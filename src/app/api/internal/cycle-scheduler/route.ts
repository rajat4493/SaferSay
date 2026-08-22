import { NextResponse, type NextRequest } from "next/server";
import { getDatabasePool } from "@/lib/server/db/pool";
import { runDueSurveyRecurrences } from "@/lib/server/surveyRecurrenceService";

/**
 * Creates (and optionally sends) a new cycle for every due recurring
 * survey, across every tenant. Same auth/invocation pattern as
 * /api/internal/retention-purge: Vercel Cron always issues GET with
 * `Authorization: Bearer $CRON_SECRET`; POST is exported too for manual
 * non-Vercel invocation. Fails closed with no secret configured, same
 * reasoning as retention-purge -- this creates real cycles and can send
 * real invites, not a read-only operation.
 */
async function handleScheduler(request: NextRequest) {
  const secret = process.env.CYCLE_SCHEDULER_SECRET ?? process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ ok: false, error: "Cycle scheduler is not configured." }, { status: 503 });
  }
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  const pool = getDatabasePool();
  if (!pool) {
    return NextResponse.json({ ok: false, error: "DATABASE_URL is not configured." }, { status: 503 });
  }

  const results = await runDueSurveyRecurrences(pool);

  return NextResponse.json({
    ok: true,
    recurrencesRun: results.length,
    cyclesCreated: results.filter((r) => r.cycleId).length,
    totalInvitesSent: results.reduce((sum, r) => sum + (r.invitesSent ?? 0), 0),
    errors: results.filter((r) => r.error).map((r) => ({ recurrenceId: r.recurrenceId, error: r.error })),
  });
}

export const GET = handleScheduler;
export const POST = handleScheduler;
