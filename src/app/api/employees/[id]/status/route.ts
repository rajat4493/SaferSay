import { NextResponse, type NextRequest } from "next/server";
import { getSessionContext } from "@/lib/server/authSession";
import { getDatabasePool } from "@/lib/server/db/pool";
import { IdentityRepository } from "@/lib/server/repositories/identityRepository";

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const session = await getSessionContext();
  if (!session) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  const db = getDatabasePool();
  if (!db) return NextResponse.json({ ok: false, error: "DATABASE_URL is required." }, { status: 503 });

  const { id } = await context.params;
  const body = (await request.json().catch(() => ({}))) as { status?: "active" | "inactive" };
  if (body.status !== "active" && body.status !== "inactive") {
    return NextResponse.json({ ok: false, error: "status must be 'active' or 'inactive'." }, { status: 400 });
  }

  const repo = new IdentityRepository(db);
  try {
    await repo.setEmployeeStatus(session.tenant.id, id, body.status);
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Could not update employee." },
      { status: 400 },
    );
  }

  return NextResponse.json({ ok: true });
}
