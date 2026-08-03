import { NextResponse } from "next/server";
import { getSessionContext } from "@/lib/server/authSession";
import { getDatabasePool } from "@/lib/server/db/pool";
import { ResponseRepository } from "@/lib/server/repositories/responseRepository";
import { getProtectedServerReport } from "@/lib/serverStore";

export async function GET() {
  const session = await getSessionContext();
  if (!session) {
    return NextResponse.json({ ok: false, error: "Unauthorized report access." }, { status: 401 });
  }

  const db = getDatabasePool();
  if (db) {
    const { tenant } = session;
    return NextResponse.json({ ok: true, tenant, ...(await new ResponseRepository(db).getLatestProtectedReportForTenant(tenant.id)) });
  }
  return NextResponse.json({ ok: true, cycle: null, report: await getProtectedServerReport() });
}
