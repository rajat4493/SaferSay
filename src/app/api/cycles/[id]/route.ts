import { NextResponse, type NextRequest } from "next/server";
import { getSessionContext } from "@/lib/server/authSession";
import { withTenantScopedDb } from "@/lib/server/db/tenantPool";
import { IdentityRepository } from "@/lib/server/repositories/identityRepository";
import { ResponseRepository } from "@/lib/server/repositories/responseRepository";

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const session = await getSessionContext();
  if (!session) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  const { id: cycleId } = await context.params;
  const { tenant } = session;

  const result = await withTenantScopedDb(tenant.id, async (db) => {
    const responseRepo = new ResponseRepository(db);
    const cycle = await responseRepo.getCycleForTenant(tenant.id, cycleId);
    if (!cycle) return null;

    const [survey, outbox] = await Promise.all([
      responseRepo.getRespondentSurveySession(cycleId),
      new IdentityRepository(db).getInviteOutbox(tenant.id, cycleId),
    ]);

    return {
      cycle,
      templateName: survey?.templateName ?? null,
      questions: survey?.questions ?? [],
      outbox: outbox.summary,
    };
  });

  if (!result) {
    return NextResponse.json({ ok: false, error: "Survey not found." }, { status: 404 });
  }
  return NextResponse.json({ ok: true, ...result });
}
