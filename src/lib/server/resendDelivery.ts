import "server-only";

import { Resend } from "resend";
import type { QueuedInviteDelivery, TenantRecord } from "@/lib/server/repositories/types";

export type DeliveryResult = {
  sent: number;
  failed: number;
  errors: string[];
};

export function getResendConfig() {
  return {
    apiKey: process.env.RESEND_API_KEY,
    fromEmail: process.env.RESEND_FROM_EMAIL ?? "SaferSay <onboarding@resend.dev>",
    appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "https://safer-say.vercel.app",
  };
}

export async function sendQueuedInviteDeliveries({
  tenant,
  deliveries,
}: {
  tenant: TenantRecord;
  deliveries: QueuedInviteDelivery[];
}): Promise<DeliveryResult & { sentIds: string[]; failedIds: string[] }> {
  const config = getResendConfig();
  if (!config.apiKey) {
    return { sent: 0, failed: deliveries.length, errors: ["RESEND_API_KEY is not configured."], sentIds: [], failedIds: deliveries.map((item) => item.outboxId) };
  }

  const resend = new Resend(config.apiKey);
  const sentIds: string[] = [];
  const failedIds: string[] = [];
  const errors: string[] = [];

  for (const delivery of deliveries) {
    const message = buildInviteMessage({ tenant, delivery, appUrl: config.appUrl });
    const result = await resend.emails.send({
      from: config.fromEmail,
      to: delivery.email,
      subject: message.subject,
      html: message.html,
      text: message.text,
    });

    if (result.error) {
      failedIds.push(delivery.outboxId);
      errors.push(`${delivery.email}: ${result.error.message}`);
      continue;
    }

    sentIds.push(delivery.outboxId);
  }

  return { sent: sentIds.length, failed: failedIds.length, errors, sentIds, failedIds };
}

function buildInviteMessage({ tenant, delivery, appUrl }: { tenant: TenantRecord; delivery: QueuedInviteDelivery; appUrl: string }) {
  const greeting = delivery.name ? `Hi ${delivery.name},` : "Hi,";
  const action = delivery.deliveryType === "reminder" ? "reminder" : "invitation";
  const subject = delivery.deliveryType === "reminder" ? `${tenant.name}: SaferSay survey reminder` : `${tenant.name}: confidential SaferSay survey`;
  const text = `${greeting}

This is your SaferSay ${action} for ${tenant.name}.

For this test-mode delivery, SaferSay is validating email sending from the identity-side invite outbox. Respondent links will be included for newly created cycles after the delivery-safe token handoff is enabled.

SaferSay keeps participation tracking separate from survey answers.

${appUrl}`;

  const html = `
    <div style="font-family: Inter, Arial, sans-serif; color: #1d1b19; line-height: 1.55; max-width: 560px;">
      <p>${escapeHtml(greeting)}</p>
      <p>This is your SaferSay ${escapeHtml(action)} for <strong>${escapeHtml(tenant.name)}</strong>.</p>
      <p>For this test-mode delivery, SaferSay is validating email sending from the identity-side invite outbox. Respondent links will be included for newly created cycles after the delivery-safe token handoff is enabled.</p>
      <p>SaferSay keeps participation tracking separate from survey answers.</p>
      <p><a href="${escapeHtml(appUrl)}" style="color: #476552; font-weight: 700;">Open SaferSay</a></p>
    </div>
  `;

  return { subject, text, html };
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
