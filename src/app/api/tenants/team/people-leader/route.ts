import { NextResponse, type NextRequest } from "next/server";
import { getSessionContext } from "@/lib/server/authSession";
import { withTenantScopedDb } from "@/lib/server/db/tenantPool";
import { IdentityRepository } from "@/lib/server/repositories/identityRepository";
import { canManageTeam } from "@/lib/permissions";

/**
 * Assigns (or reassigns) an existing team member as a People Leader
 * scoped to one manager's reporting subtree -- see
 * IdentityRepository.setPeopleLeaderAssignment's doc comment for why this
 * is a dedicated action, not part of the generic team-invite flow.
 */
export async function POST(request: NextRequest) {
  const session = await getSessionContext();
  if (!session) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }
  if (!canManageTeam(session.role)) {
    return NextResponse.json({ ok: false, error: "Only the workspace owner can manage the team." }, { status: 403 });
  }

  const body = (await request.json().catch(() => ({}))) as { userId?: string; employeeEmail?: string };
  const employeeEmail = body.employeeEmail?.trim().toLowerCase();
  if (!body.userId || !employeeEmail) {
    return NextResponse.json({ ok: false, error: "userId and employeeEmail are required." }, { status: 400 });
  }

  const team = await withTenantScopedDb(session.tenant.id, async (db) => {
    const identity = new IdentityRepository(db);
    const employeeId = await identity.findEmployeeIdByEmail(session.tenant.id, employeeEmail);
    if (!employeeId) throw new Error("not_found");
    await identity.setPeopleLeaderAssignment(session.tenant.id, body.userId!, employeeId);
    return identity.listTeam(session.tenant.id);
  }).catch((error: unknown) => {
    if (error instanceof Error && error.message === "not_found") return null;
    throw error;
  });

  if (!team) return NextResponse.json({ ok: false, error: "No employee with that email in this workspace." }, { status: 404 });
  return NextResponse.json({ ok: true, team });
}
