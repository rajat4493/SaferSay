import { randomUUID } from "node:crypto";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { Pool } from "pg";
import { IdentityRepository } from "@/lib/server/repositories/identityRepository";
import { ResponseRepository } from "@/lib/server/repositories/responseRepository";
import { getRespondentSurveySession } from "@/lib/server/respondentSessionService";
import { submitWithSeveredRepositories } from "@/lib/server/confidentialSubmissionService";

// Exercises Option-B structural branching end to end against real Postgres:
// team is snapshotted at invite time (identity.survey_participants.team),
// a show_if-gated question is filtered out of the session for the wrong
// team, and the branch population's report suppression works correctly
// with no code changes to the reporting engine -- see plan history:
// "Design thinking: survey branching vs. the k-anonymity engine" for why
// that's true for structural-only branching but would NOT be for
// opinion-based branching.
const connectionString = process.env.SAFERSAY_TEST_DATABASE_URL;
const describeIfDb = connectionString ? describe : describe.skip;

describeIfDb("Postgres live structural branching (Option B)", () => {
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
      await pool.query(
        "delete from identity.invite_outbox where participant_id in (select id from identity.survey_participants where tenant_id = $1)",
        [tenantId],
      );
      await pool.query("delete from responses.answers where submission_id in (select id from responses.submissions where tenant_id = $1)", [tenantId]);
      await pool.query("delete from responses.submissions where tenant_id = $1", [tenantId]);
      await pool.query("delete from identity.survey_participants where tenant_id = $1", [tenantId]);
      await pool.query("delete from responses.survey_cycles where tenant_id = $1", [tenantId]);
      await pool.query("delete from identity.employees where tenant_id = $1", [tenantId]);
      await pool.query("delete from identity.tenant_settings where tenant_id = $1", [tenantId]);
      await pool.query("delete from identity.tenants where id = $1", [tenantId]);
    }
    for (const templateId of templateIds.splice(0)) {
      await pool.query("delete from responses.template_questions where template_id = $1", [templateId]);
      await pool.query("delete from responses.survey_templates where id = $1", [templateId]);
    }
  });

  it("hides a team-gated question from the wrong team's session, and its small population is suppressed like any other small group", async () => {
    const identity = new IdentityRepository(pool);
    const tenant = await identity.createTenant("Branching E2E", `branching-e2e-${randomUUID()}`);
    tenantIds.push(tenant.id);

    // 6 Support employees (clears whole-cycle min_group_size=5), 2 Engineering.
    await identity.importEmployees(
      tenant.id,
      [
        ...Array.from({ length: 6 }, (_, i) => ({ email: `support-${i}-${randomUUID()}@example.com`, team: "Support" })),
        ...Array.from({ length: 2 }, (_, i) => ({ email: `eng-${i}-${randomUUID()}@example.com`, team: "Engineering" })),
      ],
    );

    const templateId = randomUUID();
    templateIds.push(templateId);
    await pool.query(
      `insert into responses.survey_templates (id, slug, name, description, category, estimated_minutes)
       values ($1, $2, 'Branching test template', 'test', 'test', 3)`,
      [templateId, `branching-test-${randomUUID()}`],
    );

    const commonQuestionId = randomUUID();
    await pool.query(
      `insert into responses.template_questions (id, template_id, position, question_text, question_type)
       values ($1, $2, 1, 'How supported do you feel?', 'likert_5')`,
      [commonQuestionId, templateId],
    );

    const gatedQuestionId = randomUUID();
    await pool.query(
      `insert into responses.template_questions (id, template_id, position, question_text, question_type, show_if)
       values ($1, $2, 2, 'What would help Engineering specifically?', 'open_text', $3::jsonb)`,
      // "engineering" (lowercase), matching how normalizeTeamLabel stores
      // identity.employees.team -- the app's own PATCH validation applies
      // this same normalization to whatever an admin types (see
      // /api/cycles/[id]/questions/route.ts's parseShowIf).
      [gatedQuestionId, templateId, JSON.stringify({ attribute: "team", op: "eq", value: "engineering" })],
    );

    const cycleId = randomUUID();
    await pool.query(
      `insert into responses.survey_cycles (id, tenant_id, template_id, name, status, payment_status)
       values ($1, $2, $3, 'Branching test cycle', 'open', 'paid')`,
      [cycleId, tenant.id, templateId],
    );

    const issued = await identity.issueTokens(tenant.id, cycleId);
    const supportToken = issued.find((t) => t.email.startsWith("support-"))!;
    const engToken = issued.find((t) => t.email.startsWith("eng-"))!;

    const supportSession = await getRespondentSurveySession({ db: pool, rawToken: supportToken.rawToken });
    expect(supportSession?.questions.map((q) => q.id)).toEqual([commonQuestionId]); // gated question hidden

    const engSession = await getRespondentSurveySession({ db: pool, rawToken: engToken.rawToken });
    expect(engSession?.questions.map((q) => q.id).sort()).toEqual([commonQuestionId, gatedQuestionId].sort());

    // Everyone answers the common question; only the 2 Engineering
    // employees answer the gated one (their session never showed it to
    // anyone else, so nobody else even could).
    for (const token of issued) {
      const answers: Array<{ questionId: string; numberValue?: number; textValue?: string }> = [{ questionId: commonQuestionId, numberValue: 4 }];
      if (token.email.startsWith("eng-")) answers.push({ questionId: gatedQuestionId, textValue: "More headcount" });
      await submitWithSeveredRepositories({ db: pool, rawToken: token.rawToken, answers });
    }

    const response = new ResponseRepository(pool);
    const textReport = await response.getProtectedOpenTextReport(tenant.id, cycleId, 5);
    // The gated question's real population is 2 (< minGroupSize+3=8) --
    // suppressed by the EXISTING open-text threshold check, no branching-
    // specific code needed, because responses.answers only ever contains
    // rows for people who were actually shown the question.
    expect(textReport.rows.find((r) => r.questionId === gatedQuestionId)).toBeUndefined();

    const scoreReport = await response.getProtectedReportForTenant(tenant.id, cycleId);
    // The common question (n=8, everyone) clears its own threshold fine.
    expect(scoreReport.protected).toBe(false);
    if (scoreReport.protected) throw new Error("unreachable");
    expect(scoreReport.rows.find((r) => r.questionId === commonQuestionId)?.n).toBe(8);
  }, 30_000);
});
