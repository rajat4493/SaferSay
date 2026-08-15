import { NextResponse } from "next/server";
import { getSessionContext, isPlatformOwnerImpersonating } from "@/lib/server/authSession";
import { getDatabasePool } from "@/lib/server/db/pool";
import { getTenantPool, withTenantContext } from "@/lib/server/db/tenantPool";
import { ResponseRepository } from "@/lib/server/repositories/responseRepository";
import { canViewSurveyResults } from "@/lib/permissions";

/**
 * Cross-cycle question trend for the tenant's last several cycles -- same
 * RBAC/impersonation rules as /api/report, since this is a pivot of the
 * same protected response content, not a separate data path.
 */
export async function GET() {
  const session = await getSessionContext();
  if (!session) {
    return NextResponse.json({ ok: false, error: "Unauthorized report access." }, { status: 401 });
  }
  if (!canViewSurveyResults(session.role)) {
    return NextResponse.json({ ok: false, error: "You don't have permission to view reports." }, { status: 403 });
  }
  if (isPlatformOwnerImpersonating(session)) {
    return NextResponse.json(
      { ok: false, error: "Platform owners cannot view tenant response content." },
      { status: 403 },
    );
  }

  const { tenant } = session;
  const tenantPool = getTenantPool();
  if (tenantPool) {
    const questions = await withTenantContext(tenantPool, tenant.id, (client) =>
      new ResponseRepository(client).getCrossCycleTrendForTenant(tenant.id, tenant.name),
    );
    return NextResponse.json({ ok: true, questions });
  }
  const adminPool = getDatabasePool();
  if (adminPool) {
    const questions = await new ResponseRepository(adminPool).getCrossCycleTrendForTenant(tenant.id, tenant.name);
    return NextResponse.json({ ok: true, questions });
  }
  // No database configured (local in-memory mode) -- trend has no
  // cross-cycle history to show, same as the single-cycle report's
  // getProtectedServerReport() fallback.
  return NextResponse.json({ ok: true, questions: [] });
}
