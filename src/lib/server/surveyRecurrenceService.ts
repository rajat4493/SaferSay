import type { Pool } from "pg";
import { createTenantSurveyCycle } from "@/lib/server/surveyCycleService";
import { IdentityRepository } from "@/lib/server/repositories/identityRepository";
import { nextRunAtFrom } from "@/lib/server/repositories/responseRepository";
import { sendQueuedInviteDeliveries } from "@/lib/server/resendDelivery";

export type RecurrenceRunResult = {
  recurrenceId: string;
  tenantId: string;
  cycleId?: string;
  invitesSent?: number;
  error?: string;
};

/**
 * Creates a new draft cycle (and, if the recurrence is marked auto_send,
 * sends invites for it) for every due, non-disabled recurrence across
 * every tenant. Runs on the privileged admin pool -- a platform-wide
 * scheduled job iterating every tenant, same reasoning as
 * purgeExpiredCycleDataForAllTenants. One recurrence's failure (e.g. a
 * tenant with zero employees on file) doesn't stop the rest from running.
 */
export async function runDueSurveyRecurrences(pool: Pool): Promise<RecurrenceRunResult[]> {
  const due = await pool.query<{
    id: string;
    tenant_id: string;
    template_slug: string;
    interval: "weekly" | "monthly" | "quarterly";
    auto_send: boolean;
  }>(
    `select id, tenant_id, template_slug, interval, auto_send
     from responses.survey_recurrences
     where disabled_at is null and next_run_at <= now()`,
  );

  const results: RecurrenceRunResult[] = [];
  for (const recurrence of due.rows) {
    results.push(await runOneRecurrence(pool, recurrence));
  }
  return results;
}

async function runOneRecurrence(
  pool: Pool,
  recurrence: { id: string; tenant_id: string; template_slug: string; interval: "weekly" | "monthly" | "quarterly"; auto_send: boolean },
): Promise<RecurrenceRunResult> {
  const identity = new IdentityRepository(pool);

  try {
    const tenant = await identity.findTenantById(recurrence.tenant_id);
    if (!tenant) throw new Error("Tenant not found.");

    const cycle = await createTenantSurveyCycle({
      db: pool,
      tenantId: recurrence.tenant_id,
      tenantName: tenant.name,
      templateSlug: recurrence.template_slug,
    });

    let invitesSent: number | undefined;
    if (recurrence.auto_send) {
      const opened = await identity.openCycleWithSurveyCredit(recurrence.tenant_id, cycle.cycleId);
      if (!opened.opened) {
        throw new Error(opened.reason === "no_credit" ? "No survey credit is available." : "Recurrence could not open this cycle.");
      }
      await identity.syncSurveyCreditBalance(recurrence.tenant_id);
      const prepared = await identity.prepareInviteOutbox(recurrence.tenant_id, cycle.cycleId);
      await identity.markOutboxQueued(recurrence.tenant_id, cycle.cycleId, "invite");
      const deliveries = await identity.getQueuedOutboxDeliveries(recurrence.tenant_id, cycle.cycleId, "invite", prepared || cycle.invitesPrepared || 10000);
      const smtpConfig = await identity.getSmtpConfig(recurrence.tenant_id);
      const delivery = await sendQueuedInviteDeliveries({ tenant, deliveries, smtpConfig });
      for (const id of delivery.sentIds) await identity.markOutboxSent(id);
      for (const id of delivery.failedIds) await identity.markOutboxFailed(id);
      invitesSent = delivery.sent;
    }

    await pool.query(`update responses.survey_recurrences set next_run_at = $2 where id = $1`, [recurrence.id, nextRunAtFrom(new Date(), recurrence.interval)]);

    return { recurrenceId: recurrence.id, tenantId: recurrence.tenant_id, cycleId: cycle.cycleId, invitesSent };
  } catch (error) {
    // Still advance next_run_at even on failure -- a permanently broken
    // recurrence (e.g. zero employees) must not retry every single minute
    // the cron fires; it gets another attempt next cycle, same as any
    // other scheduled job backing off after a failure.
    await pool.query(`update responses.survey_recurrences set next_run_at = $2 where id = $1`, [recurrence.id, nextRunAtFrom(new Date(), recurrence.interval)]);
    return { recurrenceId: recurrence.id, tenantId: recurrence.tenant_id, error: error instanceof Error ? error.message : "Unknown error." };
  }
}
