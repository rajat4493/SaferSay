import { NextResponse, type NextRequest } from "next/server";
import { getDatabasePool } from "@/lib/server/db/pool";
import { hasAdminApiAccess } from "@/lib/server/adminApi";
import { ResponseRepository } from "@/lib/server/repositories/responseRepository";
import { resolveTenantContext } from "@/lib/server/tenant";
import { getProtectedServerReport } from "@/lib/serverStore";

export async function GET(request: NextRequest) {
  if (!hasAdminApiAccess(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized report access." }, { status: 401 });
  }

  const db = getDatabasePool();
  if (db) {
    const { tenant } = await resolveTenantContext(request);
    return NextResponse.json({ ok: true, tenant, ...(await new ResponseRepository(db).getLatestProtectedReportForTenant(tenant.id)) });
  }
  return NextResponse.json({ ok: true, cycle: null, report: await getProtectedServerReport() });
}
