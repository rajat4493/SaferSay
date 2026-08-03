import { NextResponse, type NextRequest } from "next/server";
import { getSessionContext } from "@/lib/server/authSession";
import { getDatabasePool } from "@/lib/server/db/pool";
import { createTenantSurveyCycle } from "@/lib/server/surveyCycleService";

export async function POST(request: NextRequest) {
  const session = await getSessionContext();
  if (!session) {
    return NextResponse.json({ ok: false, error: "Unauthorized survey cycle creation." }, { status: 401 });
  }

  const db = getDatabasePool();
  if (!db) {
    return NextResponse.json({ ok: false, error: "DATABASE_URL is required for survey cycle creation." }, { status: 503 });
  }

  const body = (await request.json().catch(() => ({}))) as { templateSlug?: string; cycleName?: string };
  const { tenant } = session;

  try {
    const cycle = await createTenantSurveyCycle({
      db,
      tenantId: tenant.id,
      tenantName: tenant.name,
      templateSlug: body.templateSlug ?? "engagement-check",
      cycleName: body.cycleName,
    });
    return NextResponse.json({ ok: true, tenant, cycle });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Survey cycle could not be created." },
      { status: 400 },
    );
  }
}
