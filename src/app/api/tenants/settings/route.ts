import { NextResponse, type NextRequest } from "next/server";
import { getSessionContext } from "@/lib/server/authSession";
import { getDatabasePool } from "@/lib/server/db/pool";
import { IdentityRepository } from "@/lib/server/repositories/identityRepository";

export async function GET() {
  const session = await getSessionContext();
  if (!session) return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });

  const db = getDatabasePool();
  if (!db) return NextResponse.json({ ok: false, error: "DATABASE_URL is required." }, { status: 503 });

  const settings = await new IdentityRepository(db).getTenantSelfSettings(session.tenant.id);
  return NextResponse.json({ ok: true, settings });
}

export async function PATCH(request: NextRequest) {
  const session = await getSessionContext();
  if (!session) return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });

  const db = getDatabasePool();
  if (!db) return NextResponse.json({ ok: false, error: "DATABASE_URL is required." }, { status: 503 });

  const body = (await request.json().catch(() => ({}))) as { minGroupSize?: number };
  const repo = new IdentityRepository(db);

  if (typeof body.minGroupSize === "number") {
    // setMinGroupSize already clamps to the hard [3, 10] band -- the tenant
    // can tune it, but can never disable the wall (see
    // docs/strategy/CLIENT_TENANT_ADMIN_SPEC.md §7).
    await repo.setMinGroupSize(session.tenant.id, body.minGroupSize);
  }

  const settings = await repo.getTenantSelfSettings(session.tenant.id);
  return NextResponse.json({ ok: true, settings });
}
