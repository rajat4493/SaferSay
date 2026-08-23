import { NextResponse, type NextRequest } from "next/server";
import { parseEmployeeSyncPayload } from "@/lib/employeeSyncPayload";
import { resolveTenantFromApiKey } from "@/lib/server/apiKeyAuth";
import { withTenantScopedDb } from "@/lib/server/db/tenantPool";
import { IdentityRepository } from "@/lib/server/repositories/identityRepository";
import { logEmployeeImport } from "@/lib/server/auditLog";
import { checkRateLimit, getClientIp } from "@/lib/server/rateLimit";

/**
 * Generic HRIS/roster sync webhook: any external system (Workday,
 * BambooHR, a Zapier/Make bridge, a nightly export script) can push a
 * roster in without SaferSay building a named vendor's OAuth connector
 * first. Same tenant API key as /api/report/export (Authorization: Bearer
 * ssk_...) -- see resolveTenantFromApiKey -- and the same
 * IdentityRepository.importEmployees upsert the CSV admin-upload path
 * already uses (email is the match key either way).
 */
export async function POST(request: NextRequest) {
  const { allowed } = await checkRateLimit(`employee-sync:${getClientIp(request)}`, 20, 60);
  if (!allowed) {
    return NextResponse.json({ ok: false, error: "Too many requests. Try again in a minute." }, { status: 429 });
  }

  const tenantId = await resolveTenantFromApiKey(request);
  if (!tenantId) {
    return NextResponse.json({ ok: false, error: "Missing or invalid API key." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const preview = parseEmployeeSyncPayload(body?.employees ?? body);
  if (preview.errors.length > 0) {
    return NextResponse.json({ ok: false, errors: preview.errors }, { status: 400 });
  }

  const batchEmails = new Set(preview.employees.map((employee) => employee.email));

  const result = await withTenantScopedDb(tenantId, async (db) => {
    const repo = new IdentityRepository(db);
    const existingEmails = await repo.listAllEmployeeEmails(tenantId);
    const managerErrors = preview.employees
      .filter((employee) => employee.managerEmail && !batchEmails.has(employee.managerEmail) && !existingEmails.has(employee.managerEmail))
      .map((employee) => `${employee.email}: managerEmail "${employee.managerEmail}" does not match any known employee.`);
    if (managerErrors.length > 0) return { errors: managerErrors };

    const count = await repo.importEmployees(tenantId, preview.employees);
    return { imported: count };
  });

  if (result.errors) {
    return NextResponse.json({ ok: false, errors: result.errors }, { status: 400 });
  }

  const imported = result.imported ?? 0;
  if (imported > 0) {
    // No session/role for a webhook caller -- logged under a fixed
    // system actor, same convention as other unattended jobs (see
    // logDataRetentionPurged).
    logEmployeeImport(tenantId, "customer_admin", "system-hris-sync", imported).catch((error) => {
      console.error(`Audit log for employee_import (HRIS sync, tenant ${tenantId}) failed:`, error);
    });
  }

  return NextResponse.json({ ok: true, imported });
}
