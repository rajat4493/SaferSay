import { NextResponse } from "next/server";
import { getSessionContext } from "@/lib/server/authSession";
import { withTenantScopedDb } from "@/lib/server/db/tenantPool";
import { ResponseRepository } from "@/lib/server/repositories/responseRepository";
import { canCreateSurvey } from "@/lib/permissions";

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getSessionContext();
  if (!session) return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  if (!canCreateSurvey(session.role)) {
    return NextResponse.json({ ok: false, error: "You don't have permission to cancel a scheduled survey." }, { status: 403 });
  }

  const { id } = await context.params;
  const removed = await withTenantScopedDb(session.tenant.id, (db) => new ResponseRepository(db).deleteRecurrence(session.tenant.id, id));
  if (!removed) return NextResponse.json({ ok: false, error: "That recurrence couldn't be found." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
