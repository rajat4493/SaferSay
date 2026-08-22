import { NextResponse } from "next/server";
import { getSessionContext } from "@/lib/server/authSession";
import { withTenantScopedDb } from "@/lib/server/db/tenantPool";
import { IdentityRepository } from "@/lib/server/repositories/identityRepository";
import { ResponseRepository } from "@/lib/server/repositories/responseRepository";
import { logAuditEvent } from "@/lib/server/auditLog";
import { canModifySettings } from "@/lib/permissions";

/**
 * Full self-serve export of a tenant's own operational data -- the
 * "your data is always exportable, never held hostage" promise, and the
 * shape an RFP/procurement review expects (portability, no vendor
 * lock-in). Deliberately excludes individual survey answers and
 * protected/sub-threshold report rows -- those stay exactly as
 * inaccessible to the tenant's own admin as everywhere else in the
 * product; this is roster/configuration data, not response content.
 */
export async function GET() {
  const session = await getSessionContext();
  if (!session) return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  if (!canModifySettings(session.role)) {
    return NextResponse.json({ ok: false, error: "You don't have permission to export workspace data." }, { status: 403 });
  }

  const bundle = await withTenantScopedDb(session.tenant.id, async (db) => {
    const identityRepo = new IdentityRepository(db);
    const responseRepo = new ResponseRepository(db);

    const [employees, teams, cycles, questionBank, settings] = await Promise.all([
      identityRepo.listEmployees(session.tenant.id, { limit: 100000 }),
      identityRepo.listTeams(session.tenant.id),
      responseRepo.listCyclesForTenant(session.tenant.id, session.tenant.name),
      responseRepo.listQuestionBank(session.tenant.id),
      identityRepo.getTenantSelfSettings(session.tenant.id),
    ]);

    return {
      exportedAt: new Date().toISOString(),
      tenant: { id: session.tenant.id, name: session.tenant.name, slug: session.tenant.slug },
      settings: { minGroupSize: settings.minGroupSize, dataResidencyRegion: settings.dataResidencyRegion, planTier: settings.planTier },
      employees: employees.employees,
      teams,
      surveyCycles: cycles.map((cycle) => ({ id: cycle.id, name: cycle.name, status: cycle.status, minGroupSize: cycle.minGroupSize, createdAt: cycle.createdAt })),
      questionBank,
    };
  });

  await logAuditEvent({ tenantId: session.tenant.id, actorRole: session.role, actorId: session.email, action: "report_exported", targetType: "workspace" });

  return NextResponse.json({ ok: true, export: bundle });
}
