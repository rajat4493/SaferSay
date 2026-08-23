import { randomUUID } from "node:crypto";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { Pool } from "pg";
import { createTenantSurveyCycle } from "@/lib/server/surveyCycleService";
import { submitWithSeveredRepositories } from "@/lib/server/confidentialSubmissionService";
import { IdentityRepository } from "@/lib/server/repositories/identityRepository";
import { ResponseRepository } from "@/lib/server/repositories/responseRepository";
import { getManagerRollupReport } from "@/lib/server/managerRollupService";

/**
 * Proves the manager-hierarchy rollup against real Postgres -- the
 * highest-risk piece of this feature (see plan history). Four properties:
 * (a) a too-small team rolls up exactly one level when that clears
 * threshold; (b) it keeps climbing when the immediate level is still too
 * small; (c) a flat org (no manager_id data) falls straight to
 * company-wide on the very first attempt, same code path as a pyramid;
 * (d) the sibling differencing guard actually suppresses a merged group
 * that would otherwise leak a smaller sibling's count by subtraction,
 * forcing a further climb rather than stopping at an unsafe level.
 */
const connectionString = process.env.SAFERSAY_TEST_DATABASE_URL;
const describeIfDb = connectionString ? describe : describe.skip;

describeIfDb("Postgres live manager-hierarchy rollup", () => {
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
      await pool.query("update identity.employees set manager_id = null where tenant_id = $1", [tenantId]);
      await pool.query(
        "delete from identity.invite_outbox where participant_id in (select id from identity.survey_participants where tenant_id = $1)",
        [tenantId],
      );
      await pool.query("delete from responses.answers where submission_id in (select id from responses.submissions where tenant_id = $1)", [tenantId]);
      await pool.query("delete from responses.submissions where tenant_id = $1", [tenantId]);
      await pool.query("delete from responses.survey_cycles where tenant_id = $1", [tenantId]);
      await pool.query("delete from identity.survey_participants where tenant_id = $1", [tenantId]);
      await pool.query("delete from identity.employees where tenant_id = $1", [tenantId]);
      await pool.query("delete from identity.tenant_settings where tenant_id = $1", [tenantId]);
      await pool.query("delete from identity.tenants where id = $1", [tenantId]);
    }
  });

  async function submitAllAnswers(tenantId: string, cycleId: string) {
    const identity = new IdentityRepository(pool);
    const response = new ResponseRepository(pool);
    const session = await response.getRespondentSurveySession(cycleId);
    const questionId = session!.questions[0].id;
    const outbox = await identity.getInviteOutbox(tenantId, cycleId);
    for (const row of outbox.rows) {
      const rawToken = row.respondentPath!.replace("/s/", "");
      await submitWithSeveredRepositories({ db: pool, rawToken, answers: [{ questionId, numberValue: 4 }] });
    }
  }

  it("rolls up exactly one level when a manager's merged subtree clears threshold", async () => {
    const identity = new IdentityRepository(pool);
    const tenant = await identity.createTenant("Rollup One Level E2E", `rollup-one-level-e2e-${randomUUID()}`);
    tenantIds.push(tenant.id);

    const ceo = `ceo-${randomUUID()}@example.com`;
    const vpEng = `vp-eng-${randomUUID()}@example.com`;
    const vpSales = `vp-sales-${randomUUID()}@example.com`;
    await identity.importEmployees(tenant.id, [
      { email: ceo },
      { email: vpEng, managerEmail: ceo },
      { email: vpSales, managerEmail: ceo },
      ...Array.from({ length: 3 }, (_, i) => ({ email: `alpha-${i}-${randomUUID()}@example.com`, team: "alpha", managerEmail: vpEng })),
      ...Array.from({ length: 4 }, (_, i) => ({ email: `beta-${i}-${randomUUID()}@example.com`, team: "beta", managerEmail: vpEng })),
      ...Array.from({ length: 10 }, (_, i) => ({ email: `sales-${i}-${randomUUID()}@example.com`, team: "sales", managerEmail: vpSales })),
    ]);

    const cycle = await createTenantSurveyCycle({ db: pool, tenantId: tenant.id, tenantName: tenant.name, templateSlug: "engagement-check" });
    await submitAllAnswers(tenant.id, cycle.cycleId);

    // alpha alone (3) is below the min_group_size=5 threshold.
    const report = await getManagerRollupReport(pool, tenant.id, cycle.cycleId, 5, "alpha");
    expect(report.protected).toBe(false);
    if (report.protected) throw new Error("unreachable");
    expect(report.n).toBe(7); // alpha(3) + beta(4), merged under VP-Eng
    expect(report.rolledUpTo?.teamsIncluded.sort()).toEqual(["alpha", "beta"]);
  }, 30_000);

  it("keeps climbing when the immediate manager's subtree is still too small", async () => {
    const identity = new IdentityRepository(pool);
    const tenant = await identity.createTenant("Rollup Multi Level E2E", `rollup-multi-level-e2e-${randomUUID()}`);
    tenantIds.push(tenant.id);

    const ceo = `ceo-${randomUUID()}@example.com`;
    const vpEng = `vp-eng-${randomUUID()}@example.com`;
    const vpSales = `vp-sales-${randomUUID()}@example.com`;
    const directorFrontend = `dir-frontend-${randomUUID()}@example.com`;
    const directorBackend = `dir-backend-${randomUUID()}@example.com`;
    await identity.importEmployees(tenant.id, [
      { email: ceo },
      { email: vpEng, managerEmail: ceo },
      { email: vpSales, managerEmail: ceo },
      { email: directorFrontend, managerEmail: vpEng },
      { email: directorBackend, managerEmail: vpEng },
      ...Array.from({ length: 2 }, (_, i) => ({ email: `alpha-${i}-${randomUUID()}@example.com`, team: "alpha", managerEmail: directorFrontend })),
      ...Array.from({ length: 3 }, (_, i) => ({ email: `gamma-${i}-${randomUUID()}@example.com`, team: "gamma", managerEmail: directorBackend })),
      ...Array.from({ length: 10 }, (_, i) => ({ email: `sales-${i}-${randomUUID()}@example.com`, team: "sales", managerEmail: vpSales })),
    ]);

    const cycle = await createTenantSurveyCycle({ db: pool, tenantId: tenant.id, tenantName: tenant.name, templateSlug: "engagement-check" });
    await submitAllAnswers(tenant.id, cycle.cycleId);

    // alpha(2) under director-frontend doesn't clear threshold on its own
    // (director-frontend's own subtree is just alpha=2). Must climb past
    // director-frontend to VP-Eng, where alpha+gamma = 5.
    const report = await getManagerRollupReport(pool, tenant.id, cycle.cycleId, 5, "alpha");
    expect(report.protected).toBe(false);
    if (report.protected) throw new Error("unreachable");
    expect(report.n).toBe(5);
    expect(report.rolledUpTo?.teamsIncluded.sort()).toEqual(["alpha", "gamma"]);
  }, 30_000);

  it("a flat org (no manager_id data) rolls straight to company-wide on the first attempt", async () => {
    const identity = new IdentityRepository(pool);
    const tenant = await identity.createTenant("Rollup Flat Org E2E", `rollup-flat-org-e2e-${randomUUID()}`);
    tenantIds.push(tenant.id);

    // No managerEmail anywhere -- every employee's manager_id stays null.
    await identity.importEmployees(tenant.id, [
      ...Array.from({ length: 2 }, (_, i) => ({ email: `solo-${i}-${randomUUID()}@example.com`, team: "solo" })),
      ...Array.from({ length: 4 }, (_, i) => ({ email: `other-${i}-${randomUUID()}@example.com`, team: "other" })),
    ]);

    const cycle = await createTenantSurveyCycle({ db: pool, tenantId: tenant.id, tenantName: tenant.name, templateSlug: "engagement-check" });
    await submitAllAnswers(tenant.id, cycle.cycleId);

    const report = await getManagerRollupReport(pool, tenant.id, cycle.cycleId, 5, "solo");
    expect(report.protected).toBe(false);
    if (report.protected) throw new Error("unreachable");
    expect(report.n).toBe(6); // solo(2) + other(4) -- the whole cycle
    expect(report.rolledUpTo).toEqual({ label: "the whole company", teamsIncluded: expect.arrayContaining(["solo", "other"]) });
  }, 30_000);

  it("the sibling differencing guard suppresses a merged group that would otherwise leak a smaller sibling's count", async () => {
    const identity = new IdentityRepository(pool);
    const tenant = await identity.createTenant("Rollup Differencing E2E", `rollup-differencing-e2e-${randomUUID()}`);
    tenantIds.push(tenant.id);

    const ceo = `ceo-${randomUUID()}@example.com`;
    const managerA = `manager-a-${randomUUID()}@example.com`; // owns "red" (6) -- individually releasable
    const managerB = `manager-b-${randomUUID()}@example.com`; // owns "blue"+"teal" (2+3=5) -- exactly at threshold
    const managerC = `manager-c-${randomUUID()}@example.com`; // owns "purple" (2) -- the one that must stay hidden
    await identity.importEmployees(tenant.id, [
      { email: ceo },
      { email: managerA, managerEmail: ceo },
      { email: managerB, managerEmail: ceo },
      { email: managerC, managerEmail: ceo },
      ...Array.from({ length: 6 }, (_, i) => ({ email: `red-${i}-${randomUUID()}@example.com`, team: "red", managerEmail: managerA })),
      ...Array.from({ length: 2 }, (_, i) => ({ email: `blue-${i}-${randomUUID()}@example.com`, team: "blue", managerEmail: managerB })),
      ...Array.from({ length: 3 }, (_, i) => ({ email: `teal-${i}-${randomUUID()}@example.com`, team: "teal", managerEmail: managerB })),
      ...Array.from({ length: 2 }, (_, i) => ({ email: `purple-${i}-${randomUUID()}@example.com`, team: "purple", managerEmail: managerC })),
    ]);

    const cycle = await createTenantSurveyCycle({ db: pool, tenantId: tenant.id, tenantName: tenant.name, templateSlug: "engagement-check" });
    await submitAllAnswers(tenant.id, cycle.cycleId);

    // Without the sibling guard, Manager B's merged group (blue+teal=5)
    // would clear the threshold and the rollup would stop there --
    // leaving Manager C's purple(2) as the sole suppressed remainder
    // among CEO's three direct reports, inferable by subtracting A and B
    // from a visible org total. The guard must catch this and force a
    // further climb all the way to the CEO/company level instead.
    const report = await getManagerRollupReport(pool, tenant.id, cycle.cycleId, 5, "blue");
    expect(report.protected).toBe(false);
    if (report.protected) throw new Error("unreachable");
    expect(report.rolledUpTo?.teamsIncluded.sort()).toEqual(["blue", "purple", "red", "teal"]);
    expect(report.n).toBe(13);
  }, 30_000);
});
