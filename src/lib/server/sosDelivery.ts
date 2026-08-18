import "server-only";

import { Resend } from "resend";
import { getRuntimeMode } from "@/lib/runtimeConfig";
import { getResendConfig } from "@/lib/server/resendDelivery";
import type { TenantRecord } from "@/lib/server/repositories/types";

/**
 * Kept as a separate file from resendDelivery.ts (not folded into the
 * invite/reminder sender), even though it reuses the same Resend config
 * and production-domain guard -- this is the one delivery path in the
 * whole app that's allowed to carry a respondent's real identity, and
 * keeping it physically separate makes that easy to audit at a glance.
 */
export async function sendSosAlert({
  tenant,
  safetyContactEmail,
  message,
  respondentContext,
}: {
  tenant: TenantRecord;
  safetyContactEmail: string;
  message: string;
  respondentContext: { name: string | null; email: string };
}): Promise<{ sent: boolean; error?: string }> {
  const config = getResendConfig();
  if (!config.apiKey) {
    return { sent: false, error: "RESEND_API_KEY is not configured." };
  }
  if (getRuntimeMode() === "production" && config.fromEmail.includes("resend.dev")) {
    return { sent: false, error: "RESEND_FROM_EMAIL must be a verified production domain, not the resend.dev sandbox sender." };
  }

  const resend = new Resend(config.apiKey);
  const { subject, text, html } = buildSosMessage({ tenant, message, respondentContext });

  const result = await resend.emails.send({
    from: config.fromEmail,
    to: safetyContactEmail,
    subject,
    html,
    text,
  });

  if (result.error) {
    return { sent: false, error: result.error.message };
  }
  return { sent: true };
}

// This is the one email in the system allowed to carry a respondent's
// real name/email -- everything else in SaferSay is built specifically
// to never do that. The disclaimer here is placeholder wording, not
// final legal copy -- needs real legal review before this ships to
// respondents (see the plan's explicit non-goal on "guaranteeing legal
// safety").
function buildSosMessage({
  tenant,
  message,
  respondentContext,
}: {
  tenant: TenantRecord;
  message: string;
  respondentContext: { name: string | null; email: string };
}) {
  const reporterLabel = respondentContext.name ? `${respondentContext.name} (${respondentContext.email})` : respondentContext.email;
  const subject = `${tenant.name}: SaferSay safety escalation — action needed`;
  const disclaimer =
    "This message was sent through SaferSay's SOS feature, which the reporter used to voluntarily share their identity for this one report. It is separate from any anonymous survey responses and is not included in aggregate reporting. SaferSay does not provide legal advice and this does not guarantee protection from retaliation -- that depends on your organization's own policies and applicable law.";

  const text = `A SaferSay survey-taker at ${tenant.name} has asked for help.

From: ${reporterLabel}

Message:
${message}

---
${disclaimer}`;

  const html = `
    <div style="font-family: Inter, Arial, sans-serif; color: #1d1b19; line-height: 1.55; max-width: 560px;">
      <p><strong>A SaferSay survey-taker at ${escapeHtml(tenant.name)} has asked for help.</strong></p>
      <p>From: ${escapeHtml(reporterLabel)}</p>
      <p style="white-space: pre-wrap; border-left: 3px solid #1d1b19; padding-left: 12px;">${escapeHtml(message)}</p>
      <p style="color: #746f68; font-size: 12px; margin-top: 24px;">${escapeHtml(disclaimer)}</p>
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
