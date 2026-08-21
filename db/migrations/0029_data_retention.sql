-- Data retention enforcement. identity.tenant_settings.retention_months
-- already existed (0002_tenant_bootstrap.sql, default 24) but nothing
-- measured from it or purged anything. This adds:
--  1. A real "closed" timestamp to measure retention from -- closes_at
--     is a *scheduled* target, not the actual moment a survey was closed,
--     and status alone carries no timestamp.
--  2. Bookkeeping on tenant_settings so each purge run's outcome is
--     visible without re-deriving it from audit logs.
alter table responses.survey_cycles add column actual_closed_at timestamptz;

alter table identity.tenant_settings add column retention_purge_last_run_at timestamptz;
alter table identity.tenant_settings add column retention_purge_last_deleted_submissions integer not null default 0;
