import { NextResponse, type NextRequest } from "next/server";
import { getSessionContext, isPlatformOwnerImpersonating } from "@/lib/server/authSession";
import { getDatabasePool } from "@/lib/server/db/pool";
import { IdentityRepository } from "@/lib/server/repositories/identityRepository";
import { ResponseRepository } from "@/lib/server/repositories/responseRepository";

export async function GET(request: NextRequest) {
  const session = await getSessionContext();
  if (!session) return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });

  const db = getDatabasePool();
  if (!db) return NextResponse.json({ ok: false, error: "DATABASE_URL is required." }, { status: 503 });

  const cycleId = request.nextUrl.searchParams.get("cycleId");
  if (!cycleId) return NextResponse.json({ ok: false, error: "cycleId is required." }, { status: 400 });

  const actions = await new IdentityRepository(db).listCycleActions(session.tenant.id, cycleId);
  return NextResponse.json({ ok: true, actions });
}

export async function POST(request: NextRequest) {
  const session = await getSessionContext();
  if (!session) return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });

  if (isPlatformOwnerImpersonating(session)) {
    return NextResponse.json({ ok: false, error: "Platform owners cannot act on tenant reports." }, { status: 403 });
  }

  const db = getDatabasePool();
  if (!db) return NextResponse.json({ ok: false, error: "DATABASE_URL is required." }, { status: 503 });

  const body = (await request.json().catch(() => ({}))) as { cycleId?: string; actionText?: string };
  const actionText = body.actionText?.trim();
  if (!body.cycleId || !actionText) {
    return NextResponse.json({ ok: false, error: "cycleId and actionText are required." }, { status: 400 });
  }

  // Only let the admin commit to an action once the report has actually
  // unlocked for this cycle -- committing to "one change" before there's
  // anything to act on isn't the feature the spec describes.
  const { report } = await new ResponseRepository(db).getLatestProtectedReportForTenant(session.tenant.id);
  if (report.protected) {
    return NextResponse.json({ ok: false, error: "The report hasn't unlocked yet for this cycle." }, { status: 400 });
  }

  const repo = new IdentityRepository(db);
  await repo.addCycleAction(session.tenant.id, body.cycleId, session.email, actionText);
  const actions = await repo.listCycleActions(session.tenant.id, body.cycleId);
  return NextResponse.json({ ok: true, actions });
}
