import { NextResponse, type NextRequest } from "next/server";
import { getSessionContext } from "@/lib/server/authSession";
import { withTenantScopedDb } from "@/lib/server/db/tenantPool";
import { IdentityRepository } from "@/lib/server/repositories/identityRepository";
import { canManageIntegrations } from "@/lib/permissions";

function isSlackWebhookUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname === "hooks.slack.com";
  } catch {
    return false;
  }
}

export async function GET() {
  const session = await getSessionContext();
  if (!session) return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  if (!canManageIntegrations(session.role)) return NextResponse.json({ ok: false, error: "You don't have permission to view integrations." }, { status: 403 });

  const settings = await withTenantScopedDb(session.tenant.id, async (db) => {
    const self = await new IdentityRepository(db).getTenantSelfSettings(session.tenant.id);
    return { smtpConfigured: self.smtpConfigured, smtpFromEmail: self.smtpFromEmail, slackConnected: self.slackConnected };
  });
  return NextResponse.json({ ok: true, settings });
}

export async function PATCH(request: NextRequest) {
  const session = await getSessionContext();
  if (!session) return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  if (!canManageIntegrations(session.role)) return NextResponse.json({ ok: false, error: "You don't have permission to manage integrations." }, { status: 403 });

  const body = (await request.json().catch(() => ({}))) as {
    smtpHost?: string; smtpPort?: number; smtpUsername?: string; smtpPassword?: string; smtpFromEmail?: string; smtpClear?: boolean;
    slackWebhookUrl?: string; slackClear?: boolean;
  };
  const wantsSmtp = typeof body.smtpHost === "string" && body.smtpHost.trim();
  if (wantsSmtp && (!body.smtpPort || !body.smtpUsername?.trim() || !body.smtpPassword?.trim() || !body.smtpFromEmail?.trim())) {
    return NextResponse.json({ ok: false, error: "SMTP host, port, username, password, and from-address are all required together." }, { status: 400 });
  }
  if (typeof body.slackWebhookUrl === "string" && body.slackWebhookUrl.trim() && !isSlackWebhookUrl(body.slackWebhookUrl.trim())) {
    return NextResponse.json({ ok: false, error: "Use a valid Slack incoming-webhook URL." }, { status: 400 });
  }

  const settings = await withTenantScopedDb(session.tenant.id, async (db) => {
    const repo = new IdentityRepository(db);
    if (body.smtpClear) await repo.setSmtpConfig(session.tenant.id, null);
    else if (wantsSmtp) await repo.setSmtpConfig(session.tenant.id, { host: body.smtpHost!.trim(), port: body.smtpPort!, username: body.smtpUsername!.trim(), password: body.smtpPassword!, fromEmail: body.smtpFromEmail!.trim() });
    if (body.slackClear) await repo.setSlackWebhookUrl(session.tenant.id, null);
    else if (typeof body.slackWebhookUrl === "string" && body.slackWebhookUrl.trim()) await repo.setSlackWebhookUrl(session.tenant.id, body.slackWebhookUrl.trim());
    const self = await repo.getTenantSelfSettings(session.tenant.id);
    return { smtpConfigured: self.smtpConfigured, smtpFromEmail: self.smtpFromEmail, slackConnected: self.slackConnected };
  });
  return NextResponse.json({ ok: true, settings });
}
