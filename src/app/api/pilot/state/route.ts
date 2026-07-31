import { NextResponse, type NextRequest } from "next/server";
import { getDatabasePool } from "@/lib/server/db/pool";
import { hasAdminApiAccess } from "@/lib/server/adminApi";
import { getPilotState } from "@/lib/server/pilotStateService";
import { resolveTenantContext } from "@/lib/server/tenant";

export async function GET(request: NextRequest) {
  if (!hasAdminApiAccess(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized pilot state access." }, { status: 401 });
  }

  const db = getDatabasePool();
  if (!db) return NextResponse.json({ ok: false, error: "DATABASE_URL is required." }, { status: 503 });

  const { tenant } = await resolveTenantContext(request);
  return NextResponse.json({ ok: true, tenant, ...(await getPilotState({ db, tenantId: tenant.id })) });
}
