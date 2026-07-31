import { NextResponse, type NextRequest } from "next/server";
import { getDatabasePool } from "@/lib/server/db/pool";
import { ResponseRepository } from "@/lib/server/repositories/responseRepository";
import { resolveTenantContext } from "@/lib/server/tenant";
import { getDefaultCycle, getProtectedServerReport } from "@/lib/serverStore";

export async function GET(request: NextRequest) {
  const db = getDatabasePool();
  if (db) {
    const { tenant } = await resolveTenantContext(request);
    return NextResponse.json(await new ResponseRepository(db).getProtectedReportForTenant(tenant.id, getDefaultCycle().id));
  }
  return NextResponse.json(await getProtectedServerReport());
}
