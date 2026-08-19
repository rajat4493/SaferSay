-- Tenant-configurable outbound mail server, for tenants that want
-- invite/reminder email to come from their own domain instead of
-- SaferSay's shared Resend sender. All columns nullable with no default
-- -- absent means "use the global Resend config", exactly today's
-- behavior, so this is fully backward compatible for every existing
-- tenant. smtp_password is encrypted at rest (see secretCrypto.ts) since,
-- unlike respondent tokens or API keys, it must be read back in plaintext
-- to actually authenticate against the tenant's mail server.
alter table identity.tenant_settings add column if not exists smtp_host text;
alter table identity.tenant_settings add column if not exists smtp_port integer;
alter table identity.tenant_settings add column if not exists smtp_username text;
alter table identity.tenant_settings add column if not exists smtp_password_encrypted text;
alter table identity.tenant_settings add column if not exists smtp_from_email text;
