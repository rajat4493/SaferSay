import { NextResponse, type NextRequest } from "next/server";
import { getSessionContext, isPlatformOwnerImpersonating } from "@/lib/server/authSession";
import { withTenantScopedDb } from "@/lib/server/db/tenantPool";
import { IdentityRepository } from "@/lib/server/repositories/identityRepository";
import { ResponseRepository } from "@/lib/server/repositories/responseRepository";
import { canRunSurvey } from "@/lib/permissions";

export async function GET(request: NextRequest) {
  const session = await getSessionContext();
  if (!session) return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });

  if (!canRunSurvey(session.role)) return NextResponse.json({ ok: false, error: "You do not have permission to add survey notes." }, { status: 403 });

  const cycleId = request.nextUrl.searchParams.get("cycleId");
  if (!cycleId) return NextResponse.json({ ok: false, error: "cycleId is required." }, { status: 400 });

  const actions = await withTenantScopedDb(session.tenant.id, (db) =>
    new IdentityRepository(db).listCycleActions(session.tenant.id, cycleId),
  );
  return NextResponse.json({ ok: true, actions });
}

export async function POST(request: NextRequest) {
  const session = await getSessionContext();
  if (!session) return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });

  if (isPlatformOwnerImpersonating(session)) {
    return NextResponse.json({ ok: false, error: "Platform owners cannot act on tenant reports." }, { status: 403 });
  }

  const body = (await request.json().catch(() => ({}))) as { cycleId?: string; actionText?: string };
  const actionText = body.actionText?.trim();
  if (!body.cycleId || !actionText) {
    return NextResponse.json({ ok: false, error: "cycleId and actionText are required." }, { status: 400 });
  }
  const cycleId = body.cycleId;

  const result = await withTenantScopedDb(session.tenant.id, async (db) => {
    const responseRepo = new ResponseRepository(db);
    const cycle = await responseRepo.getCycleForTenant(session.tenant.id, cycleId);
    if (!cycle) return { error: "not-found" as const };
    if (cycle.status === "closed") return { error: "closed" as const };

    // Only let the admin commit to an action once the report has actually
    // unlocked for this cycle -- committing to "one change" before there's
    // anything to act on isn't the feature the spec describes.
    const reportResult = await responseRepo.getProtectedReportForTenant(session.tenant.id, cycleId, cycle.minGroupSize);
    if (reportResult.protected) return { error: "protected" as const };

    const repo = new IdentityRepository(db);
    await repo.addCycleAction(session.tenant.id, cycleId, session.email, actionText);
    return { actions: await repo.listCycleActions(session.tenant.id, cycleId) };
  });

  if (result.error === "not-found") return NextResponse.json({ ok: false, error: "Survey not found." }, { status: 404 });
  if (result.error === "closed") return NextResponse.json({ ok: false, error: "Survey is closed and locked." }, { status: 423 });
  if (result.error === "protected") return NextResponse.json({ ok: false, error: "The report hasn't unlocked yet for this cycle." }, { status: 400 });
  return NextResponse.json({ ok: true, actions: result.actions });
}
