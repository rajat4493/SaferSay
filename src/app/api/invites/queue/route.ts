import { NextResponse, type NextRequest } from "next/server";
import { getSessionContext } from "@/lib/server/authSession";
import { getDatabasePool } from "@/lib/server/db/pool";
import { IdentityRepository } from "@/lib/server/repositories/identityRepository";
import { sendQueuedInviteDeliveries } from "@/lib/server/resendDelivery";

export async function POST(request: NextRequest) {
  const session = await getSessionContext();
  if (!session) {
    return NextResponse.json({ ok: false, error: "Unauthorized invite queue access." }, { status: 401 });
  }

  const db = getDatabasePool();
  if (!db) return NextResponse.json({ ok: false, error: "DATABASE_URL is required." }, { status: 503 });

  const body = (await request.json().catch(() => ({}))) as {
    cycleId?: string;
    deliveryType?: "invite" | "reminder";
    sendNow?: boolean;
  };
  const deliveryType = body.deliveryType ?? "invite";
  const { tenant, userId } = session;
  const repo = new IdentityRepository(db);
  const cycleId = body.cycleId ?? (await repo.getLatestCycleIdForTenant(tenant.id));
  if (!cycleId) return NextResponse.json({ ok: false, error: "No survey cycle was found." }, { status: 400 });

  const queued = await repo.markOutboxQueued(tenant.id, cycleId, deliveryType);

  if (queued > 0 && deliveryType === "invite") {
    await repo.emitOnboardingEvent(tenant.id, userId, "queue");
  }

  if (!body.sendNow) {
    return NextResponse.json({ ok: true, tenant, cycleId, deliveryType, queued, ...(await repo.getInviteOutbox(tenant.id, cycleId)) });
  }

  const deliveries = await repo.getQueuedOutboxDeliveries(tenant.id, cycleId, deliveryType);
  const delivery = await sendQueuedInviteDeliveries({ tenant, deliveries });
  await Promise.all([
    ...delivery.sentIds.map((id) => repo.markOutboxSent(id)),
    ...delivery.failedIds.map((id) => repo.markOutboxFailed(id)),
  ]);

  return NextResponse.json({
    ok: delivery.failed === 0,
    tenant,
    cycleId,
    deliveryType,
    queued,
    delivery: { sent: delivery.sent, failed: delivery.failed, errors: delivery.errors.slice(0, 5) },
    ...(await repo.getInviteOutbox(tenant.id, cycleId)),
  });
}
