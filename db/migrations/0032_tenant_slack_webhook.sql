-- Per-tenant Slack incoming-webhook URL for the "Share with Slack" button
-- on the team-update draft page (src/app/app/[surveyId]/actions/update/
-- page.tsx), previously rendered permanently disabled with no backing
-- integration at all. A webhook URL is itself a bearer credential (anyone
-- with it can post to the channel), so it's encrypted at rest the same
-- way smtp_password is (see secretCrypto.ts) -- not because it's read
-- back for authentication like SMTP, but because leaking it lets a third
-- party post into the tenant's Slack workspace.
alter table identity.tenant_settings add column if not exists slack_webhook_url_encrypted text;
