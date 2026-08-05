import { NextResponse } from "next/server";
import { getSessionContext } from "@/lib/server/authSession";
import { getDatabasePool } from "@/lib/server/db/pool";
import { IdentityRepository } from "@/lib/server/repositories/identityRepository";

export async function GET() {
  const session = await getSessionContext();
  if (!session) return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  if (!session.isSuperAdmin) return NextResponse.json({ ok: false, error: "Not a super admin." }, { status: 403 });

  const db = getDatabasePool();
  if (!db) return NextResponse.json({ ok: false, error: "DATABASE_URL is required." }, { status: 503 });

  const usage = await new IdentityRepository(db).getPlatformUsageHealth();
  return NextResponse.json({ ok: true, usage });
}
