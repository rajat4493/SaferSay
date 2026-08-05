import { NextResponse, type NextRequest } from "next/server";
import { getSessionContext } from "@/lib/server/authSession";
import { withTenantScopedDb } from "@/lib/server/db/tenantPool";
import { IdentityRepository } from "@/lib/server/repositories/identityRepository";
import { sendQueuedInviteDeliveries } from "@/lib/server/resendDelivery";

export async function POST(request: NextRequest) {
  const session = await getSessionContext();
  if (!session) {
    return NextResponse.json({ ok: false, error: "Unauthorized invite queue access." }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    cycleId?: string;
    deliveryType?: "invite" | "reminder";
    sendNow?: boolean;
  };
  const deliveryType = body.deliveryType ?? "invite";
  const { tenant, userId } = session;

  const result = await withTenantScopedDb(tenant.id, async (db) => {
    const repo = new IdentityRepository(db);
    const cycleId = body.cycleId ?? (await repo.getLatestCycleIdForTenant(tenant.id));
    if (!cycleId) return null;

    const queued = await repo.markOutboxQueued(tenant.id, cycleId, deliveryType);
    if (queued > 0 && deliveryType === "invite") {
      await repo.emitOnboardingEvent(tenant.id, userId, "queue");
    }

    if (!body.sendNow) {
      return { ok: true, cycleId, deliveryType, queued, ...(await repo.getInviteOutbox(tenant.id, cycleId)) };
    }

    const deliveries = await repo.getQueuedOutboxDeliveries(tenant.id, cycleId, deliveryType);
    const delivery = await sendQueuedInviteDeliveries({ tenant, deliveries });
    // Sequential, not Promise.all: db is a single shared client under
    // withTenantScopedDb (tenant-scoped connection), and pg clients can't
    // run concurrent queries on one connection.
    for (const id of delivery.sentIds) await repo.markOutboxSent(id);
    for (const id of delivery.failedIds) await repo.markOutboxFailed(id);

    return {
      ok: delivery.failed === 0,
      cycleId,
      deliveryType,
      queued,
      delivery: { sent: delivery.sent, failed: delivery.failed, errors: delivery.errors.slice(0, 5) },
      ...(await repo.getInviteOutbox(tenant.id, cycleId)),
    };
  });

  if (!result) return NextResponse.json({ ok: false, error: "No survey cycle was found." }, { status: 400 });
  return NextResponse.json({ tenant, ...result });
}
