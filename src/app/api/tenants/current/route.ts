import { NextResponse } from "next/server";
import { getSessionContext, isPlatformOwnerImpersonating } from "@/lib/server/authSession";
import { withTenantScopedDb } from "@/lib/server/db/tenantPool";
import { IdentityRepository } from "@/lib/server/repositories/identityRepository";

export async function GET() {
  const session = await getSessionContext();
  if (!session) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }
  const firstRunCompleted = await withTenantScopedDb(session.tenant.id, (db) =>
    new IdentityRepository(db).getFirstRunState(session.tenant.id),
  );
  return NextResponse.json({
    ok: true,
    tenant: session.tenant,
    role: session.role,
    isSuperAdmin: session.isSuperAdmin,
    isImpersonating: isPlatformOwnerImpersonating(session),
    firstRunCompleted,
    source: "session",
  });
}
