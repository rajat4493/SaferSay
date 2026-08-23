import "server-only";

import { Resend } from "resend";
import nodemailer from "nodemailer";
import { getRuntimeMode } from "@/lib/runtimeConfig";
import type { QueuedInviteDelivery, TenantRecord } from "@/lib/server/repositories/types";

export type TenantSmtpConfig = { host: string; port: number; username: string; password: string; fromEmail: string };

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

/**
 * Sends via the tenant's own SMTP server when configured (see
 * IdentityRepository.getSmtpConfig), otherwise falls back to the global
 * Resend config -- exactly today's behavior for every tenant that hasn't
 * set one up. This is the only branch point; message content and the
 * outbox sent/failed bookkeeping are identical either way.
 */
export async function sendQueuedInviteDeliveries({
  tenant,
  deliveries,
  smtpConfig,
}: {
  tenant: TenantRecord;
  deliveries: QueuedInviteDelivery[];
  smtpConfig?: TenantSmtpConfig | null;
}): Promise<DeliveryResult & { sentIds: string[]; failedIds: string[] }> {
  if (smtpConfig) {
    return sendViaTenantSmtp({ tenant, deliveries, smtpConfig });
  }

  const config = getResendConfig();
  if (!config.apiKey) {
    return { sent: 0, failed: deliveries.length, errors: ["RESEND_API_KEY is not configured."], sentIds: [], failedIds: deliveries.map((item) => item.outboxId) };
  }

  if (getRuntimeMode() === "production" && config.fromEmail.includes("resend.dev")) {
    return {
      sent: 0,
      failed: deliveries.length,
      errors: ["RESEND_FROM_EMAIL must be a verified production domain, not the resend.dev sandbox sender."],
      sentIds: [],
      failedIds: deliveries.map((item) => item.outboxId),
    };
  }

  const resend = new Resend(config.apiKey);
  const sentIds: string[] = [];
  const failedIds: string[] = [];
  const errors: string[] = [];

  for (const delivery of deliveries) {
    const message = buildInviteMessage({ tenant, delivery, appUrl: config.appUrl });
    try {
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
    } catch (error) {
      // The Resend SDK can throw (not just return { error }) -- e.g. its
      // sandbox-mode rejection for an unverified recipient. Uncaught, this
      // took down the whole request with a non-JSON 500, which the client
      // could only report as a generic "Request failed." One bad
      // recipient in a batch should fail that recipient, not the request.
      failedIds.push(delivery.outboxId);
      errors.push(`${delivery.email}: ${error instanceof Error ? error.message : "Email send failed."}`);
    }
  }

  return { sent: sentIds.length, failed: failedIds.length, errors, sentIds, failedIds };
}

async function sendViaTenantSmtp({
  tenant,
  deliveries,
  smtpConfig,
}: {
  tenant: TenantRecord;
  deliveries: QueuedInviteDelivery[];
  smtpConfig: TenantSmtpConfig;
}): Promise<DeliveryResult & { sentIds: string[]; failedIds: string[] }> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://safer-say.vercel.app";
  const transporter = nodemailer.createTransport({
    host: smtpConfig.host,
    port: smtpConfig.port,
    secure: smtpConfig.port === 465,
    auth: { user: smtpConfig.username, pass: smtpConfig.password },
  });

  const sentIds: string[] = [];
  const failedIds: string[] = [];
  const errors: string[] = [];

  for (const delivery of deliveries) {
    const message = buildInviteMessage({ tenant, delivery, appUrl });
    try {
      await transporter.sendMail({
        from: smtpConfig.fromEmail,
        to: delivery.email,
        subject: message.subject,
        html: message.html,
        text: message.text,
      });
      sentIds.push(delivery.outboxId);
    } catch (error) {
      failedIds.push(delivery.outboxId);
      errors.push(`${delivery.email}: ${error instanceof Error ? error.message : "SMTP send failed."}`);
    }
  }

  return { sent: sentIds.length, failed: failedIds.length, errors, sentIds, failedIds };
}

/** Sends the owner-authored follow-through update to active employees. The
 * message deliberately contains no scores, segmentation, participation, or
 * response content. */
