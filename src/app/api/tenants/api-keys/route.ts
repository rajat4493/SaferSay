import { NextResponse, type NextRequest } from "next/server";
import { getSessionContext } from "@/lib/server/authSession";
import { withTenantScopedDb } from "@/lib/server/db/tenantPool";
import { IdentityRepository } from "@/lib/server/repositories/identityRepository";
import { canModifySettings } from "@/lib/permissions";

export async function GET() {
  const session = await getSessionContext();
  if (!session) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }
  if (!canModifySettings(session.role)) {
    return NextResponse.json({ ok: false, error: "You don't have permission to view API keys." }, { status: 403 });
  }

  const keys = await withTenantScopedDb(session.tenant.id, (db) => new IdentityRepository(db).listApiKeys(session.tenant.id));

  return NextResponse.json({ ok: true, keys });
}

export async function POST(request: NextRequest) {
  const session = await getSessionContext();
  if (!session) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }
  if (!canModifySettings(session.role)) {
    return NextResponse.json({ ok: false, error: "You don't have permission to create API keys." }, { status: 403 });
  }

  const body = (await request.json().catch(() => ({}))) as { label?: string };

  const { rawKey } = await withTenantScopedDb(session.tenant.id, (db) =>
    new IdentityRepository(db).createApiKey(session.tenant.id, body.label?.trim() || null),
  );

  // Shown to the admin exactly once -- never persisted or logged in
  // plaintext, and this response is the only place it ever appears again.
  return NextResponse.json({ ok: true, key: rawKey });
}

export async function DELETE(request: NextRequest) {
  const session = await getSessionContext();
  if (!session) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }
  if (!canModifySettings(session.role)) {
    return NextResponse.json({ ok: false, error: "You don't have permission to revoke API keys." }, { status: 403 });
  }

  const id = request.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ ok: false, error: "A key id is required." }, { status: 400 });
  }

  await withTenantScopedDb(session.tenant.id, (db) => new IdentityRepository(db).revokeApiKey(session.tenant.id, id));

  return NextResponse.json({ ok: true });
}
