import { NextResponse, type NextRequest } from "next/server";
import { getSessionContext } from "@/lib/server/authSession";
import { withTenantScopedDb } from "@/lib/server/db/tenantPool";
import { IdentityRepository } from "@/lib/server/repositories/identityRepository";
import { canAccessPeople, canImportEmployees } from "@/lib/permissions";

export async function GET() {
  const session = await getSessionContext();
  if (!session) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }
  if (!canAccessPeople(session.role)) {
    return NextResponse.json({ ok: false, error: "You don't have permission to view groups." }, { status: 403 });
  }

  const teams = await withTenantScopedDb(session.tenant.id, (db) => new IdentityRepository(db).listTeams(session.tenant.id));

  return NextResponse.json({ ok: true, teams });
}

/**
 * Rename a single team, or merge several teams into one target -- distinguished
 * by whether the body carries `fromTeam` (rename) or `fromTeams` (merge).
 */
export async function PATCH(request: NextRequest) {
  const session = await getSessionContext();
  if (!session) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }
  if (!canImportEmployees(session.role)) {
    return NextResponse.json({ ok: false, error: "You don't have permission to manage groups." }, { status: 403 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    fromTeam?: string;
    fromTeams?: string[];
    toTeam?: string;
  };
  const toTeam = body.toTeam?.trim();
  if (!toTeam) {
    return NextResponse.json({ ok: false, error: "A target group name is required." }, { status: 400 });
  }

  if (Array.isArray(body.fromTeams) && body.fromTeams.length > 0) {
    const updated = await withTenantScopedDb(session.tenant.id, (db) =>
      new IdentityRepository(db).mergeTeams(session.tenant.id, body.fromTeams!, toTeam),
    );
    return NextResponse.json({ ok: true, updated });
  }

  const fromTeam = body.fromTeam?.trim();
  if (!fromTeam) {
    return NextResponse.json({ ok: false, error: "A source group name is required." }, { status: 400 });
  }
  const updated = await withTenantScopedDb(session.tenant.id, (db) =>
    new IdentityRepository(db).renameTeam(session.tenant.id, fromTeam, toTeam),
  );
  return NextResponse.json({ ok: true, updated });
}
