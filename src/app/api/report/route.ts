import { NextResponse } from "next/server";
import { getSessionContext, isPlatformOwnerImpersonating } from "@/lib/server/authSession";
import { getDatabasePool } from "@/lib/server/db/pool";
import { ResponseRepository } from "@/lib/server/repositories/responseRepository";
import { getProtectedServerReport } from "@/lib/serverStore";

export async function GET() {
  const session = await getSessionContext();
  if (!session) {
    return NextResponse.json({ ok: false, error: "Unauthorized report access." }, { status: 401 });
  }

  if (isPlatformOwnerImpersonating(session)) {
    // Hard architectural rule: the platform operator never has a path to
    // response content, threshold or not -- "even the vendor can't read
    // this" is the product's core claim. "Enter workspace" is for tenant
    // metadata/ops support only, never reports.
    return NextResponse.json(
      { ok: false, error: "Platform owners cannot view tenant response content." },
      { status: 403 },
    );
  }

  const db = getDatabasePool();
  if (db) {
    const { tenant } = session;
    return NextResponse.json({ ok: true, tenant, ...(await new ResponseRepository(db).getLatestProtectedReportForTenant(tenant.id)) });
  }
  return NextResponse.json({ ok: true, cycle: null, report: await getProtectedServerReport() });
}
