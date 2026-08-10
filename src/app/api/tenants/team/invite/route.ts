import { NextResponse, type NextRequest } from "next/server";
import { getSessionContext } from "@/lib/server/authSession";
import { withTenantScopedDb } from "@/lib/server/db/tenantPool";
import { IdentityRepository } from "@/lib/server/repositories/identityRepository";
import { canManageTeam } from "@/lib/permissions";
import { logTeamInviteSent } from "@/lib/server/auditLog";
import type { TeamRole } from "@/lib/server/repositories/types";

const teamRoles: TeamRole[] = ["customer_admin", "survey_creator", "auditor"];

export async function POST(request: NextRequest) {
  const session = await getSessionContext();
  if (!session) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }
  if (!canManageTeam(session.role)) {
    return NextResponse.json({ ok: false, error: "Only the workspace owner can invite teammates." }, { status: 403 });
  }

  const body = (await request.json().catch(() => ({}))) as { email?: string; role?: string };
  const email = body.email?.trim().toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ ok: false, error: "A valid email is required." }, { status: 400 });
  }
  if (!body.role || !teamRoles.includes(body.role as TeamRole)) {
    return NextResponse.json({ ok: false, error: "A valid role is required." }, { status: 400 });
  }
  const role = body.role as TeamRole;

  const result = await withTenantScopedDb(session.tenant.id, async (db) => {
    const repo = new IdentityRepository(db);
    const existingUser = await repo.findUserByEmail(email);
    if (existingUser) return { error: "already-member" as const };

    const invite = await repo.createPendingInvite(session.tenant.id, email, role, session.email);
    const team = await repo.listTeam(session.tenant.id);
    return { invite, team };
  });

  if (result.error === "already-member") {
    return NextResponse.json({ ok: false, error: "That email already belongs to a SaferSay account." }, { status: 400 });
  }
  await logTeamInviteSent(session.tenant.id, session.role, session.email, role);
  return NextResponse.json({ ok: true, ...result });
}
