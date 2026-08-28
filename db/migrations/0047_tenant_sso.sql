-- Per-tenant enterprise SSO (SAML), so staff roles (customer_admin,
-- survey_creator, auditor, people_leader, integration_admin,
-- compliance_reviewer) can sign in via their own identity provider
-- instead of Google/Microsoft. Deliberately never touches survey-taker
-- auth: respondents use the tokenised /s/[token] flow (src/app/s/[token]),
-- which has no Supabase Auth session at all -- nothing here is reachable
-- from that surface.
--
-- sso_metadata_xml is encrypted at rest the same way slack_webhook_url is
-- (see secretCrypto.ts) -- not because it's a bearer credential like the
-- webhook, but because it's tenant-supplied IdP configuration data with
-- no independent read need outside the (re-)registration flow.
-- sso_provider_id is Supabase's own SSO provider id for this tenant's
-- registration, needed to update/deregister it later via the Management
-- API -- opaque, not a secret.
alter table identity.tenant_settings add column if not exists sso_domain text;
alter table identity.tenant_settings add column if not exists sso_metadata_url text;
alter table identity.tenant_settings add column if not exists sso_metadata_xml_encrypted text;
alter table identity.tenant_settings add column if not exists sso_provider_id text;
alter table identity.tenant_settings add column if not exists sso_enabled boolean not null default false;
