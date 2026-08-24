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
 * Proves the two new SQL aggregation functions this reporting port added
 * (responses.report_enps_buckets, 0042; responses.report_open_text_answers_by_department, 0043)
 * work against real Postgres, not just the fake-Queryable unit tests.
 */
describeIfDb("Postgres eNPS scoring + department-scoped comments", () => {
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

  it("computes real promoter/passive/detractor buckets and suppresses a below-threshold bucket", async () => {
    const identity = new IdentityRepository(pool);
    const tenant = await identity.createTenant("eNPS E2E", `enps-e2e-${randomUUID()}`);
    tenantIds.push(tenant.id);

    // 6 promoters (9-10), 5 passives (7-8), 2 detractors (0-6, below min_n=5).
    const roster = [
      ...Array.from({ length: 6 }, (_, i) => ({ email: `promoter-${i}-${randomUUID()}@example.com`, score: 9 + (i % 2) })),
      ...Array.from({ length: 5 }, (_, i) => ({ email: `passive-${i}-${randomUUID()}@example.com`, score: 7 + (i % 2) })),
      ...Array.from({ length: 2 }, (_, i) => ({ email: `detractor-${i}-${randomUUID()}@example.com`, score: 3 })),
    ];
    await identity.importEmployees(tenant.id, roster.map((r) => ({ email: r.email })));

    const cycle = await createTenantSurveyCycle({
      db: pool,
      tenantId: tenant.id,
      tenantName: tenant.name,
      templateSlug: "enps-pulse",
      cycleName: "eNPS E2E pilot",
    });

    const response = new ResponseRepository(pool);
    const session = await response.getRespondentSurveySession(cycle.cycleId);
    const enpsQuestionId = session!.questions.find((q) => q.type === "enps_0_10")!.id;

    expect(await response.openCycle(tenant.id, cycle.cycleId)).toBe(true);

    const outbox = await identity.getInviteOutbox(tenant.id, cycle.cycleId);
    const rawTokensByEmail = new Map(outbox.rows.map((row) => [row.email, row.respondentPath!.replace("/s/", "")]));
    for (const r of roster) {
      const rawToken = rawTokensByEmail.get(r.email)!;
      await submitWithSeveredRepositories({ db: pool, rawToken, answers: [{ questionId: enpsQuestionId, numberValue: r.score }] });
    }

    const enpsReport = await response.getProtectedEnpsReport(tenant.id, cycle.cycleId, 5);
    expect(enpsReport.protected).toBe(false);
    if (enpsReport.protected) throw new Error("unreachable");
    // Detractor bucket (n=2) is below min_n=5 -- the whole question must be
    // dropped, not partially revealed (see ProtectedEnpsReport's doc comment).
    expect(enpsReport.rows.find((r) => r.questionId === enpsQuestionId)).toBeUndefined();
  }, 30_000);

  it("computes a real eNPS score when all three buckets clear threshold", async () => {
    const identity = new IdentityRepository(pool);
    const tenant = await identity.createTenant("eNPS Score E2E", `enps-score-e2e-${randomUUID()}`);
    tenantIds.push(tenant.id);

    const roster = [
      ...Array.from({ length: 10 }, (_, i) => ({ email: `promoter-${i}-${randomUUID()}@example.com`, score: 10 })),
      ...Array.from({ length: 5 }, (_, i) => ({ email: `passive-${i}-${randomUUID()}@example.com`, score: 8 })),
      ...Array.from({ length: 5 }, (_, i) => ({ email: `detractor-${i}-${randomUUID()}@example.com`, score: 0 })),
    ];
    await identity.importEmployees(tenant.id, roster.map((r) => ({ email: r.email })));

    const cycle = await createTenantSurveyCycle({ db: pool, tenantId: tenant.id, tenantName: tenant.name, templateSlug: "enps-pulse", cycleName: "eNPS score E2E pilot" });
    const response = new ResponseRepository(pool);
    const session = await response.getRespondentSurveySession(cycle.cycleId);
    const enpsQuestionId = session!.questions.find((q) => q.type === "enps_0_10")!.id;
    expect(await response.openCycle(tenant.id, cycle.cycleId)).toBe(true);

    const outbox = await identity.getInviteOutbox(tenant.id, cycle.cycleId);
    const rawTokensByEmail = new Map(outbox.rows.map((row) => [row.email, row.respondentPath!.replace("/s/", "")]));
    for (const r of roster) {
      const rawToken = rawTokensByEmail.get(r.email)!;
      await submitWithSeveredRepositories({ db: pool, rawToken, answers: [{ questionId: enpsQuestionId, numberValue: r.score }] });
    }

    const enpsReport = await response.getProtectedEnpsReport(tenant.id, cycle.cycleId, 5);
    expect(enpsReport.protected).toBe(false);
    if (enpsReport.protected) throw new Error("unreachable");
    const row = enpsReport.rows.find((r) => r.questionId === enpsQuestionId);
    expect(row).toMatchObject({ n: 20, promoterPct: 50, passivePct: 25, detractorPct: 25, score: 25 });
  }, 30_000);

  it("applies department scope + complementary suppression to real comments", async () => {
    const identity = new IdentityRepository(pool);
    const tenant = await identity.createTenant("Comments E2E", `comments-e2e-${randomUUID()}`);
    tenantIds.push(tenant.id);

    // Text threshold is minGroupSize+3 = 8. Engineering (9) clears it,
    // Sales (2) doesn't -- and with exactly one department below
    // threshold, Engineering (the only other department) must be bundled
    // into suppression too.
    const roster = [
      ...Array.from({ length: 9 }, (_, i) => ({ email: `eng-${i}-${randomUUID()}@example.com`, team: "Engineering" })),
      ...Array.from({ length: 2 }, (_, i) => ({ email: `sales-${i}-${randomUUID()}@example.com`, team: "Sales" })),
    ];
    await identity.importEmployees(tenant.id, roster.map((r) => ({ email: r.email, team: r.team })));

    const cycle = await createTenantSurveyCycle({ db: pool, tenantId: tenant.id, tenantName: tenant.name, templateSlug: "enps-pulse", cycleName: "Comments E2E pilot" });
    const response = new ResponseRepository(pool);
    const session = await response.getRespondentSurveySession(cycle.cycleId);
    const textQuestionId = session!.questions.find((q) => q.type === "open_text")!.id;
    expect(await response.openCycle(tenant.id, cycle.cycleId)).toBe(true);

    const outbox = await identity.getInviteOutbox(tenant.id, cycle.cycleId);
    const rawTokens = outbox.rows.map((row) => row.respondentPath!.replace("/s/", ""));
    for (const rawToken of rawTokens) {
      await submitWithSeveredRepositories({ db: pool, rawToken, answers: [{ questionId: textQuestionId, textValue: "Real comment text" }] });
    }

    // Sales is naturally below the text threshold.
    const salesComments = await response.getProtectedOpenTextReport(tenant.id, cycle.cycleId, 5, "sales");
    expect(salesComments).toEqual({ protected: true, n: 0, rows: [] });

    // Engineering clears its own text threshold (9 >= 8) but must still be
    // suppressed to protect Sales from a differencing attack.
    const engineeringComments = await response.getProtectedOpenTextReport(tenant.id, cycle.cycleId, 5, "engineering");
    expect(engineeringComments).toEqual({ protected: true, n: 0, rows: [] });

    // Org-wide comments (18 >= 8) are unaffected and still show real content.
    const orgComments = await response.getProtectedOpenTextReport(tenant.id, cycle.cycleId, 5);
    expect(orgComments.protected).toBe(false);
    if (orgComments.protected) throw new Error("unreachable");
    expect(orgComments.rows[0].answers.every((a) => a === "Real comment text")).toBe(true);
  }, 30_000);
});

async function cleanupTenant(pool: Pool, tenantId: string) {
  await pool.query("delete from identity.invite_outbox where participant_id in (select id from identity.survey_participants where tenant_id = $1)", [tenantId]);
  await pool.query("delete from identity.invite_outbox where tenant_id = $1", [tenantId]);
  await pool.query("delete from responses.answer_options where answer_id in (select id from responses.answers where submission_id in (select id from responses.submissions where tenant_id = $1))", [tenantId]);
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
