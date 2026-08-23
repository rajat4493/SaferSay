import "server-only";

/**
 * Posts to a tenant's connected Slack incoming webhook (see
 * IdentityRepository.getSlackWebhookUrl). The URL itself is the auth --
 * Slack incoming webhooks don't take a separate token -- and it's already
 * validated to be a real hooks.slack.com URL at save time (see
 * isSlackWebhookUrl in /api/tenants/settings), so this never fetches an
 * arbitrary caller-supplied host.
 */
export async function postToSlack(webhookUrl: string, text: string): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text }),
    });
    if (!response.ok) {
      return { ok: false, error: `Slack rejected the message (${response.status}).` };
    }
    return { ok: true };
  } catch {
    return { ok: false, error: "Couldn't reach Slack. Try again." };
  }
}
