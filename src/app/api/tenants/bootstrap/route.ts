import { NextResponse, type NextRequest } from "next/server";
import { getDatabasePool } from "@/lib/server/db/pool";
import { IdentityRepository, toTenantSlug } from "@/lib/server/repositories/identityRepository";

export async function POST(request: NextRequest) {
  const db = getDatabasePool();
  if (!db) {
    return NextResponse.json({ ok: false, error: "DATABASE_URL is required for tenant bootstrap." }, { status: 503 });
  }

  const body = (await request.json().catch(() => ({}))) as { name?: string; slug?: string };
  const name = body.name?.trim() || "SaferSay Demo Company";
  const slug = body.slug?.trim() ? toTenantSlug(body.slug) : toTenantSlug(name);
  const tenant = await new IdentityRepository(db).getOrCreateTenant(name, slug);

  return NextResponse.json({ ok: true, tenant });
}
