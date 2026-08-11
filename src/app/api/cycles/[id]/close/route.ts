import { NextResponse, type NextRequest } from "next/server";
import { getSessionContext } from "@/lib/server/authSession";
import { withTenantScopedDb } from "@/lib/server/db/tenantPool";
import { ResponseRepository } from "@/lib/server/repositories/responseRepository";
import { logSurveyClosed } from "@/lib/server/auditLog";
import { canRunSurvey } from "@/lib/permissions";

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const session = await getSessionContext();
  if (!session) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }
  if (!canRunSurvey(session.role)) {
    return NextResponse.json({ ok: false, error: "You don't have permission to close surveys." }, { status: 403 });
  }

  const { id: cycleId } = await context.params;
  const { tenant } = session;

  const closed = await withTenantScopedDb(tenant.id, (db) => new ResponseRepository(db).closeCycle(tenant.id, cycleId));

  if (!closed) {
    return NextResponse.json({ ok: false, error: "Survey was not found or is already closed." }, { status: 400 });
  }

  logSurveyClosed(tenant.id, session.role, session.email, cycleId).catch((error) => {
    console.error(`Audit log for survey_closed (${cycleId}) failed:`, error);
  });

  return NextResponse.json({ ok: true });
}
