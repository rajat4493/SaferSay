import { NextResponse, type NextRequest } from "next/server";
import { getSessionContext } from "@/lib/server/authSession";
import { getDatabasePool } from "@/lib/server/db/pool";
import { IdentityRepository } from "@/lib/server/repositories/identityRepository";

export async function POST(request: NextRequest) {
  const session = await getSessionContext();
  if (!session) return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  if (!session.isSuperAdmin) return NextResponse.json({ ok: false, error: "Not a super admin." }, { status: 403 });

  const db = getDatabasePool();
  if (!db) return NextResponse.json({ ok: false, error: "DATABASE_URL is required." }, { status: 503 });

  const body = (await request.json().catch(() => ({}))) as { name?: string };
  const name = body.name?.trim();
  if (!name) return NextResponse.json({ ok: false, error: "Tenant name is required." }, { status: 400 });

  const repo = new IdentityRepository(db);
  const tenant = await repo.createTenant(name);
  return NextResponse.json({ ok: true, tenant });
}

export async function GET() {
  const session = await getSessionContext();
  if (!session) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  if (!session.isSuperAdmin) {
    return NextResponse.json({
      ok: true,
      isSuperAdmin: false,
      currentTenant: session.tenant,
      homeTenantId: session.homeTenantId,
      tenants: [],
    });
  }

  const db = getDatabasePool();
  const tenants = db
    ? await new IdentityRepository(db).listTenantsWithStats()
    : [{ ...session.tenant, employeeCount: 0, latestCycleName: null, latestCycleStatus: null, lastActivityAt: null }];

  return NextResponse.json({
    ok: true,
    isSuperAdmin: true,
    currentTenant: session.tenant,
    homeTenantId: session.homeTenantId,
    tenants,
  });
}
