import { randomUUID } from "node:crypto";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { Pool } from "pg";
import { createTenantSurveyCycle } from "@/lib/server/surveyCycleService";
import { IdentityRepository } from "@/lib/server/repositories/identityRepository";
import { ResponseRepository } from "@/lib/server/repositories/responseRepository";

const connectionString = process.env.SAFERSAY_TEST_DATABASE_URL;
const describeIfDb = connectionString ? describe : describe.skip;

describeIfDb("Survey customization (cycle-scoped questions)", () => {
  let pool: Pool;
  const tenantIds: string[] = [];

  beforeAll(() => {
    pool = new Pool({ connectionString, ssl: { rejectUnauthorized: false } });
  });

  afterEach(async () => {
    for (const tenantId of tenantIds.splice(0)) {
      await cleanupTenant(pool, tenantId);
    }
  });

  it("uses a customized, filtered, reordered question set for the respondent session", async () => {
    const identity = new IdentityRepository(pool);
    const tenant = await identity.createTenant("Customization E2E", `customization-e2e-${randomUUID()}`);
    tenantIds.push(tenant.id);
    await identity.importEmployees(tenant.id, [{ email: `custom-${randomUUID()}@example.com`, name: "Custom Employee" }]);

    const cycle = await createTenantSurveyCycle({
      db: pool,
      tenantId: tenant.id,
      tenantName: tenant.name,
      templateSlug: "engagement-check",
      cycleName: "Customized cycle",
      questions: [
        { text: "Custom question two (edited wording)", type: "likert_5", construct: "Resources" },
        { text: "Custom question one", type: "likert_5", construct: "Role clarity" },
      ],
    });

    const response = new ResponseRepository(pool);
    const session = await response.getRespondentSurveySession(cycle.cycleId);

    expect(session?.questions.map((q) => q.text)).toEqual(["Custom question two (edited wording)", "Custom question one"]);
    expect(session?.questions).toHaveLength(2);
  }, 30_000);

  it("does not mutate the shared base template used by an unmodified cycle in another tenant", async () => {
    const identity = new IdentityRepository(pool);

    const customTenant = await identity.createTenant("Customization Isolation A", `custom-isolation-a-${randomUUID()}`);
    tenantIds.push(customTenant.id);
    await identity.importEmployees(customTenant.id, [{ email: `iso-a-${randomUUID()}@example.com` }]);
    await createTenantSurveyCycle({
      db: pool,
      tenantId: customTenant.id,
      tenantName: customTenant.name,
      templateSlug: "engagement-check",
      questions: [{ text: "Only this one question", type: "likert_5", construct: "Role clarity" }],
    });

    const plainTenant = await identity.createTenant("Customization Isolation B", `custom-isolation-b-${randomUUID()}`);
    tenantIds.push(plainTenant.id);
    await identity.importEmployees(plainTenant.id, [{ email: `iso-b-${randomUUID()}@example.com` }]);
    const plainCycle = await createTenantSurveyCycle({
      db: pool,
      tenantId: plainTenant.id,
      tenantName: plainTenant.name,
      templateSlug: "engagement-check",
    });

    const response = new ResponseRepository(pool);
    const plainSession = await response.getRespondentSurveySession(plainCycle.cycleId);

    expect(plainSession?.questions.length).toBeGreaterThan(1);
    expect(plainSession?.questions.some((q) => q.text === "Only this one question")).toBe(false);
  }, 30_000);
});

async function cleanupTenant(pool: Pool, tenantId: string) {
  await pool.query(
    "delete from identity.invite_outbox where participant_id in (select id from identity.survey_participants where tenant_id = $1)",
    [tenantId],
  );
  await pool.query("delete from identity.invite_outbox where tenant_id = $1", [tenantId]);
  await pool.query(
    "delete from responses.answers where submission_id in (select id from responses.submissions where tenant_id = $1)",
    [tenantId],
  );
  await pool.query("delete from responses.submissions where tenant_id = $1", [tenantId]);
  const cycles = await pool.query(
    `select c.template_id
     from responses.survey_cycles c
     join responses.survey_templates t on t.id = c.template_id
     where c.tenant_id = $1
       -- only cycle-scoped templates (slug: "<base-slug>-<uuid>"), never the shared base template
       and t.slug ~ '-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'`,
    [tenantId],
  );
  await pool.query("delete from responses.survey_cycles where tenant_id = $1", [tenantId]);
  for (const row of cycles.rows) {
    await pool.query("delete from responses.template_questions where template_id = $1", [row.template_id]);
    await pool.query("delete from responses.survey_templates where id = $1", [row.template_id]);
  }
  await pool.query("delete from identity.onboarding_events where tenant_id = $1", [tenantId]);
  await pool.query("delete from identity.survey_participants where tenant_id = $1", [tenantId]);
  await pool.query("delete from identity.employees where tenant_id = $1", [tenantId]);
  await pool.query("delete from identity.users where tenant_id = $1", [tenantId]);
  await pool.query("delete from identity.tenant_settings where tenant_id = $1", [tenantId]);
  await pool.query("delete from identity.tenants where id = $1", [tenantId]);
}
