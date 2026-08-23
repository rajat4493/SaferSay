import { NextResponse, type NextRequest } from "next/server";
import { getSessionContext } from "@/lib/server/authSession";
import { withTenantScopedDb } from "@/lib/server/db/tenantPool";
import { ResponseRepository } from "@/lib/server/repositories/responseRepository";
import { logSurveyClosed } from "@/lib/server/auditLog";

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const session = await getSessionContext();
  if (!session) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  const { id: cycleId } = await context.params;
  const { tenant } = session;

  const result = await withTenantScopedDb(tenant.id, (db) => new ResponseRepository(db).closeCycle(tenant.id, cycleId));
  // Diagnostic for a reported "close reports success but doesn't persist"
  // bug -- logged so it's traceable in Vercel function logs by cycleId,
  // and surfaced in the error response too so a report of what actually
  // happened doesn't require direct DB access to confirm.
  console.log(`cycles/close: tenant=${tenant.id} cycle=${cycleId} result=${JSON.stringify(result)}`);

  if (!result.closed) {
    const reason = !result.existing
      ? "no cycle with that id exists"
      : result.existing.tenant_id !== tenant.id
        ? `cycle belongs to a different tenant (${result.existing.tenant_id})`
        : `cycle status is already "${result.existing.status}"`;
    return NextResponse.json({ ok: false, error: "Survey was not found or is already closed.", reason }, { status: 400 });
  }

  logSurveyClosed(tenant.id, session.role, session.email, cycleId).catch((error) => {
    console.error(`Audit log for survey_closed (${cycleId}) failed:`, error);
  });

  return NextResponse.json({ ok: true, status: result.row.status });
}
