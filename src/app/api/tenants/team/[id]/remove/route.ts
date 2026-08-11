import { NextResponse, type NextRequest } from "next/server";
import { getSessionContext } from "@/lib/server/authSession";
import { withTenantScopedDb } from "@/lib/server/db/tenantPool";
import { IdentityRepository } from "@/lib/server/repositories/identityRepository";
import { canManageTeam } from "@/lib/permissions";
import { logTeamMemberRemoved } from "@/lib/server/auditLog";

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const session = await getSessionContext();
  if (!session) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }
  if (!canManageTeam(session.role)) {
    return NextResponse.json({ ok: false, error: "Only the workspace owner can manage the team." }, { status: 403 });
  }

  const { id } = await context.params;
  if (id === session.userId) {
    return NextResponse.json({ ok: false, error: "You can't remove yourself from the team." }, { status: 400 });
  }

  const result = await withTenantScopedDb(session.tenant.id, async (db) => {
    const repo = new IdentityRepository(db);
    const team = await repo.listTeam(session.tenant.id);
    const target = team.find((member) => member.id === id);
    if (!target) return { error: "not-found" as const };

    if (target.status === "active" && target.role === "customer_admin") {
      const remainingAdmins = team.filter((member) => member.status === "active" && member.role === "customer_admin" && member.id !== id);
      if (remainingAdmins.length === 0) {
        return { error: "last-admin" as const };
      }
    }

    await repo.removeTeamMember(session.tenant.id, id);
    return { team: await repo.listTeam(session.tenant.id), removedRole: target.role };
  });

  if (result.error === "not-found") {
    return NextResponse.json({ ok: false, error: "That team member or invite no longer exists." }, { status: 404 });
  }
  if (result.error === "last-admin") {
    return NextResponse.json({ ok: false, error: "A workspace needs at least one Workspace Owner — invite another Workspace Owner before removing this one." }, { status: 400 });
  }
  await logTeamMemberRemoved(session.tenant.id, session.role, session.email, result.removedRole);
  return NextResponse.json({ ok: true, team: result.team });
}
