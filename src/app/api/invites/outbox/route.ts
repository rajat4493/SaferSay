import { NextResponse, type NextRequest } from "next/server";
import { getSessionContext } from "@/lib/server/authSession";
import { withTenantScopedDb } from "@/lib/server/db/tenantPool";
import { IdentityRepository } from "@/lib/server/repositories/identityRepository";

export async function GET(request: NextRequest) {
  const session = await getSessionContext();
  if (!session) {
    return NextResponse.json({ ok: false, error: "Unauthorized invite outbox access." }, { status: 401 });
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

  const body = (await request.json().catch(() => ({}))) as { cycleId?: string; includeReminders?: boolean };
  const { tenant, userId } = session;

  const result = await withTenantScopedDb(tenant.id, async (db) => {
    const repo = new IdentityRepository(db);
    const cycleId = body.cycleId ?? (await repo.getLatestCycleIdForTenant(tenant.id));
    if (!cycleId) return null;

    const invitesPrepared = await repo.prepareInviteOutbox(tenant.id, cycleId);
    const remindersPrepared = body.includeReminders ? await repo.prepareReminderOutbox(tenant.id, cycleId) : 0;

    if (invitesPrepared > 0) {
      await repo.emitOnboardingEvent(tenant.id, userId, "outbox");
    }

    return { cycleId, invitesPrepared, remindersPrepared, ...(await repo.getInviteOutbox(tenant.id, cycleId)) };
  });

  if (!result) return NextResponse.json({ ok: false, error: "Create a survey cycle before preparing invites." }, { status: 400 });
  return NextResponse.json({ ok: true, tenant, ...result });
}
