import { NextResponse, type NextRequest } from "next/server";
import { parseEmployeeCsv } from "@/lib/csvEmployees";
import { adminAccessCookieName } from "@/lib/adminAccessConstants";
import { getDatabasePool } from "@/lib/server/db/pool";
import { verifyAdminAccessToken } from "@/lib/server/adminAccess";
import { IdentityRepository } from "@/lib/server/repositories/identityRepository";
import { resolveTenantContext } from "@/lib/server/tenant";

export async function POST(request: NextRequest) {
  if (!verifyAdminAccessToken(request.cookies.get(adminAccessCookieName)?.value)) {
    return NextResponse.json({ ok: false, error: "Unauthorized employee import." }, { status: 401 });
  }

  const db = getDatabasePool();
  if (!db) {
    return NextResponse.json({ ok: false, error: "DATABASE_URL is required for employee import." }, { status: 503 });
  }

  const body = (await request.json().catch(() => ({}))) as { csv?: string };
  const preview = parseEmployeeCsv(body.csv ?? "");
  if (preview.errors.length > 0) {
    return NextResponse.json({ ok: false, errors: preview.errors, preview }, { status: 400 });
  }

  const { tenant } = await resolveTenantContext(request);
  const imported = await new IdentityRepository(db).importEmployees(tenant.id, preview.employees);

  return NextResponse.json({
    ok: true,
    tenant,
    imported,
    totalRows: preview.totalRows,
  });
}
