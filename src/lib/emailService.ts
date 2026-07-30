import { Resend } from "resend";
import { InviteTarget } from "@/lib/serverStore";

export async function sendSurveyInvites(targets: InviteTarget[], origin: string) {
  if (!process.env.RESEND_API_KEY) {
    return {
      mode: "mock" as const,
      sent: targets.length,
      links: targets.map((target) => `${origin}/s/${target.token}`),
    };
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const results = await Promise.all(
    targets.map((target) =>
      resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL ?? "SaferSay <surveys@safersay.com>",
        to: target.email,
        subject: "Your confidential employee survey",
        html: `<p>Hi ${target.name},</p><p>Your confidential survey is ready.</p><p><a href="${origin}/s/${target.token}">Start survey</a></p>`,
      }),
    ),
  );

  return { mode: "resend" as const, sent: results.length };
}
