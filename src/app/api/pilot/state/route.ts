import { NextResponse } from "next/server";
import { getSessionContext } from "@/lib/server/authSession";
import { withTenantScopedDb } from "@/lib/server/db/tenantPool";
import { getPilotState } from "@/lib/server/pilotStateService";
import { canViewSurveyResults } from "@/lib/permissions";

export async function GET() {
  const session = await getSessionContext();
  if (!session) {
    return NextResponse.json({ ok: false, error: "Unauthorized pilot state access." }, { status: 401 });
  }
  if (!canViewSurveyResults(session.role)) {
    return NextResponse.json({ ok: false, error: "You don't have permission to view pilot state." }, { status: 403 });
  }

  const { tenant } = session;
  const state = await withTenantScopedDb(tenant.id, (db) => getPilotState({ db, tenantId: tenant.id, tenantName: tenant.name }));
  return NextResponse.json({ ok: true, tenant, ...state });
}
