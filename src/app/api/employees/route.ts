import { NextResponse, type NextRequest } from "next/server";
import { getSessionContext } from "@/lib/server/authSession";
import { getDatabasePool } from "@/lib/server/db/pool";
import { IdentityRepository } from "@/lib/server/repositories/identityRepository";

export async function GET(request: NextRequest) {
  const session = await getSessionContext();
  if (!session) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  const db = getDatabasePool();
  if (!db) return NextResponse.json({ ok: false, error: "DATABASE_URL is required." }, { status: 503 });

  const search = request.nextUrl.searchParams.get("search") ?? undefined;
  const limit = Number(request.nextUrl.searchParams.get("limit") ?? "25");
  const offset = Number(request.nextUrl.searchParams.get("offset") ?? "0");

  const repo = new IdentityRepository(db);
  const { employees, total } = await repo.listEmployees(session.tenant.id, { search, limit, offset });

  return NextResponse.json({ ok: true, employees, total });
}
