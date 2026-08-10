import { NextResponse, type NextRequest } from "next/server";
import { getSessionContext } from "@/lib/server/authSession";
import { withTenantScopedDb } from "@/lib/server/db/tenantPool";
import { IdentityRepository } from "@/lib/server/repositories/identityRepository";
import { canModifySettings } from "@/lib/permissions";
import { logThresholdChanged } from "@/lib/server/auditLog";

export async function GET() {
  const session = await getSessionContext();
  if (!session) return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  if (!canModifySettings(session.role)) {
    return NextResponse.json({ ok: false, error: "You don't have permission to view workspace settings." }, { status: 403 });
  }

  const settings = await withTenantScopedDb(session.tenant.id, (db) => new IdentityRepository(db).getTenantSelfSettings(session.tenant.id));
  return NextResponse.json({ ok: true, settings });
}

export async function PATCH(request: NextRequest) {
  const session = await getSessionContext();
  if (!session) return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  if (!canModifySettings(session.role)) {
    return NextResponse.json({ ok: false, error: "You don't have permission to change workspace settings." }, { status: 403 });
  }

  const body = (await request.json().catch(() => ({}))) as { minGroupSize?: number };

  const settings = await withTenantScopedDb(session.tenant.id, async (db) => {
    const repo = new IdentityRepository(db);
    if (typeof body.minGroupSize === "number") {
      // setMinGroupSize already clamps to the hard [3, 10] band -- the tenant
      // can tune it, but can never disable the wall (see
      // docs/strategy/CLIENT_TENANT_ADMIN_SPEC.md §7).
      await repo.setMinGroupSize(session.tenant.id, body.minGroupSize);
    }
    return repo.getTenantSelfSettings(session.tenant.id);
  });

  if (typeof body.minGroupSize === "number") {
    await logThresholdChanged(session.tenant.id, session.role, session.email, settings.minGroupSize);
  }

  return NextResponse.json({ ok: true, settings });
}
