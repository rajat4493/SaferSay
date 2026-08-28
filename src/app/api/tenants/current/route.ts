import { NextResponse } from "next/server";
import { getSessionContext, isPlatformOwnerImpersonating } from "@/lib/server/authSession";
import { withTenantScopedDb } from "@/lib/server/db/tenantPool";
import { IdentityRepository } from "@/lib/server/repositories/identityRepository";

export async function GET() {
  const session = await getSessionContext();
  if (!session) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }
  const { firstRunCompleted, actionMode } = await withTenantScopedDb(session.tenant.id, async (db) => {
    const repo = new IdentityRepository(db);
    // Sequential, not Promise.all -- may run on a single tenant-scoped
    // connection, same reasoning as the note in /api/invites/send.
    const firstRun = await repo.getFirstRunState(session.tenant.id);
    const settings = await repo.getTenantSelfSettings(session.tenant.id);
    return { firstRunCompleted: firstRun, actionMode: settings.actionMode };
  });
  return NextResponse.json({
    ok: true,
    tenant: session.tenant,
    userEmail: session.email,
    userName: session.name,
    role: session.role,
    isSuperAdmin: session.isSuperAdmin,
    isImpersonating: isPlatformOwnerImpersonating(session),
    firstRunCompleted,
    actionMode,
    source: "session",
  });
}
