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

export async function POST(request: NextRequest) {
  const session = await getSessionContext();
  if (!session) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  const db = getDatabasePool();
  if (!db) return NextResponse.json({ ok: false, error: "DATABASE_URL is required." }, { status: 503 });

  const body = (await request.json().catch(() => ({}))) as {
    email?: string;
    name?: string;
    team?: string;
    location?: string;
    managerEmail?: string;
  };
  const email = body.email?.trim().toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ ok: false, error: "A valid email is required." }, { status: 400 });
  }

  const repo = new IdentityRepository(db);
  await repo.importEmployees(session.tenant.id, [
    { email, name: body.name?.trim() || undefined, team: body.team?.trim() || undefined, location: body.location?.trim() || undefined, managerEmail: body.managerEmail?.trim() || undefined },
  ]);
  await repo.emitOnboardingEvent(session.tenant.id, session.userId, "employees");

  return NextResponse.json({ ok: true });
}
