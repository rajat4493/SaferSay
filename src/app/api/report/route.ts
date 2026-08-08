import { NextResponse, type NextRequest } from "next/server";
import { getSessionContext, isPlatformOwnerImpersonating } from "@/lib/server/authSession";
import { getDatabasePool } from "@/lib/server/db/pool";
import { getTenantPool, withTenantContext } from "@/lib/server/db/tenantPool";
import { ResponseRepository } from "@/lib/server/repositories/responseRepository";
import { getProtectedServerReport } from "@/lib/serverStore";

/**
 * Reads a specific cycle's report when ?cycleId= is given (the
 * survey-object flow always passes it), otherwise falls back to the
 * tenant's latest cycle -- same optional-cycleId convention as
 * /api/invites/outbox and /api/invites/queue.
 */
async function loadReportForCycle(repo: ResponseRepository, tenantId: string, cycleId: string | null, tenantName?: string) {
  if (!cycleId) return repo.getLatestProtectedReportForTenant(tenantId, undefined, tenantName);

  const cycle = await repo.getCycleForTenant(tenantId, cycleId, tenantName);
  if (!cycle) return { cycle: null, report: { protected: true as const, n: 0, rows: [] } };

  return {
    cycle: { id: cycle.id, name: cycle.name, minGroupSize: cycle.minGroupSize },
    report: await repo.getProtectedReportForTenant(tenantId, cycle.id, cycle.minGroupSize),
  };
}

export async function GET(request: NextRequest) {
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

  const cycleId = request.nextUrl.searchParams.get("cycleId");
  const tenantPool = getTenantPool();
  const { tenant } = session;
  if (tenantPool) {
    const result = await withTenantContext(tenantPool, tenant.id, (client) =>
      loadReportForCycle(new ResponseRepository(client), tenant.id, cycleId, tenant.name),
    );
    return NextResponse.json({ ok: true, tenant, ...result });
  }
  const adminPool = getDatabasePool();
  if (adminPool) {
    return NextResponse.json({
      ok: true,
      tenant,
      ...(await loadReportForCycle(new ResponseRepository(adminPool), tenant.id, cycleId, tenant.name)),
    });
  }
  return NextResponse.json({ ok: true, cycle: null, report: await getProtectedServerReport() });
}
