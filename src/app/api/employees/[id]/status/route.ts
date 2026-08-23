import { NextResponse, type NextRequest } from "next/server";
import { getSessionContext } from "@/lib/server/authSession";
import { withTenantScopedDb } from "@/lib/server/db/tenantPool";
import { IdentityRepository } from "@/lib/server/repositories/identityRepository";
import { canImportEmployees } from "@/lib/permissions";

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const session = await getSessionContext();
  if (!session) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }
  if (!canImportEmployees(session.role)) return NextResponse.json({ ok: false, error: "You don't have permission to manage employees." }, { status: 403 });

  const { id } = await context.params;
  const body = (await request.json().catch(() => ({}))) as { status?: "active" | "inactive" };
  if (body.status !== "active" && body.status !== "inactive") {
    return NextResponse.json({ ok: false, error: "status must be 'active' or 'inactive'." }, { status: 400 });
  }

  try {
    await withTenantScopedDb(session.tenant.id, (db) => new IdentityRepository(db).setEmployeeStatus(session.tenant.id, id, body.status!));
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Could not update employee." },
      { status: 400 },
    );
  }

  return NextResponse.json({ ok: true });
}
