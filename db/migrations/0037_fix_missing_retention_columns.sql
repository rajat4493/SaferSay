-- Corrective migration. 0029_data_retention.sql adds three columns in one
-- file; under scripts/run-migrations.mjs's per-file duplicate-tolerance
-- logic (as it existed before this fix), if any one statement in a file
-- hit an "already exists" error the whole file's transaction rolled back
-- -- including its genuinely-new columns -- yet the file still got marked
-- applied in schema_migrations and was never retried. On at least one
-- deployed database this left responses.survey_cycles.actual_closed_at
-- missing, which broke closing a survey (closeCycle() sets that column).
-- `if not exists` makes this safe to run everywhere, including databases
-- where 0029 actually did apply cleanly.
alter table responses.survey_cycles add column if not exists actual_closed_at timestamptz;

alter table identity.tenant_settings add column if not exists retention_purge_last_run_at timestamptz;
alter table identity.tenant_settings add column if not exists retention_purge_last_deleted_submissions integer not null default 0;
