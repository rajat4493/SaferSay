import { NextResponse, type NextRequest } from "next/server";
import { getSessionContext } from "@/lib/server/authSession";
import { withTenantScopedDb } from "@/lib/server/db/tenantPool";
import { IdentityRepository } from "@/lib/server/repositories/identityRepository";
import { ResponseRepository } from "@/lib/server/repositories/responseRepository";
import { canRunSurvey } from "@/lib/permissions";

export async function GET(request: NextRequest) {
  const session = await getSessionContext();
  if (!session) {
    return NextResponse.json({ ok: false, error: "Unauthorized invite outbox access." }, { status: 401 });
  }
  if (!canRunSurvey(session.role)) {
    return NextResponse.json({ ok: false, error: "You don't have permission to manage invites." }, { status: 403 });
  }

  const { tenant } = session;
  const cycleIdParam = request.nextUrl.searchParams.get("cycleId");
  const result = await withTenantScopedDb(tenant.id, async (db) => {
    const repo = new IdentityRepository(db);
    const cycleId = cycleIdParam ?? (await repo.getLatestCycleIdForTenant(tenant.id));
    if (!cycleId) return { cycleId: null, outbox: null };
    return { cycleId, ...(await repo.getInviteOutbox(tenant.id, cycleId)) };
  });

  return NextResponse.json({ ok: true, tenant, ...result });
}

export async function POST(request: NextRequest) {
  const session = await getSessionContext();
  if (!session) {
    return NextResponse.json({ ok: false, error: "Unauthorized invite outbox access." }, { status: 401 });
  }
  if (!canRunSurvey(session.role)) {
    return NextResponse.json({ ok: false, error: "You don't have permission to manage invites." }, { status: 403 });
  }

  const body = (await request.json().catch(() => ({}))) as { cycleId?: string; includeReminders?: boolean };
  const { tenant, userId } = session;

  const result = await withTenantScopedDb(tenant.id, async (db) => {
    const repo = new IdentityRepository(db);
    const cycleId = body.cycleId ?? (await repo.getLatestCycleIdForTenant(tenant.id));
    if (!cycleId) return null;

    // Preparing/queuing invites against a closed survey would let sends
    // happen for a cycle that's no longer collecting -- same guard the
    // send-queue route applies before it will actually deliver anything.
    const cycle = await new ResponseRepository(db).getCycleForTenant(tenant.id, cycleId);
    if (cycle?.status === "closed") return "closed" as const;

    const invitesPrepared = await repo.prepareInviteOutbox(tenant.id, cycleId);
    const remindersPrepared = body.includeReminders ? await repo.prepareReminderOutbox(tenant.id, cycleId) : 0;

    if (invitesPrepared > 0) {
      await repo.emitOnboardingEvent(tenant.id, userId, "outbox");
    }

    return { cycleId, invitesPrepared, remindersPrepared, ...(await repo.getInviteOutbox(tenant.id, cycleId)) };
  });

  if (!result) return NextResponse.json({ ok: false, error: "Create a survey cycle before preparing invites." }, { status: 400 });
  if (result === "closed") return NextResponse.json({ ok: false, error: "This survey is closed. No further invites can be prepared." }, { status: 400 });
  return NextResponse.json({ ok: true, tenant, ...result });
}
