import { NextResponse, type NextRequest } from "next/server";
import { getSessionContext } from "@/lib/server/authSession";
import { withTenantScopedDb } from "@/lib/server/db/tenantPool";
import { IdentityRepository } from "@/lib/server/repositories/identityRepository";
import { postToSlack } from "@/lib/server/slackDelivery";
import { canRunSurvey } from "@/lib/permissions";
import { checkRateLimit, getClientIp } from "@/lib/server/rateLimit";

export async function POST(request: NextRequest) {
  const session = await getSessionContext();
  if (!session) return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  if (!canRunSurvey(session.role)) {
    return NextResponse.json({ ok: false, error: "You don't have permission to post to Slack." }, { status: 403 });
  }

  const { allowed } = await checkRateLimit(`slack-post:${session.tenant.id}:${getClientIp(request)}`, 10, 60);
  if (!allowed) {
    return NextResponse.json({ ok: false, error: "Too many messages sent. Try again in a minute." }, { status: 429 });
  }

  const body = (await request.json().catch(() => ({}))) as { text?: string };
  const text = body.text?.trim();
  if (!text) return NextResponse.json({ ok: false, error: "Nothing to post." }, { status: 400 });

  const webhookUrl = await withTenantScopedDb(session.tenant.id, (db) => new IdentityRepository(db).getSlackWebhookUrl(session.tenant.id));
  if (!webhookUrl) {
    return NextResponse.json({ ok: false, error: "Slack isn't connected for this workspace yet." }, { status: 400 });
  }

  const result = await postToSlack(webhookUrl, text);
  if (!result.ok) return NextResponse.json({ ok: false, error: result.error }, { status: 502 });
  return NextResponse.json({ ok: true });
}
