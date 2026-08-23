import { NextResponse, type NextRequest } from "next/server";
import { parseEmployeeCsv } from "@/lib/csvEmployees";
import { getSessionContext } from "@/lib/server/authSession";
import { withTenantScopedDb } from "@/lib/server/db/tenantPool";
import { IdentityRepository } from "@/lib/server/repositories/identityRepository";
import { logEmployeeImport } from "@/lib/server/auditLog";
import { canImportEmployees } from "@/lib/permissions";

export async function POST(request: NextRequest) {
  const session = await getSessionContext();
  if (!session) {
    return NextResponse.json({ ok: false, error: "Unauthorized employee import." }, { status: 401 });
  }
  if (!canImportEmployees(session.role)) return NextResponse.json({ ok: false, error: "You don't have permission to import employees." }, { status: 403 });

  const body = (await request.json().catch(() => ({}))) as { csv?: string };
  const preview = parseEmployeeCsv(body.csv ?? "");
  if (preview.errors.length > 0) {
    return NextResponse.json({ ok: false, errors: preview.errors, preview }, { status: 400 });
  }

  const { tenant, userId } = session;
  // Diagnostic for a reported bug where employees import successfully but
  // never show up on the directory read afterward -- if that happens
  // again, comparing this tenant.id against the one logged by GET
  // /api/employees is the fastest way to confirm or rule out a
  // session/tenant-resolution mismatch between the two requests.
  console.log(`employees/import: tenant=${tenant.id} email=${session.email}`);
  const batchEmails = new Set(preview.employees.map((employee) => employee.email));

  const result = await withTenantScopedDb(tenant.id, async (db) => {
    const repo = new IdentityRepository(db);

    // manager_email is only trustworthy enough to eventually build
    // hierarchy-scoped reporting on if it's verified to reference a real
    // employee -- either already on file, or in this same batch (so a
    // whole org chart can be imported in one CSV without ordering rows by
    // seniority first).
    const existingEmails = await repo.listAllEmployeeEmails(tenant.id);
    const managerErrors = preview.employees
      .filter((employee) => employee.managerEmail && !batchEmails.has(employee.managerEmail) && !existingEmails.has(employee.managerEmail))
      .map((employee) => `${employee.email}: manager_email "${employee.managerEmail}" does not match any known employee.`);
    if (managerErrors.length > 0) {
      return { errors: managerErrors };
    }

    const count = await repo.importEmployees(tenant.id, preview.employees);
    if (count > 0) await repo.emitOnboardingEvent(tenant.id, userId, "employees");
    return { imported: count };
  });

  if (result.errors) {
    return NextResponse.json({ ok: false, errors: result.errors }, { status: 400 });
  }
  const imported = result.imported ?? 0;

  // Log audit event: employee list imported
  if (imported > 0) {
    await logEmployeeImport(tenant.id, session.role, session.email, imported);
  }

  return NextResponse.json({
    ok: true,
    tenant,
    imported,
    totalRows: preview.totalRows,
  });
}
