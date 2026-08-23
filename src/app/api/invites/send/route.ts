import { NextResponse, type NextRequest } from "next/server";
import { getSessionContext } from "@/lib/server/authSession";
import { withTenantScopedDb } from "@/lib/server/db/tenantPool";
import { IdentityRepository } from "@/lib/server/repositories/identityRepository";
import { sendQueuedInviteDeliveries } from "@/lib/server/resendDelivery";
import { logInvitesSent, logRemindersSent } from "@/lib/server/auditLog";
import { canRunSurvey } from "@/lib/permissions";

/**
 * The Send tab's one-button action: prepare -> queue -> send-now in a
 * single call, instead of the admin chaining /api/invites/outbox and
 * /api/invites/queue themselves (two separate round trips left a window
 * where a second click, or the results page's own reminder button, could
 * race the first request -- see docs/COHERENCE_PLAN.md Gap 2).
 */
export async function POST(request: NextRequest) {
  const session = await getSessionContext();
  if (!session) {
    return NextResponse.json({ ok: false, error: "Unauthorized invite send access." }, { status: 401 });
  }
  if (!canRunSurvey(session.role)) {
    return NextResponse.json({ ok: false, error: "You don't have permission to send invites." }, { status: 403 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    cycleId?: string;
    deliveryType?: "invite" | "reminder";
  };
  const deliveryType = body.deliveryType ?? "invite";
  const { tenant, userId } = session;

  // A thrown exception anywhere in here used to produce a non-JSON 500 --
  // the client could only report a generic "Request failed.", with no way
  // to tell what actually went wrong. Most likely real-world source: the
  // Resend SDK can throw (not just return { error }) for a rejected
  // recipient, which is now also caught in sendQueuedInviteDeliveries
  // itself, but this is a second line of defense for anything else.
  let result;
  try {
    result = await withTenantScopedDb(tenant.id, async (db) => {
      const repo = new IdentityRepository(db);
      const cycleId = body.cycleId ?? (await repo.getLatestCycleIdForTenant(tenant.id));
      if (!cycleId) return null;

      const prepared =
        deliveryType === "invite" ? await repo.prepareInviteOutbox(tenant.id, cycleId) : await repo.prepareReminderOutbox(tenant.id, cycleId);
      const queued = await repo.markOutboxQueued(tenant.id, cycleId, deliveryType);
      if (deliveryType === "invite") {
        // Consume/open before any email leaves the system. A failed launch
        // must never notify employees, and a retry of already-queued rows
        // must still be able to open after the customer buys a credit.
        const opened = await repo.openCycleWithSurveyCredit(tenant.id, cycleId);
        if (!opened.opened && opened.reason === "no_credit") throw new Error("Buy a survey credit before sending this survey. Drafts stay free until the cycle opens.");
        if (!opened.opened && opened.reason === "employee_limit") throw new Error("This launch includes more than 100 active employees. This credit covers up to 100; contact SaferSay for the right plan.");
        if (opened.opened) await repo.syncSurveyCreditBalance(tenant.id);
      }
      if (queued > 0 && deliveryType === "invite") {
        await repo.emitOnboardingEvent(tenant.id, userId, "queue");
      }
      if (prepared > 0 && deliveryType === "invite") {
        await repo.emitOnboardingEvent(tenant.id, userId, "outbox");
      }

      const deliveries = await repo.getQueuedOutboxDeliveries(tenant.id, cycleId, deliveryType);
      const smtpConfig = await repo.getSmtpConfig(tenant.id);
      const delivery = await sendQueuedInviteDeliveries({ tenant, deliveries, smtpConfig });
      // Sequential, not Promise.all: db is a single shared client under
      // withTenantScopedDb (tenant-scoped connection), and pg clients can't
      // run concurrent queries on one connection.
      for (const id of delivery.sentIds) await repo.markOutboxSent(id);
      for (const id of delivery.failedIds) await repo.markOutboxFailed(id);

      if (deliveryType === "invite" && queued > 0) {
        await repo.markFirstRunCompleted(tenant.id);
        // Real founder-facing "the survey is live" transition -- see
        // ResponseRepository.openCycle. A reminder implies the cycle is
        // already open, so this only fires for the initial invite send.
        //
        // Gated on invites actually being queued (the admin genuinely sent),
        // not on email delivery succeeding (delivery.sent > 0) -- a
        // respondent's link works independently of whether the notification
        // email reached them (an admin can always share it another way).
        // Coupling "live" to email success meant a single flaky/misconfigured
        // mail provider -- or, as found in live testing, an email provider's
        // sandbox mode rejecting every recipient -- could permanently strand
        // an entire survey in draft with valid, working invite links that
        // nobody could use, because nothing ever flips the cycle open.
      }

      return {
        cycleId,
        deliveryType,
        prepared,
        queued,
        delivery: { sent: delivery.sent, failed: delivery.failed, errors: delivery.errors.slice(0, 5) },
        ...(await repo.getInviteOutbox(tenant.id, cycleId)),
        participation: await repo.getParticipationSummary(tenant.id, cycleId),
      };
    });
  } catch (error) {
    console.error("invites/send failed:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Sending invites failed unexpectedly." },
      { status: 500 },
    );
  }

  if (!result) {
    return NextResponse.json({ ok: false, error: "Create a survey cycle before sending invites." }, { status: 400 });
  }

  if (result.delivery.sent > 0) {
    if (deliveryType === "invite") {
      await logInvitesSent(tenant.id, session.role, session.email, result.cycleId, result.delivery.sent);
    } else {
      await logRemindersSent(tenant.id, session.role, session.email, result.cycleId, result.delivery.sent);
    }
  }

  return NextResponse.json({ ok: result.delivery.failed === 0, tenant, ...result });
}
