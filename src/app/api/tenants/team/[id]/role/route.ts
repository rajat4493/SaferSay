import { NextResponse, type NextRequest } from "next/server";
import { getSessionContext } from "@/lib/server/authSession";
import { withTenantScopedDb } from "@/lib/server/db/tenantPool";
import { IdentityRepository } from "@/lib/server/repositories/identityRepository";
import { canManageTeam } from "@/lib/permissions";
import { logTeamMemberRoleChanged } from "@/lib/server/auditLog";
import type { TeamRole } from "@/lib/server/repositories/types";

const ASSIGNABLE_ROLES: TeamRole[] = ["customer_admin", "survey_creator", "auditor", "people_leader", "integration_admin", "compliance_reviewer"];

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const session = await getSessionContext();
  if (!session) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }
  if (!canManageTeam(session.role)) {
    return NextResponse.json({ ok: false, error: "Only the workspace owner can manage the team." }, { status: 403 });
  }

  const { id } = await context.params;
  const body = (await request.json().catch(() => ({}))) as { role?: TeamRole };
  if (!body.role || !ASSIGNABLE_ROLES.includes(body.role)) {
    return NextResponse.json({ ok: false, error: "Not a valid team role." }, { status: 400 });
  }

  const result = await withTenantScopedDb(session.tenant.id, async (db) => {
    const repo = new IdentityRepository(db);
    const team = await repo.listTeam(session.tenant.id);
    const target = team.find((member) => member.id === id);
    if (!target) return { error: "not-found" as const };
    if (target.role === body.role) return { team, fromRole: target.role };

    // A workspace needs at least one Workspace Owner -- same guard as
    // removing the last one, since demoting them has the same effect.
    if (target.status === "active" && target.role === "customer_admin") {
      const remainingAdmins = team.filter((member) => member.status === "active" && member.role === "customer_admin" && member.id !== id);
      if (remainingAdmins.length === 0) return { error: "last-admin" as const };
    }

    await repo.updateTeamMemberRole(session.tenant.id, id, body.role as TeamRole);
    return { team: await repo.listTeam(session.tenant.id), fromRole: target.role };
  });

  if (result.error === "not-found") {
    return NextResponse.json({ ok: false, error: "That team member or invite no longer exists." }, { status: 404 });
  }
  if (result.error === "last-admin") {
    return NextResponse.json({ ok: false, error: "A workspace needs at least one Workspace Owner — make someone else a Workspace Owner first." }, { status: 400 });
  }
  if (result.fromRole !== body.role) {
    await logTeamMemberRoleChanged(session.tenant.id, session.role, session.email, result.fromRole, body.role as TeamRole);
  }
  return NextResponse.json({ ok: true, team: result.team });
}
