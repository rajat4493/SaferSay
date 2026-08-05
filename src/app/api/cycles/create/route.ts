import { NextResponse, type NextRequest } from "next/server";
import { getSessionContext } from "@/lib/server/authSession";
import { withTenantScopedDb } from "@/lib/server/db/tenantPool";
import { IdentityRepository } from "@/lib/server/repositories/identityRepository";
import { createTenantSurveyCycle, type CustomCycleQuestion } from "@/lib/server/surveyCycleService";

export async function POST(request: NextRequest) {
  const session = await getSessionContext();
  if (!session) {
    return NextResponse.json({ ok: false, error: "Unauthorized survey cycle creation." }, { status: 401 });
  }

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
    return NextResponse.json({ ok: true, tenant, cycle });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Survey cycle could not be created." },
      { status: 400 },
    );
  }
}
