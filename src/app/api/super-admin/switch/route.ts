import { NextResponse, type NextRequest } from "next/server";
import { getSessionContext, superAdminTenantCookieName } from "@/lib/server/authSession";
import { getDatabasePool } from "@/lib/server/db/pool";
import { IdentityRepository } from "@/lib/server/repositories/identityRepository";

export async function POST(request: NextRequest) {
  const session = await getSessionContext();
  if (!session) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }
  if (!session.isSuperAdmin) {
    return NextResponse.json({ ok: false, error: "Not a super admin." }, { status: 403 });
  }

  const body = (await request.json().catch(() => ({}))) as { tenantId?: string };
  const db = getDatabasePool();
  if (!db) {
    return NextResponse.json({ ok: false, error: "DATABASE_URL is required." }, { status: 503 });
  }

  const repo = new IdentityRepository(db);
  const response = NextResponse.json({ ok: true });

  if (!body.tenantId || body.tenantId === session.homeTenantId) {
    response.cookies.set(superAdminTenantCookieName, "", { path: "/", maxAge: 0 });
    return response;
  }

  const target = await repo.findTenantById(body.tenantId);
  if (!target) {
    return NextResponse.json({ ok: false, error: "Tenant not found." }, { status: 404 });
  }

  await repo.logSuperAdminAccess(session.userId, session.email, target.id);
  response.cookies.set(superAdminTenantCookieName, target.id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 8,
  });
  return response;
}
