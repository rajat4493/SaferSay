-- RLS tenant isolation (SAFERSAY_CONFIDENTIALITY.md §1.2/§2, top structural
-- risk). A restricted, non-superuser role for all tenant-scoped app traffic,
-- with real RLS policies keyed to a per-request `app.current_tenant_id`
-- session variable -- so a missing/wrong WHERE clause in application code
-- can no longer leak across tenants; the database itself refuses the row.
--
-- The role's password is set separately (not committed here). Company/Owner
-- console operations (cross-tenant by design: tenant list, tenant creation,
-- auth bootstrap before a tenant is known) continue on the existing
-- privileged connection -- that split IS the three-layer model in
-- SAFERSAY_CONFIDENTIALITY.md §0: Company sees tenants, never content;
-- this role can only ever see one tenant's rows at a time, and never the
-- Owner-only audit/support tables at all.

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'safersay_app') then
    create role safersay_app with login nosuperuser nocreatedb nocreaterole nobypassrls inherit;
  end if;
end
$$;

grant usage on schema identity to safersay_app;
grant usage on schema responses to safersay_app;

-- Tenant-owned identity tables: full DML, RLS-scoped below.
grant select, insert, update, delete on identity.employees to safersay_app;
grant select, insert, update, delete on identity.survey_participants to safersay_app;
grant select, insert, update on identity.tenant_settings to safersay_app;
grant select, insert, update on identity.invite_outbox to safersay_app;
grant select, insert on identity.onboarding_events to safersay_app;
grant select, insert on identity.cycle_actions to safersay_app;
grant select on identity.billing_accounts to safersay_app;
grant select on identity.cycle_payments to safersay_app;

-- The tenant's own row only (self policy below) -- needed by respondent/
-- token flows that resolve tenant identity before a session exists.
grant select on identity.tenants to safersay_app;
grant select on identity.users to safersay_app;

-- Shared reference data (survey_templates/template_questions are not
-- tenant-owned -- see surveyCycleService.ts's stable-slug template sharing).
-- Read-only for the restricted role; only the privileged connection writes.
grant select on responses.survey_templates to safersay_app;
grant select on responses.template_questions to safersay_app;

-- Tenant-scoped cycle/submission rows: SELECT for counts/status, INSERT for
-- the respondent flow. Deliberately NO grant on responses.answers -- raw
-- response content is reachable only through report_question_scores(),
-- which is SECURITY DEFINER and already enforces its own cycle scoping.
grant select, insert on responses.survey_cycles to safersay_app;
grant select, insert on responses.submissions to safersay_app;
grant insert on responses.answers to safersay_app;
grant execute on function responses.report_question_scores(uuid, integer) to safersay_app;

-- Explicitly nothing granted on identity.super_admin_access_log or
-- identity.tenant_support_notes -- Owner-only operational tables, never
-- reachable from the tenant-scoped connection.

alter table identity.employees enable row level security;
alter table identity.survey_participants enable row level security;
alter table identity.tenant_settings enable row level security;
alter table identity.invite_outbox enable row level security;
alter table identity.onboarding_events enable row level security;
alter table identity.cycle_actions enable row level security;
alter table identity.billing_accounts enable row level security;
alter table identity.cycle_payments enable row level security;
alter table identity.tenants enable row level security;
alter table identity.users enable row level security;
alter table responses.survey_cycles enable row level security;
alter table responses.submissions enable row level security;

drop policy if exists tenant_isolation on identity.employees;
create policy tenant_isolation on identity.employees
  using (tenant_id = current_setting('app.current_tenant_id', true)::uuid)
  with check (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

drop policy if exists tenant_isolation on identity.survey_participants;
create policy tenant_isolation on identity.survey_participants
  using (tenant_id = current_setting('app.current_tenant_id', true)::uuid)
  with check (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

drop policy if exists tenant_isolation on identity.tenant_settings;
create policy tenant_isolation on identity.tenant_settings
  using (tenant_id = current_setting('app.current_tenant_id', true)::uuid)
  with check (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

drop policy if exists tenant_isolation on identity.invite_outbox;
create policy tenant_isolation on identity.invite_outbox
  using (tenant_id = current_setting('app.current_tenant_id', true)::uuid)
  with check (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

drop policy if exists tenant_isolation on identity.onboarding_events;
create policy tenant_isolation on identity.onboarding_events
  using (tenant_id = current_setting('app.current_tenant_id', true)::uuid)
  with check (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

drop policy if exists tenant_isolation on identity.cycle_actions;
create policy tenant_isolation on identity.cycle_actions
  using (tenant_id = current_setting('app.current_tenant_id', true)::uuid)
  with check (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

drop policy if exists tenant_isolation on identity.billing_accounts;
create policy tenant_isolation on identity.billing_accounts
  using (tenant_id = current_setting('app.current_tenant_id', true)::uuid)
  with check (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

drop policy if exists tenant_isolation on identity.cycle_payments;
create policy tenant_isolation on identity.cycle_payments
  using (tenant_id = current_setting('app.current_tenant_id', true)::uuid)
  with check (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

drop policy if exists tenant_self on identity.tenants;
create policy tenant_self on identity.tenants
  using (id = current_setting('app.current_tenant_id', true)::uuid)
  with check (id = current_setting('app.current_tenant_id', true)::uuid);

drop policy if exists tenant_isolation on identity.users;
create policy tenant_isolation on identity.users
  using (tenant_id = current_setting('app.current_tenant_id', true)::uuid)
  with check (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

drop policy if exists tenant_isolation on responses.survey_cycles;
create policy tenant_isolation on responses.survey_cycles
  using (tenant_id = current_setting('app.current_tenant_id', true)::uuid)
  with check (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

drop policy if exists tenant_isolation on responses.submissions;
create policy tenant_isolation on responses.submissions
  using (tenant_id = current_setting('app.current_tenant_id', true)::uuid)
  with check (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
