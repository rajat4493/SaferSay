import { NextResponse, type NextRequest } from "next/server";
import { getSessionContext, isPlatformOwnerImpersonating } from "@/lib/server/authSession";
import { getDatabasePool } from "@/lib/server/db/pool";
import { getTenantPool, withTenantContext } from "@/lib/server/db/tenantPool";
import { ResponseRepository } from "@/lib/server/repositories/responseRepository";
import { canViewComments, canViewSurveyResults } from "@/lib/permissions";

/**
 * Department name list for the department picker -- labels only, always
 * alphabetical, never counts or a size-implying order (see
 * responseRepository.ts's listDepartmentsForCycle). Same RBAC/impersonation
 * gate as /api/report, since department names are read from the same
 * cycle-scoped, tenant-authorized context.
 */
export async function GET(request: NextRequest) {
  const session = await getSessionContext();
  if (!session) {
    return NextResponse.json({ ok: false, error: "Unauthorized report access." }, { status: 401 });
  }
  if (!canViewSurveyResults(session.role)) {
    return NextResponse.json({ ok: false, error: "You don't have permission to view reports." }, { status: 403 });
  }
  if (!canViewComments(session.role)) {
    return NextResponse.json({ ok: true, departments: [] });
  }
  if (isPlatformOwnerImpersonating(session)) {
    return NextResponse.json(
      { ok: false, error: "Platform owners cannot view tenant response content." },
      { status: 403 },
    );
  }
  // The full department picker isn't relevant to a People Leader -- their
  // report scope is fixed to their own assigned subtree (see /api/report's
  // team-scope enforcement), and listing every org department here would
  // reveal org structure beyond that subtree.
  if (session.role === "people_leader") {
    return NextResponse.json({ ok: true, departments: [] });
  }

  const cycleId = request.nextUrl.searchParams.get("cycleId");
  if (!cycleId) {
    return NextResponse.json({ ok: false, error: "cycleId is required." }, { status: 400 });
  }

  const { tenant } = session;
  const tenantPool = getTenantPool();
  if (tenantPool) {
    const departments = await withTenantContext(tenantPool, tenant.id, (client) =>
      new ResponseRepository(client).listDepartmentsForCycle(tenant.id, cycleId),
    );
    return NextResponse.json({ ok: true, departments });
  }
  const adminPool = getDatabasePool();
  if (adminPool) {
    const departments = await new ResponseRepository(adminPool).listDepartmentsForCycle(tenant.id, cycleId);
    return NextResponse.json({ ok: true, departments });
  }
  return NextResponse.json({ ok: true, departments: [] });
}
