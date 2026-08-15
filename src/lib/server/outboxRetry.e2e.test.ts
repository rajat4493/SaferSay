import { randomUUID } from "node:crypto";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { Pool } from "pg";
import { createTenantSurveyCycle } from "@/lib/server/surveyCycleService";
import { IdentityRepository } from "@/lib/server/repositories/identityRepository";

const connectionString = process.env.SAFERSAY_TEST_DATABASE_URL;
const describeIfDb = connectionString ? describe : describe.skip;

/**
 * Proves the bug found while diagnosing a real stuck survey: once an
 * outbox row reaches 'failed' (e.g. a misconfigured RESEND_API_KEY at send
 * time), prepareInviteOutbox's `on conflict do nothing` used to leave it
 * stuck forever -- every later "Send invites" click found 0 pending rows
 * and did nothing, with no visible error. This test proves a failed row
 * is reset to 'pending' (and therefore queueable again) the next time
 * prepareInviteOutbox runs, without touching real Resend delivery.
 */
describeIfDb("Postgres invite outbox retry", () => {
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

  it("resets a permanently-failed outbox row so it can be retried, and leaves untouched rows alone", async () => {
    const identity = new IdentityRepository(pool);
    const tenant = await identity.createTenant("SaferSay Outbox Retry E2E", `outbox-retry-e2e-${randomUUID()}`);
    tenantIds.push(tenant.id);

    await identity.importEmployees(
      tenant.id,
      Array.from({ length: 2 }, (_, index) => ({
        email: `outbox-retry-${index + 1}-${randomUUID()}@example.com`,
        name: `Retry ${index + 1}`,
        team: "Pilot",
      })),
    );

    const cycle = await createTenantSurveyCycle({
      db: pool,
      tenantId: tenant.id,
      tenantName: tenant.name,
      templateSlug: "engagement-check",
      cycleName: "Outbox retry pilot",
    });

    // createTenantSurveyCycle already prepared+queued the initial outbox
    // (both rows now 'queued'). Simulate one real-world send attempt: one
    // recipient's delivery fails, the other succeeds.
    const outboxBefore = await identity.getInviteOutbox(tenant.id, cycle.cycleId);
    const [failedRow, sentRow] = outboxBefore.rows;
    await identity.markOutboxFailed(failedRow.id);
    await identity.markOutboxSent(sentRow.id);

    const afterFirstAttempt = await identity.getInviteOutbox(tenant.id, cycle.cycleId);
    expect(afterFirstAttempt.summary.sentInvites).toBe(1);
    expect(afterFirstAttempt.rows.find((r) => r.id === failedRow.id)?.deliveryStatus).toBe("failed");

    // Before the fix, this next call would find 0 pending rows for the
    // already-existing failed participant -- it would never be retried.
    const preparedAgain = await identity.prepareInviteOutbox(tenant.id, cycle.cycleId);
    expect(preparedAgain).toBe(1); // the one previously-failed row, reset

    const afterRetryPrepare = await identity.getInviteOutbox(tenant.id, cycle.cycleId);
    const retriedRow = afterRetryPrepare.rows.find((r) => r.id === failedRow.id);
    expect(retriedRow?.deliveryStatus).toBe("pending");
    // The already-sent row must be completely untouched by the retry.
    expect(afterRetryPrepare.rows.find((r) => r.id === sentRow.id)?.deliveryStatus).toBe("sent");

    // And it's now actually queueable again, same as any fresh invite.
    const queued = await identity.markOutboxQueued(tenant.id, cycle.cycleId, "invite");
    expect(queued).toBe(1);
    const deliveries = await identity.getQueuedOutboxDeliveries(tenant.id, cycle.cycleId, "invite");
    expect(deliveries.map((d) => d.outboxId)).toContain(failedRow.id);
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
