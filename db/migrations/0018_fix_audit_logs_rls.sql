-- Fix identity.audit_logs RLS: migration 0014 shipped it with
-- `using (true)` and the comment "RLS is tenant-scoped in app layer, not
-- database" -- the only table in the schema without a real tenant_isolation
-- backstop. Every other tenant-scoped table (employees, survey_cycles,
-- pending_invites, etc.) uses the policy below; audit_logs was the one
-- exception, so any query against it on the RLS-enforced role read across
-- every tenant, not just the caller's own.
drop policy if exists audit_logs_auditor_read on identity.audit_logs;

create policy tenant_isolation on identity.audit_logs
  for all
  using (tenant_id = current_setting('app.current_tenant_id', true)::uuid)
  with check (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

-- Also: logAuditEvent() was never wired to an actual insert (TODO stub,
-- console.log only) -- this table has zero rows in production despite
-- every "audit logging" call site running since 0014. Fixing that in the
-- same pass this column is added: a short human-readable detail string,
-- additive and nullable, e.g. "role: auditor" for team invite/removal
-- entries where the structured safe_counts (numbers only) doesn't fit.
alter table identity.audit_logs
  add column if not exists details text;
