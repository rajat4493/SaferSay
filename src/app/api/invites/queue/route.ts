import { NextResponse, type NextRequest } from "next/server";
import { getDatabasePool } from "@/lib/server/db/pool";
import { hasAdminApiAccess } from "@/lib/server/adminApi";
import { IdentityRepository } from "@/lib/server/repositories/identityRepository";
import { resolveTenantContext } from "@/lib/server/tenant";

export async function POST(request: NextRequest) {
  if (!hasAdminApiAccess(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized invite queue access." }, { status: 401 });
  }

  const db = getDatabasePool();
  if (!db) return NextResponse.json({ ok: false, error: "DATABASE_URL is required." }, { status: 503 });

  const body = (await request.json().catch(() => ({}))) as { cycleId?: string; deliveryType?: "invite" | "reminder" };
  const deliveryType = body.deliveryType ?? "invite";
  const { tenant } = await resolveTenantContext(request);
  const repo = new IdentityRepository(db);
  const cycleId = body.cycleId ?? (await repo.getLatestCycleIdForTenant(tenant.id));
  if (!cycleId) return NextResponse.json({ ok: false, error: "No survey cycle was found." }, { status: 400 });

  const queued = await repo.markOutboxQueued(tenant.id, cycleId, deliveryType);
  return NextResponse.json({ ok: true, tenant, cycleId, deliveryType, queued, ...(await repo.getInviteOutbox(tenant.id, cycleId)) });
}
