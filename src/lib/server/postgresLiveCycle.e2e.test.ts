import { randomUUID } from "node:crypto";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { Pool } from "pg";
import { createTenantSurveyCycle } from "@/lib/server/surveyCycleService";
import { submitWithSeveredRepositories } from "@/lib/server/confidentialSubmissionService";
import { IdentityRepository } from "@/lib/server/repositories/identityRepository";
import { ResponseRepository } from "@/lib/server/repositories/responseRepository";

const connectionString = process.env.SAFERSAY_TEST_DATABASE_URL;
const describeIfDb = connectionString ? describe : describe.skip;

describeIfDb("Postgres live survey cycle", () => {
  let pool: Pool;
  const tenantIds: string[] = [];

  beforeAll(() => {
    pool = new Pool({
      connectionString,
      ssl: { rejectUnauthorized: false },
    });
  });

  afterAll(async () => {
    await pool.end();
  });

  afterEach(async () => {
    for (const tenantId of tenantIds.splice(0)) {
      await cleanupTenant(pool, tenantId);
    }
  });

  it("creates, invites, submits, unlocks at k=5, and rejects spent tokens against real Postgres", async () => {
    const identity = new IdentityRepository(pool);
    const tenant = await identity.createTenant("SaferSay DB E2E", `safersay-db-e2e-${randomUUID()}`);
    tenantIds.push(tenant.id);

    await identity.importEmployees(
      tenant.id,
      Array.from({ length: 6 }, (_, index) => ({
        email: `db-e2e-${index + 1}-${randomUUID()}@example.com`,
        name: `DB E2E ${index + 1}`,
        team: "Pilot",
        location: "Remote",
      })),
    );

    const cycle = await createTenantSurveyCycle({
      db: pool,
      tenantId: tenant.id,
      tenantName: tenant.name,
      templateSlug: "engagement-check",
      cycleName: "DB-backed pilot",
    });

    expect(cycle.tokensIssued).toBe(6);
    expect(cycle.invitesPrepared).toBe(6);

    const outbox = await identity.getInviteOutbox(tenant.id, cycle.cycleId);
    expect(outbox.summary.pendingInvites).toBe(6);
    expect(outbox.rows.every((row) => row.respondentPath?.startsWith("/s/"))).toBe(true);

    const queued = await identity.markOutboxQueued(tenant.id, cycle.cycleId, "invite");
    expect(queued).toBe(6);

    const response = new ResponseRepository(pool);
    const session = await response.getRespondentSurveySession(cycle.cycleId);
    expect(session?.questions.length).toBeGreaterThan(0);
    const questionId = session!.questions[0].id;
    const rawTokens = outbox.rows.map((row) => row.respondentPath!.replace("/s/", ""));

    for (const rawToken of rawTokens.slice(0, 4)) {
      await submitWithSeveredRepositories({
        db: pool,
        rawToken,
        answers: [{ questionId, numberValue: 4 }],
      });
    }

    const belowThreshold = await response.getProtectedReportForTenant(tenant.id, cycle.cycleId);
    expect(belowThreshold).toEqual({ protected: true, n: 4, rows: [] });

    await submitWithSeveredRepositories({
      db: pool,
      rawToken: rawTokens[4],
      answers: [{ questionId, numberValue: 2 }],
    });

    const unlocked = await response.getProtectedReportForTenant(tenant.id, cycle.cycleId);
    expect(unlocked.protected).toBe(false);
    expect(unlocked.n).toBe(5);
    expect(unlocked.rows[0]).toMatchObject({ questionId, n: 5, average: 3.6 });

    await expect(
      submitWithSeveredRepositories({
        db: pool,
        rawToken: rawTokens[4],
        answers: [{ questionId, numberValue: 5 }],
      }),
    ).rejects.toThrow("Token is invalid or already spent.");
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
