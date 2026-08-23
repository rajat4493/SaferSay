import { NextResponse } from "next/server";
import { getSessionContext } from "@/lib/server/authSession";
import { withTenantScopedDb } from "@/lib/server/db/tenantPool";
import { IdentityRepository } from "@/lib/server/repositories/identityRepository";
import { canAccessAuditLog } from "@/lib/permissions";

export async function GET() {
  const session = await getSessionContext();
  if (!session) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }
  if (!canAccessAuditLog(session.role)) {
    return NextResponse.json({ ok: false, error: "You don't have access to the audit log." }, { status: 403 });
  }

  const logs = await withTenantScopedDb(session.tenant.id, (db) => new IdentityRepository(db).getAuditLogs(session.tenant.id));
  return NextResponse.json({ ok: true, logs });
}
