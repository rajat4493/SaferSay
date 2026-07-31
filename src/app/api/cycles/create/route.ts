import { NextResponse, type NextRequest } from "next/server";
import { adminAccessCookieName } from "@/lib/adminAccessConstants";
import { getDatabasePool } from "@/lib/server/db/pool";
import { verifyAdminAccessToken } from "@/lib/server/adminAccess";
import { createTenantSurveyCycle } from "@/lib/server/surveyCycleService";
import { resolveTenantContext } from "@/lib/server/tenant";

export async function POST(request: NextRequest) {
  if (!verifyAdminAccessToken(request.cookies.get(adminAccessCookieName)?.value)) {
    return NextResponse.json({ ok: false, error: "Unauthorized survey cycle creation." }, { status: 401 });
  }

  const db = getDatabasePool();
  if (!db) {
    return NextResponse.json({ ok: false, error: "DATABASE_URL is required for survey cycle creation." }, { status: 503 });
  }

  const body = (await request.json().catch(() => ({}))) as { templateSlug?: string; cycleName?: string };
  const { tenant } = await resolveTenantContext(request);

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
