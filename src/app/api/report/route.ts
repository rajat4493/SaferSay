import { NextResponse, type NextRequest } from "next/server";
import { getSessionContext, isPlatformOwnerImpersonating } from "@/lib/server/authSession";
import { getDatabasePool } from "@/lib/server/db/pool";
import { getTenantPool, withTenantContext, type Queryable } from "@/lib/server/db/tenantPool";
import { ResponseRepository } from "@/lib/server/repositories/responseRepository";
import { getManagerRollupReport } from "@/lib/server/managerRollupService";
import { getProtectedServerReport } from "@/lib/serverStore";

/**
 * Reads a specific cycle's report when ?cycleId= is given (the
 * survey-object flow always passes it), otherwise falls back to the
 * tenant's latest cycle -- same optional-cycleId convention as
 * /api/invites/outbox and /api/invites/queue.
 */
async function loadReportForCycle(
  db: Queryable,
  repo: ResponseRepository,
  tenantId: string,
  cycleId: string | null,
  tenantName?: string,
  department?: string | null,
) {
  // department scope only applies when a specific cycle is requested --
  // the no-cycleId "latest cycle" convenience path stays org-scoped.
  const result = !cycleId
    ? await repo.getLatestProtectedReportForTenant(tenantId, undefined, tenantName)
    : await (async () => {
        const cycle = await repo.getCycleForTenant(tenantId, cycleId, tenantName);
        if (!cycle) return { cycle: null, report: { protected: true as const, n: 0, rows: [] } };
        return {
          cycle: { id: cycle.id, name: cycle.name, minGroupSize: cycle.minGroupSize },
          // A requested department that's too small on its own rolls up
          // through the manager hierarchy (or straight to company-wide
          // for a flat org) rather than just showing "not enough data" --
          // see managerRollupService.ts. Falls back to the plain org
          // report when no department was requested at all.
          report: department
            ? await getManagerRollupReport(db, tenantId, cycle.id, cycle.minGroupSize, department)
            : await repo.getProtectedReportForTenant(tenantId, cycle.id, cycle.minGroupSize),
        };
      })();

  // Open text stays org-wide in v1 regardless of the department picker --
  // see getProtectedOpenTextReport's doc comment on why department-scoped
  // text is a deliberate non-goal, not an oversight.
  const textAnswers = result.cycle
    ? await repo.getProtectedOpenTextReport(tenantId, result.cycle.id, result.cycle.minGroupSize)
    : { protected: true as const, n: 0, rows: [] };

  return { ...result, textAnswers };
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
  const department = request.nextUrl.searchParams.get("department");
  const tenantPool = getTenantPool();
  const { tenant } = session;
  if (tenantPool) {
    const result = await withTenantContext(tenantPool, tenant.id, (client) =>
      loadReportForCycle(client, new ResponseRepository(client), tenant.id, cycleId, tenant.name, department),
    );
    return NextResponse.json({ ok: true, tenant, ...result });
  }
  const adminPool = getDatabasePool();
  if (adminPool) {
    return NextResponse.json({
      ok: true,
      tenant,
      ...(await loadReportForCycle(adminPool, new ResponseRepository(adminPool), tenant.id, cycleId, tenant.name, department)),
    });
  }
  return NextResponse.json({ ok: true, cycle: null, report: await getProtectedServerReport() });
}
