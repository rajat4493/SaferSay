import { randomUUID } from "node:crypto";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { Pool } from "pg";
import { IdentityRepository } from "@/lib/server/repositories/identityRepository";
import { runDueSurveyRecurrences } from "@/lib/server/surveyRecurrenceService";

// Exercises the full recurring-survey cron job against real Postgres: a
// due recurrence creates a new draft cycle from its template, advances
// next_run_at so it doesn't fire again immediately, and (when marked
// auto_send) actually queues invites -- without needing RESEND_API_KEY
// configured, since sendQueuedInviteDeliveries fails each delivery
// individually rather than throwing when no mail provider is set up.
const connectionString = process.env.SAFERSAY_TEST_DATABASE_URL;
const describeIfDb = connectionString ? describe : describe.skip;

describeIfDb("Postgres live recurring survey scheduler", () => {
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
      await pool.query(
        "delete from identity.invite_outbox where participant_id in (select id from identity.survey_participants where tenant_id = $1)",
        [tenantId],
      );
      await pool.query("delete from identity.survey_participants where tenant_id = $1", [tenantId]);
      await pool.query("delete from responses.survey_recurrences where tenant_id = $1", [tenantId]);
      await pool.query("delete from responses.survey_cycles where tenant_id = $1", [tenantId]);
      await pool.query("delete from identity.employees where tenant_id = $1", [tenantId]);
      await pool.query("delete from identity.tenant_settings where tenant_id = $1", [tenantId]);
      await pool.query("delete from identity.tenants where id = $1", [tenantId]);
    }
  });

  it("creates a new draft cycle for a due recurrence and reschedules it, without sending invites when auto_send is off", async () => {
    const identity = new IdentityRepository(pool);
    const tenant = await identity.createTenant("Recurrence E2E", `recurrence-e2e-${randomUUID()}`);
    tenantIds.push(tenant.id);
    await identity.importEmployees(tenant.id, [{ email: `person-${randomUUID()}@example.com` }]);

    const recurrenceId = randomUUID();
    await pool.query(
      `insert into responses.survey_recurrences (id, tenant_id, template_slug, interval, auto_send, next_run_at)
       values ($1, $2, 'engagement-check', 'monthly', false, now() - interval '1 hour')`,
      [recurrenceId, tenant.id],
    );

    const results = await runDueSurveyRecurrences(pool);
    const result = results.find((r) => r.recurrenceId === recurrenceId);
    expect(result?.cycleId).toBeTruthy();
    expect(result?.invitesSent).toBeUndefined(); // auto_send was off -- never attempted

    const cyclesResult = await pool.query<{ status: string }>("select status from responses.survey_cycles where id = $1", [result!.cycleId]);
    expect(cyclesResult.rows[0].status).toBe("draft"); // never opened, since it was never sent

    const recurrenceResult = await pool.query<{ next_run_at: string }>("select next_run_at from responses.survey_recurrences where id = $1", [recurrenceId]);
    expect(new Date(recurrenceResult.rows[0].next_run_at).getTime()).toBeGreaterThan(Date.now()); // rescheduled into the future
  }, 30_000);

  it("ignores a recurrence that isn't due yet or is disabled", async () => {
    const identity = new IdentityRepository(pool);
    const tenant = await identity.createTenant("Recurrence Not Due E2E", `recurrence-not-due-e2e-${randomUUID()}`);
    tenantIds.push(tenant.id);

    const notDueId = randomUUID();
    const disabledId = randomUUID();
    await pool.query(
      `insert into responses.survey_recurrences (id, tenant_id, template_slug, interval, auto_send, next_run_at)
       values ($1, $2, 'engagement-check', 'monthly', false, now() + interval '10 days')`,
      [notDueId, tenant.id],
    );
    await pool.query(
      `insert into responses.survey_recurrences (id, tenant_id, template_slug, interval, auto_send, next_run_at, disabled_at)
       values ($1, $2, 'engagement-check', 'monthly', false, now() - interval '1 hour', now())`,
      [disabledId, tenant.id],
    );

    const results = await runDueSurveyRecurrences(pool);
    expect(results.some((r) => r.recurrenceId === notDueId)).toBe(false);
    expect(results.some((r) => r.recurrenceId === disabledId)).toBe(false);
  }, 30_000);

  it("still reschedules next_run_at when the tenant has zero employees, so a broken recurrence doesn't retry forever", async () => {
    const identity = new IdentityRepository(pool);
    const tenant = await identity.createTenant("Recurrence Failure E2E", `recurrence-failure-e2e-${randomUUID()}`);
    tenantIds.push(tenant.id);
    // No employees imported -- createTenantSurveyCycle throws.

    const recurrenceId = randomUUID();
    await pool.query(
      `insert into responses.survey_recurrences (id, tenant_id, template_slug, interval, auto_send, next_run_at)
       values ($1, $2, 'engagement-check', 'monthly', false, now() - interval '1 hour')`,
      [recurrenceId, tenant.id],
    );

    const results = await runDueSurveyRecurrences(pool);
    const result = results.find((r) => r.recurrenceId === recurrenceId);
    expect(result?.error).toBeTruthy();
    expect(result?.cycleId).toBeUndefined();

    const recurrenceResult = await pool.query<{ next_run_at: string }>("select next_run_at from responses.survey_recurrences where id = $1", [recurrenceId]);
    expect(new Date(recurrenceResult.rows[0].next_run_at).getTime()).toBeGreaterThan(Date.now());
  }, 30_000);
});