export async function sendPublicCommitmentUpdate({
  tenant,
  recipients,
  statement,
  targetDate,
  smtpConfig,
}: {
  tenant: TenantRecord;
  recipients: Array<{ email: string; name: string | null }>;
  statement: string;
  targetDate: string;
  smtpConfig?: TenantSmtpConfig | null;
}): Promise<DeliveryResult> {
  if (smtpConfig) {
    const transporter = nodemailer.createTransport({
      host: smtpConfig.host,
      port: smtpConfig.port,
      secure: smtpConfig.port === 465,
      auth: { user: smtpConfig.username, pass: smtpConfig.password },
    });
    const errors: string[] = [];
    let sent = 0;
    for (const recipient of recipients) {
      const message = buildCommitmentMessage(tenant, recipient, statement, targetDate);
      try {
        await transporter.sendMail({ from: smtpConfig.fromEmail, to: recipient.email, ...message });
        sent += 1;
      } catch {
        errors.push("Commitment update delivery could not be completed.");
      }
    }
    return { sent, failed: recipients.length - sent, errors };
  }
  const config = getResendConfig();
  if (!config.apiKey) return { sent: 0, failed: recipients.length, errors: ["RESEND_API_KEY is not configured."] };
  if (getRuntimeMode() === "production" && config.fromEmail.includes("resend.dev")) {
    return { sent: 0, failed: recipients.length, errors: ["RESEND_FROM_EMAIL must be a verified production domain."] };
  }
  const resend = new Resend(config.apiKey);
  let sent = 0;
  const errors: string[] = [];
  for (const recipient of recipients) {
    const message = buildCommitmentMessage(tenant, recipient, statement, targetDate);
    try {
      const result = await resend.emails.send({
        from: config.fromEmail,
        to: recipient.email,
        ...message,
      });
      if (result.error) errors.push(`${recipient.email}: ${result.error.message}`);
      else sent += 1;
    } catch {
      errors.push(`${recipient.email}: delivery could not be completed.`);
    }
  }
  return { sent, failed: recipients.length - sent, errors };
}

function buildCommitmentMessage(tenant: TenantRecord, recipient: { email: string; name: string | null }, statement: string, targetDate: string) {
  const greeting = recipient.name ? `Hi ${recipient.name},` : "Hi,";
  return {
    subject: `${tenant.name}: what we will do next`,
    text: `${greeting}\n\nYou said that honest feedback matters. Here is the commitment your company has published:\n\n${statement}\n\nTarget date: ${targetDate}\n\nThis update does not identify anyone or share individual survey answers.`,
    html: `<div style="font-family:Inter,Arial,sans-serif;color:#1d1b19;line-height:1.55;max-width:560px"><p>${escapeHtml(greeting)}</p><p>You said that honest feedback matters. Here is the commitment your company has published:</p><p><strong>${escapeHtml(statement)}</strong></p><p>Target date: ${escapeHtml(targetDate)}</p><p style="color:#746f68;font-size:13px">This update does not identify anyone or share individual survey answers.</p></div>`,
  };
}

function buildInviteMessage({ tenant, delivery, appUrl }: { tenant: TenantRecord; delivery: QueuedInviteDelivery; appUrl: string }) {
  const greeting = delivery.name ? `Hi ${delivery.name},` : "Hi,";
  const action = delivery.deliveryType === "reminder" ? "reminder" : "invitation";
  const subject = delivery.deliveryType === "reminder" ? `${tenant.name}: SaferSay survey reminder` : `${tenant.name}: confidential SaferSay survey`;
  const surveyUrl = delivery.respondentPath ? new URL(delivery.respondentPath, appUrl).toString() : appUrl;
  const text = `${greeting}

This is your SaferSay ${action} for ${tenant.name}.

Your survey link:
${surveyUrl}

SaferSay keeps participation tracking separate from survey answers.

If you were not expecting this, ignore this email.`;

  const html = `
    <div style="font-family: Inter, Arial, sans-serif; color: #1d1b19; line-height: 1.55; max-width: 560px;">
      <p>${escapeHtml(greeting)}</p>
      <p>This is your SaferSay ${escapeHtml(action)} for <strong>${escapeHtml(tenant.name)}</strong>.</p>
      <p><a href="${escapeHtml(surveyUrl)}" style="display: inline-block; background: #1d1b19; color: #ffffff; padding: 12px 18px; border-radius: 999px; text-decoration: none; font-weight: 700;">Start confidential survey</a></p>
      <p>SaferSay keeps participation tracking separate from survey answers.</p>
      <p style="color: #746f68; font-size: 13px;">If you were not expecting this, ignore this email.</p>
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
