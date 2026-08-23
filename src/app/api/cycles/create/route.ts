import { NextResponse, type NextRequest } from "next/server";
import { getSessionContext } from "@/lib/server/authSession";
import { withTenantScopedDb } from "@/lib/server/db/tenantPool";
import { IdentityRepository } from "@/lib/server/repositories/identityRepository";
import { createTenantSurveyCycle, type CustomCycleQuestion } from "@/lib/server/surveyCycleService";
import { logSurveyCreated } from "@/lib/server/auditLog";
import { canCreateSurvey } from "@/lib/permissions";

export async function POST(request: NextRequest) {
  const session = await getSessionContext();
  if (!session) {
    return NextResponse.json({ ok: false, error: "Unauthorized survey cycle creation." }, { status: 401 });
  }
  if (!canCreateSurvey(session.role)) return NextResponse.json({ ok: false, error: "You don't have permission to create surveys." }, { status: 403 });

  const body = (await request.json().catch(() => ({}))) as {
    templateSlug?: string;
    cycleName?: string;
    questions?: CustomCycleQuestion[];
  };
  const { tenant, userId } = session;

  try {
    const cycle = await withTenantScopedDb(tenant.id, async (db) => {
      const created = await createTenantSurveyCycle({
        db,
        tenantId: tenant.id,
        tenantName: tenant.name,
        templateSlug: body.templateSlug ?? "engagement-check",
        cycleName: body.cycleName,
        questions: body.questions,
      });
      await new IdentityRepository(db).emitOnboardingEvent(tenant.id, userId, "cycle");
      return created;
    });

    // Log audit event: survey created
    await logSurveyCreated(
      tenant.id,
      session.role,
      session.email,
      cycle.cycleId,
      body.templateSlug ?? "engagement-check"
    );

    return NextResponse.json({ ok: true, tenant, cycle });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Survey cycle could not be created." },
      { status: 400 },
    );
  }
}
