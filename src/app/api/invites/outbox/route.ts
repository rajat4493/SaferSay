import { NextResponse, type NextRequest } from "next/server";
import { getDatabasePool } from "@/lib/server/db/pool";
import { hasAdminApiAccess } from "@/lib/server/adminApi";
import { IdentityRepository } from "@/lib/server/repositories/identityRepository";
import { resolveTenantContext } from "@/lib/server/tenant";

export async function GET(request: NextRequest) {
  if (!hasAdminApiAccess(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized invite outbox access." }, { status: 401 });
  }

  const db = getDatabasePool();
  if (!db) return NextResponse.json({ ok: false, error: "DATABASE_URL is required." }, { status: 503 });

  const { tenant } = await resolveTenantContext(request);
  const repo = new IdentityRepository(db);
  const cycleId = request.nextUrl.searchParams.get("cycleId") ?? (await repo.getLatestCycleIdForTenant(tenant.id));
  if (!cycleId) return NextResponse.json({ ok: true, tenant, cycleId: null, outbox: null });

  return NextResponse.json({ ok: true, tenant, ...(await repo.getInviteOutbox(tenant.id, cycleId)) });
}

export async function POST(request: NextRequest) {
  if (!hasAdminApiAccess(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized invite outbox access." }, { status: 401 });
  }

  const db = getDatabasePool();
  if (!db) return NextResponse.json({ ok: false, error: "DATABASE_URL is required." }, { status: 503 });

  const body = (await request.json().catch(() => ({}))) as { cycleId?: string; includeReminders?: boolean };
  const { tenant } = await resolveTenantContext(request);
  const repo = new IdentityRepository(db);
  const cycleId = body.cycleId ?? (await repo.getLatestCycleIdForTenant(tenant.id));
  if (!cycleId) return NextResponse.json({ ok: false, error: "Create a survey cycle before preparing invites." }, { status: 400 });

  const invitesPrepared = await repo.prepareInviteOutbox(tenant.id, cycleId);
  const remindersPrepared = body.includeReminders ? await repo.prepareReminderOutbox(tenant.id, cycleId) : 0;
  return NextResponse.json({
    ok: true,
    tenant,
    cycleId,
    invitesPrepared,
    remindersPrepared,
    ...(await repo.getInviteOutbox(tenant.id, cycleId)),
  });
}
