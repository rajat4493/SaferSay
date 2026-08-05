import { NextResponse, type NextRequest } from "next/server";
import { parseEmployeeCsv } from "@/lib/csvEmployees";
import { getSessionContext } from "@/lib/server/authSession";
import { withTenantScopedDb } from "@/lib/server/db/tenantPool";
import { IdentityRepository } from "@/lib/server/repositories/identityRepository";

export async function POST(request: NextRequest) {
  const session = await getSessionContext();
  if (!session) {
    return NextResponse.json({ ok: false, error: "Unauthorized employee import." }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as { csv?: string };
  const preview = parseEmployeeCsv(body.csv ?? "");
  if (preview.errors.length > 0) {
    return NextResponse.json({ ok: false, errors: preview.errors, preview }, { status: 400 });
  }

  const { tenant, userId } = session;
  const imported = await withTenantScopedDb(tenant.id, async (db) => {
    const repo = new IdentityRepository(db);
    const count = await repo.importEmployees(tenant.id, preview.employees);
    if (count > 0) await repo.emitOnboardingEvent(tenant.id, userId, "employees");
    return count;
  });

  return NextResponse.json({
    ok: true,
    tenant,
    imported,
    totalRows: preview.totalRows,
  });
}
