import { randomUUID } from "node:crypto";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { Pool } from "pg";
import { createTenantSurveyCycle } from "@/lib/server/surveyCycleService";
import { submitWithSeveredRepositories } from "@/lib/server/confidentialSubmissionService";
import { IdentityRepository } from "@/lib/server/repositories/identityRepository";
import { ResponseRepository } from "@/lib/server/repositories/responseRepository";

const connectionString = process.env.SAFERSAY_TEST_DATABASE_URL;
const describeIfDb = connectionString ? describe : describe.skip;

/**
 * Proves department-scoped reporting against real Postgres: not just that
 * a qualifying department returns real numbers, but that the differencing
 * mitigation (getDepartmentReleasability) actually suppresses a second
 * department when only one would otherwise be the lone reconstructable
 * remainder, and that no raw answer content or identity data leaks through
 * any of the new paths.
 */
describeIfDb("Postgres department-scoped protected report", () => {
  let pool: Pool;
  const tenantIds: string[] = [];

  beforeAll(() => {
    pool = new Pool({ connectionString, ssl: { rejectUnauthorized: false } });
  });

  afterAll(async () => {
    await pool.end();
  });

  afterEach(async () => {
    for (const tenantId of tenantIds.splice(0)) {
      await cleanupTenant(pool, tenantId);
    }
  });

  it("suppresses a below-threshold department and its complementary pair, while a genuinely safe department stays visible", async () => {
    const identity = new IdentityRepository(pool);
    const tenant = await identity.createTenant("SaferSay Dept E2E", `safersay-dept-e2e-${randomUUID()}`);
    tenantIds.push(tenant.id);

    // 6 Engineering (smallest releasable), 8 Sales (largest releasable), 2 Support (below threshold).
    const roster = [
      ...Array.from({ length: 6 }, (_, i) => ({ team: "Engineering", index: i })),
      ...Array.from({ length: 8 }, (_, i) => ({ team: "Sales", index: i })),
      ...Array.from({ length: 2 }, (_, i) => ({ team: "Support", index: i })),
    ];
    await identity.importEmployees(
      tenant.id,
      roster.map(({ team, index }) => ({
        email: `dept-e2e-${team}-${index}-${randomUUID()}@example.com`,
        name: `${team} ${index}`,
        team,
        location: "Remote",
      })),
    );

    const cycle = await createTenantSurveyCycle({
      db: pool,
      tenantId: tenant.id,
      tenantName: tenant.name,
      templateSlug: "engagement-check",
      cycleName: "Department E2E pilot",
    });

    const response = new ResponseRepository(pool);
    const session = await response.getRespondentSurveySession(cycle.cycleId);
    const questionId = session!.questions[0].id;

    // A cycle only accepts submissions once it's actually been sent/opened
    // -- see openCycle's doc comment and confidentialSubmissionService.ts's
    // status guard.
    expect(await response.openCycle(tenant.id, cycle.cycleId)).toBe(true);

    const outbox = await identity.getInviteOutbox(tenant.id, cycle.cycleId);
    const rawTokens = outbox.rows.map((row) => row.respondentPath!.replace("/s/", ""));
    for (const rawToken of rawTokens) {
      await submitWithSeveredRepositories({ db: pool, rawToken, answers: [{ questionId, numberValue: 4 }] });
    }

    // Departments list is names only, alphabetical.
    const departments = await response.listDepartmentsForCycle(tenant.id, cycle.cycleId);
    expect(departments).toEqual(["engineering", "sales", "support"]);

    // Support is naturally below threshold -> always suppressed, and the
    // API response must never carry its real (small) n.
    const supportReport = await response.getProtectedReportForTenant(tenant.id, cycle.cycleId, 5, {
      type: "department",
      department: "support",
    });
    expect(supportReport).toEqual({ protected: true, n: 0, rows: [] });

    // Engineering is the smallest releasable department -- with exactly
    // one department (Support) naturally below threshold, Engineering must
    // be bundled into suppression too, so a viewer can't reconstruct
    // Support's average via org-total minus Sales minus Engineering.
    const engineeringReport = await response.getProtectedReportForTenant(tenant.id, cycle.cycleId, 5, {
      type: "department",
      department: "engineering",
    });
    expect(engineeringReport).toEqual({ protected: true, n: 0, rows: [] });

    // Sales is large enough to stay releasable even after complementary
    // suppression takes Engineering out.
    const salesReport = await response.getProtectedReportForTenant(tenant.id, cycle.cycleId, 5, {
      type: "department",
      department: "sales",
    });
    expect(salesReport.protected).toBe(false);
    expect(salesReport.n).toBe(8);
    expect(salesReport.rows[0]).toMatchObject({ questionId, n: 8, average: 4 });

    // Org-level report is completely unaffected by any of the above.
    const orgReport = await response.getProtectedReportForTenant(tenant.id, cycle.cycleId, 5);
    expect(orgReport.protected).toBe(false);
    expect(orgReport.n).toBe(16);
    // team scope (People Leader) has its own dedicated live e2e coverage --
    // see managerHierarchyLive.e2e.test.ts, which builds a real manager_id
    // hierarchy this test's tenant doesn't have.
  }, 30_000);
});

async function cleanupTenant(pool: Pool, tenantId: string) {
  await pool.query("delete from identity.invite_outbox where participant_id in (select id from identity.survey_participants where tenant_id = $1)", [tenantId]);
  await pool.query("delete from identity.invite_outbox where tenant_id = $1", [tenantId]);
  await pool.query("delete from responses.answers where submission_id in (select id from responses.submissions where tenant_id = $1)", [tenantId]);
  await pool.query("delete from responses.submissions where tenant_id = $1", [tenantId]);
  await pool.query("delete from responses.survey_cycles where tenant_id = $1", [tenantId]);
  await pool.query("delete from identity.onboarding_events where tenant_id = $1", [tenantId]);
  await pool.query("delete from identity.survey_participants where tenant_id = $1", [tenantId]);
  await pool.query("delete from identity.employees where tenant_id = $1", [tenantId]);
  await pool.query("delete from identity.users where tenant_id = $1", [tenantId]);
  await pool.query("delete from identity.tenant_settings where tenant_id = $1", [tenantId]);
  await pool.query("delete from identity.tenants where id = $1", [tenantId]);
}
