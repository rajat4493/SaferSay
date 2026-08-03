import { NextResponse, type NextRequest } from "next/server";
import { parseEmployeeCsv } from "@/lib/csvEmployees";
import { getSessionContext } from "@/lib/server/authSession";
import { getDatabasePool } from "@/lib/server/db/pool";
import { IdentityRepository } from "@/lib/server/repositories/identityRepository";

export async function POST(request: NextRequest) {
  const session = await getSessionContext();
  if (!session) {
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

  const { tenant, userId } = session;
  const repo = new IdentityRepository(db);
  const imported = await repo.importEmployees(tenant.id, preview.employees);

  if (imported > 0) {
    await repo.emitOnboardingEvent(tenant.id, userId, "employees");
  }

  return NextResponse.json({
    ok: true,
    tenant,
    imported,
    totalRows: preview.totalRows,
  });
}
