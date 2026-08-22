import { randomUUID } from "node:crypto";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { Pool } from "pg";
import { IdentityRepository } from "@/lib/server/repositories/identityRepository";
import { ResponseRepository } from "@/lib/server/repositories/responseRepository";

// Exercises responses.report_option_tallies() (0030) against real Postgres --
// the fake-Queryable tests in optionReport.test.ts cover the repository's
// own logic, but the per-option suppression math actually happens inside
// this SQL function, so it needs a real database to catch a bug the SQL
// itself might have that a fake could never surface.
const connectionString = process.env.SAFERSAY_TEST_DATABASE_URL;
const describeIfDb = connectionString ? describe : describe.skip;

describeIfDb("Postgres live multiple_choice/ranking suppression", () => {
  let pool: Pool;
  const tenantIds: string[] = [];
  const templateIds: string[] = [];

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
    for (const templateId of templateIds.splice(0)) {
      await pool.query("delete from responses.template_questions where template_id = $1", [templateId]);
      await pool.query("delete from responses.survey_templates where id = $1", [templateId]);
    }
  });

  it("suppresses a rare multiple_choice option independently of the question's own respondent count", async () => {
    const identity = new IdentityRepository(pool);
    const tenant = await identity.createTenant("Question Types E2E", `question-types-e2e-${randomUUID()}`);
    tenantIds.push(tenant.id);

    const templateId = randomUUID();
    templateIds.push(templateId);
    await pool.query(
      `insert into responses.survey_templates (id, slug, name, description, category, estimated_minutes)
       values ($1, $2, 'MC test template', 'test', 'test', 3)`,
      [templateId, `mc-test-${randomUUID()}`],
    );

    const questionId = randomUUID();
    await pool.query(
      `insert into responses.template_questions (id, template_id, position, question_text, question_type, options)
       values ($1, $2, 1, 'Which benefit matters most?', 'multiple_choice', $3::jsonb)`,
      [
        questionId,
        templateId,
        JSON.stringify([
          { key: "healthcare", label: "Healthcare" },
          { key: "remote_stipend", label: "Remote stipend" },
          { key: "pet_insurance", label: "Pet insurance" },
        ]),
      ],
    );

    const cycleId = randomUUID();
    await pool.query(
      `insert into responses.survey_cycles (id, tenant_id, template_id, name, status, payment_status)
       values ($1, $2, $3, 'MC test cycle', 'open', 'paid')`,
      [cycleId, tenant.id, templateId],
    );

    const response = new ResponseRepository(pool);

    // 7 respondents total, called with minGroupSize=3 below: healthcare
    // (4) clears it, remote_stipend (2) and pet_insurance (1) don't --
    // each option suppressed independently of the other options' counts
    // and of the question's own total respondent count.
    const picks = ["healthcare", "healthcare", "healthcare", "healthcare", "remote_stipend", "remote_stipend", "pet_insurance"];
    for (const pick of picks) {
      await response.submitAnswers({
        tenantId: tenant.id,
        cycleId,
        spentTokenHash: `hash-${randomUUID()}`,
        answers: [{ questionId, optionKeys: [pick] }],
      });
    }

    const report = await response.getProtectedOptionReport(tenant.id, cycleId, 3);

    expect(report.protected).toBe(false);
    if (report.protected) throw new Error("unreachable");
    expect(report.n).toBe(7);
    const options = report.rows[0].options;
    // healthcare (n=4) clears min_n=3; remote_stipend (n=2) and
    // pet_insurance (n=1) don't -- each suppressed independently of the
    // question's own total respondent count (7), which is the exact
    // property a fake DB test can't verify since the math lives in SQL.
    expect(options.map((o) => o.optionKey).sort()).toEqual(["healthcare"]);
    expect(options[0].n).toBe(4);
  }, 30_000);

  it("stores ranking order and reports avg_rank for a releasable option", async () => {
    const identity = new IdentityRepository(pool);
    const tenant = await identity.createTenant("Ranking E2E", `ranking-e2e-${randomUUID()}`);
    tenantIds.push(tenant.id);

    const templateId = randomUUID();
    templateIds.push(templateId);
    await pool.query(
      `insert into responses.survey_templates (id, slug, name, description, category, estimated_minutes)
       values ($1, $2, 'Ranking test template', 'test', 'test', 3)`,
      [templateId, `ranking-test-${randomUUID()}`],
    );

    const questionId = randomUUID();
    await pool.query(
      `insert into responses.template_questions (id, template_id, position, question_text, question_type, options)
       values ($1, $2, 1, 'Rank these priorities', 'ranking', $3::jsonb)`,
      [questionId, templateId, JSON.stringify([{ key: "pay", label: "Pay" }, { key: "growth", label: "Growth" }])],
    );

    const cycleId = randomUUID();
    await pool.query(
      `insert into responses.survey_cycles (id, tenant_id, template_id, name, status, payment_status)
       values ($1, $2, $3, 'Ranking test cycle', 'open', 'paid')`,
      [cycleId, tenant.id, templateId],
    );

    const response = new ResponseRepository(pool);
    // 3 respondents rank pay first (rank 1), growth second (rank 2).
    for (let i = 0; i < 3; i += 1) {
      await response.submitAnswers({
        tenantId: tenant.id,
        cycleId,
        spentTokenHash: `hash-${randomUUID()}`,
        answers: [{ questionId, optionKeys: ["pay", "growth"], ranked: true }],
      });
    }

    const report = await response.getProtectedOptionReport(tenant.id, cycleId, 3);
    expect(report.protected).toBe(false);
    if (report.protected) throw new Error("unreachable");
    const pay = report.rows[0].options.find((o) => o.optionKey === "pay");
    expect(pay?.avgRank).toBe(1);
  }, 30_000);
});

async function cleanupTenant(pool: Pool, tenantId: string) {
  await pool.query(
    "delete from responses.answer_options where answer_id in (select id from responses.answers where submission_id in (select id from responses.submissions where tenant_id = $1))",
    [tenantId],
  );
  await pool.query("delete from responses.answers where submission_id in (select id from responses.submissions where tenant_id = $1)", [tenantId]);
  await pool.query("delete from responses.submissions where tenant_id = $1", [tenantId]);
  await pool.query("delete from responses.survey_cycles where tenant_id = $1", [tenantId]);
  await pool.query("delete from identity.tenant_settings where tenant_id = $1", [tenantId]);
  await pool.query("delete from identity.tenants where id = $1", [tenantId]);
}
