import { NextResponse, type NextRequest } from "next/server";
import { getSessionContext } from "@/lib/server/authSession";
import { withTenantScopedDb } from "@/lib/server/db/tenantPool";
import { IdentityRepository } from "@/lib/server/repositories/identityRepository";
import { ResponseRepository } from "@/lib/server/repositories/responseRepository";
import { sendQueuedInviteDeliveries } from "@/lib/server/resendDelivery";
import { logInvitesSent, logRemindersSent } from "@/lib/server/auditLog";
import { canRunSurvey } from "@/lib/permissions";

export async function POST(request: NextRequest) {
  const session = await getSessionContext();
  if (!session) {
    return NextResponse.json({ ok: false, error: "Unauthorized invite queue access." }, { status: 401 });
  }
  if (!canRunSurvey(session.role)) {
    return NextResponse.json({ ok: false, error: "You don't have permission to manage invites." }, { status: 403 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    cycleId?: string;
    deliveryType?: "invite" | "reminder";
    sendNow?: boolean;
  };
  const deliveryType = body.deliveryType ?? "invite";
  const { tenant, userId } = session;

  let result;
  try {
    result = await withTenantScopedDb(tenant.id, async (db) => {
      const repo = new IdentityRepository(db);
      const response = new ResponseRepository(db);
      const cycleId = body.cycleId ?? (await repo.getLatestCycleIdForTenant(tenant.id));
      if (!cycleId) return null;

      // A closed cycle should never queue or send further invites/reminders --
      // it's no longer collecting responses. Same guard applied on the
      // outbox-prepare route; this is the point actual sending happens.
      const cycle = await response.getCycleForTenant(tenant.id, cycleId);
      if (cycle?.status === "closed") return "closed" as const;

      const queued = await repo.markOutboxQueued(tenant.id, cycleId, deliveryType);
      if (deliveryType === "invite") {
        const opened = await repo.openCycleWithSurveyCredit(tenant.id, cycleId);
        if (!opened.opened && opened.reason === "no_credit") throw new Error("Buy a survey credit before sending this survey. Drafts stay free until the cycle opens.");
        if (!opened.opened && opened.reason === "employee_limit") throw new Error("This launch includes more than 100 active employees. This credit covers up to 100; contact SaferSay for the right plan.");
        if (opened.opened) await repo.syncSurveyCreditBalance(tenant.id);
      }
      if (queued > 0 && deliveryType === "invite") {
        await repo.emitOnboardingEvent(tenant.id, userId, "queue");
      }

      if (!body.sendNow) {
        // Queuing (this developer/test-mode path) is itself a genuine send
        // action -- same as /api/invites/send, this is what makes the
        // cycle's invite links usable, independent of whether a later
        // dispatch step's emails actually succeed. Without this, the
        // dev-mode Queue+Dispatch panel (the only working path in
        // environments where real email delivery is restricted, e.g. an
        // unverified Resend sandbox domain) could queue and even dispatch
        // every invite and still leave the survey stuck in Draft forever.
        return { ok: true, cycleId, deliveryType, queued, ...(await repo.getInviteOutbox(tenant.id, cycleId)) };
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
      }

      return {
        ok: delivery.failed === 0,
        cycleId,
        deliveryType,
        queued,
        delivery: { sent: delivery.sent, failed: delivery.failed, errors: delivery.errors.slice(0, 5) },
        ...(await repo.getInviteOutbox(tenant.id, cycleId)),
      };
    });
  } catch (error) {
    console.error("invites/queue failed:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Queuing invites failed unexpectedly." },
      { status: 500 },
    );
  }

  if (!result) return NextResponse.json({ ok: false, error: "No survey cycle was found." }, { status: 400 });
  if (result === "closed") {
    return NextResponse.json({ ok: false, error: "This survey is closed. No further invites or reminders can be sent." }, { status: 400 });
  }

  if ("delivery" in result && result.delivery.sent > 0) {
    if (deliveryType === "invite") {
      await logInvitesSent(tenant.id, session.role, session.email, result.cycleId, result.delivery.sent);
    } else {
      await logRemindersSent(tenant.id, session.role, session.email, result.cycleId, result.delivery.sent);
    }
  }

  return NextResponse.json({ tenant, ...result });
}
