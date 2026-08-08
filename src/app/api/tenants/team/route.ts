import { NextResponse } from "next/server";
import { getSessionContext } from "@/lib/server/authSession";
import { withTenantScopedDb } from "@/lib/server/db/tenantPool";
import { IdentityRepository } from "@/lib/server/repositories/identityRepository";
import { canManageTeam } from "@/lib/permissions";

export async function GET() {
  const session = await getSessionContext();
  if (!session) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }
  if (!canManageTeam(session.role)) {
    return NextResponse.json({ ok: false, error: "Only the workspace owner can manage the team." }, { status: 403 });
  }

  const team = await withTenantScopedDb(session.tenant.id, (db) => new IdentityRepository(db).listTeam(session.tenant.id));
  return NextResponse.json({ ok: true, team, selfId: session.userId });
}
