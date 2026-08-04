import { NextResponse } from "next/server";
import { getSessionContext } from "@/lib/server/authSession";
import { getDatabasePool } from "@/lib/server/db/pool";
import { IdentityRepository } from "@/lib/server/repositories/identityRepository";

export async function GET() {
  const session = await getSessionContext();
  if (!session) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  if (!session.isSuperAdmin) {
    return NextResponse.json({
      ok: true,
      isSuperAdmin: false,
      currentTenant: session.tenant,
      homeTenantId: session.homeTenantId,
      tenants: [],
    });
  }

  const db = getDatabasePool();
  const tenants = db
    ? await new IdentityRepository(db).listTenantsWithStats()
    : [{ ...session.tenant, employeeCount: 0, latestCycleName: null, latestCycleStatus: null, lastActivityAt: null }];

  return NextResponse.json({
    ok: true,
    isSuperAdmin: true,
    currentTenant: session.tenant,
    homeTenantId: session.homeTenantId,
    tenants,
  });
}
