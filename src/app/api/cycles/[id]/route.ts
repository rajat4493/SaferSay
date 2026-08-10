import { NextResponse, type NextRequest } from "next/server";
import { getSessionContext } from "@/lib/server/authSession";
import { withTenantScopedDb } from "@/lib/server/db/tenantPool";
import { IdentityRepository } from "@/lib/server/repositories/identityRepository";
import { ResponseRepository } from "@/lib/server/repositories/responseRepository";
import { canViewSurveyResults } from "@/lib/permissions";

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const session = await getSessionContext();
  if (!session) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }
  if (!canViewSurveyResults(session.role)) {
    return NextResponse.json({ ok: false, error: "You don't have permission to view this survey." }, { status: 403 });
  }

  const { id: cycleId } = await context.params;
  const { tenant } = session;

  const result = await withTenantScopedDb(tenant.id, async (db) => {
    const responseRepo = new ResponseRepository(db);
    const cycle = await responseRepo.getCycleForTenant(tenant.id, cycleId, tenant.name);
    if (!cycle) return null;

    // Sequential, not Promise.all: db is a single shared client under
    // withTenantScopedDb (tenant-scoped connection), and pg clients can't
    // run concurrent queries on one connection.
    const survey = await responseRepo.getRespondentSurveySession(cycleId);
    const identityRepo = new IdentityRepository(db);
    const outbox = await identityRepo.getInviteOutbox(tenant.id, cycleId);
    const participation = await identityRepo.getParticipationSummary(tenant.id, cycleId);

    return {
      cycle,
      templateName: survey?.templateName ?? null,
      questions: survey?.questions ?? [],
      outbox: outbox.summary,
      participation,
    };
  });

  if (!result) {
    return NextResponse.json({ ok: false, error: "Survey not found." }, { status: 404 });
  }
  return NextResponse.json({ ok: true, ...result });
}
