import { NextResponse, type NextRequest } from "next/server";
import { getSessionContext } from "@/lib/server/authSession";
import { withTenantScopedDb } from "@/lib/server/db/tenantPool";
import { IdentityRepository } from "@/lib/server/repositories/identityRepository";
import { canModifySettings } from "@/lib/permissions";
import { logAuditEvent, logThresholdChanged } from "@/lib/server/auditLog";
import { isSlackWebhookUrl, isSmtpUpdateIncomplete, wantsSmtpUpdate } from "@/lib/server/tenantConfigValidation";

export async function GET() {
  const session = await getSessionContext();
  if (!session) return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  if (!canModifySettings(session.role)) return NextResponse.json({ ok: false, error: "You don't have permission to view workspace settings." }, { status: 403 });

  const settings = await withTenantScopedDb(session.tenant.id, (db) => new IdentityRepository(db).getTenantSelfSettings(session.tenant.id));
  return NextResponse.json({ ok: true, settings });
}

export async function PATCH(request: NextRequest) {
  const session = await getSessionContext();
  if (!session) return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  if (!canModifySettings(session.role)) return NextResponse.json({ ok: false, error: "You don't have permission to change workspace settings." }, { status: 403 });

  const body = (await request.json().catch(() => ({}))) as {
    minGroupSize?: number;
    safetyContactEmail?: string;
    smtpHost?: string;
    smtpPort?: number;
    smtpUsername?: string;
    smtpPassword?: string;
    smtpFromEmail?: string;
    smtpClear?: boolean;
    slackWebhookUrl?: string;
    slackClear?: boolean;
    actionMode?: "insights_only" | "tracked" | "tracked_with_rollup";
  };

  if (body.actionMode && !["insights_only", "tracked", "tracked_with_rollup"].includes(body.actionMode)) {
    return NextResponse.json({ ok: false, error: "Unrecognized action mode." }, { status: 400 });
  }

  if (typeof body.safetyContactEmail === "string" && body.safetyContactEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.safetyContactEmail.trim())) {
    return NextResponse.json({ ok: false, error: "Safety contact must be a valid email address." }, { status: 400 });
  }

  if (typeof body.slackWebhookUrl === "string" && body.slackWebhookUrl.trim() && !isSlackWebhookUrl(body.slackWebhookUrl.trim())) {
    return NextResponse.json({ ok: false, error: "That doesn't look like a Slack incoming-webhook URL (https://hooks.slack.com/services/...)." }, { status: 400 });
  }

  const wantsSmtp = wantsSmtpUpdate(body);
  if (wantsSmtp && isSmtpUpdateIncomplete(body)) {
    return NextResponse.json({ ok: false, error: "SMTP host, port, username, password, and from-address are all required together." }, { status: 400 });
  }

  const settings = await withTenantScopedDb(session.tenant.id, async (db) => {
    const repo = new IdentityRepository(db);
    if (typeof body.minGroupSize === "number") {
      // setMinGroupSize already clamps to the hard [5, 10] band -- the tenant
      // can tune it, but can never disable the wall (see
      // docs/strategy/CLIENT_TENANT_ADMIN_SPEC.md §7).
      await repo.setMinGroupSize(session.tenant.id, body.minGroupSize);
    }
    if (typeof body.safetyContactEmail === "string") {
      // Empty string explicitly clears it (SOS button stops rendering) --
      // no fallback to any other contact, ever. See 0023_sos_reports.sql.
      const trimmed = body.safetyContactEmail.trim();
      await repo.setSafetyContactEmail(session.tenant.id, trimmed ? trimmed : null);
    }
    if (body.smtpClear) {
      await repo.setSmtpConfig(session.tenant.id, null);
    } else if (wantsSmtp) {
      await repo.setSmtpConfig(session.tenant.id, {
        host: body.smtpHost!.trim(),
        port: body.smtpPort!,
        username: body.smtpUsername!.trim(),
        password: body.smtpPassword!,
        fromEmail: body.smtpFromEmail!.trim(),
      });
    }
    if (body.slackClear) {
      await repo.setSlackWebhookUrl(session.tenant.id, null);
    } else if (typeof body.slackWebhookUrl === "string" && body.slackWebhookUrl.trim()) {
      await repo.setSlackWebhookUrl(session.tenant.id, body.slackWebhookUrl.trim());
    }
    if (body.actionMode) {
      await repo.setActionMode(session.tenant.id, body.actionMode);
    }
    return repo.getTenantSelfSettings(session.tenant.id);
  });

  if (typeof body.minGroupSize === "number") {
    await logThresholdChanged(session.tenant.id, session.role, session.email, settings.minGroupSize);
  }
  if (body.actionMode) {
    await logAuditEvent({ tenantId: session.tenant.id, actorRole: session.role, actorId: session.email, action: "settings_updated", targetType: "workspace", details: `action_mode: ${settings.actionMode}` });
  }

  return NextResponse.json({ ok: true, settings });
}
