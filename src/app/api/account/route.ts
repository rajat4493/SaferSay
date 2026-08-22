import { NextResponse, type NextRequest } from "next/server";
import { getSessionContext } from "@/lib/server/authSession";
import { withTenantScopedDb } from "@/lib/server/db/tenantPool";
import { IdentityRepository } from "@/lib/server/repositories/identityRepository";

/**
 * Self-service display-name update. Deliberately name-only -- email/auth
 * identity is Supabase-managed and isn't editable here, and there's no
 * avatar upload in this pass.
 */
export async function PATCH(request: NextRequest) {
  const session = await getSessionContext();
  if (!session) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as { name?: string };
  const name = body.name?.trim();
  if (!name) {
    return NextResponse.json({ ok: false, error: "Name is required." }, { status: 400 });
  }
  if (name.length > 200) {
    return NextResponse.json({ ok: false, error: "Name is too long." }, { status: 400 });
  }

  const updated = await withTenantScopedDb(session.tenant.id, (db) =>
    new IdentityRepository(db).updateUserName(session.userId, session.tenant.id, name),
  );

  if (!updated) {
    return NextResponse.json({ ok: false, error: "Couldn't update your name." }, { status: 400 });
  }
  return NextResponse.json({ ok: true, name });
}
