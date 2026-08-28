/**
 * Shared validation for tenant-level SMTP/Slack config, used by both
 * /api/tenants/settings (customer_admin) and /api/tenants/integrations
 * (customer_admin + integration_admin) -- kept in one place so a future
 * rule change (e.g. Slack changing its webhook URL shape) can't silently
 * apply to one route and not the other.
 */

export function isSlackWebhookUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname === "hooks.slack.com";
  } catch {
    return false;
  }
}

export type SmtpUpdateFields = {
  smtpHost?: string;
  smtpPort?: number;
  smtpUsername?: string;
  smtpPassword?: string;
  smtpFromEmail?: string;
};

/** SMTP is set-together, not field-by-field: the admin resends the full
 * config (including password) every time they change any part of it. No
 * partial-update path exists, so there's no ambiguity about whether an
 * omitted password means "keep the old one" or "clear it." */
export function wantsSmtpUpdate(body: SmtpUpdateFields): boolean {
  return typeof body.smtpHost === "string" && body.smtpHost.trim().length > 0;
}

export function isSmtpUpdateIncomplete(body: SmtpUpdateFields): boolean {
  return !body.smtpPort || !body.smtpUsername?.trim() || !body.smtpPassword?.trim() || !body.smtpFromEmail?.trim();
}

/** A bare domain (no scheme, no "@", no path) -- what an admin types to
 * register their company's IdP, and what a staff member's email is
 * matched against at sign-in via supabase.auth.signInWithSSO({domain}). */
export function isValidSsoDomain(value: string): boolean {
  return /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+$/i.test(value.trim());
}
