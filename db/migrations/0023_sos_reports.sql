-- SOS / "I need help" escalation: a survey-taker's voluntary, one-time
-- de-anonymization for a single report (e.g. harassment), routed straight
-- to a tenant-configured safety contact. Lives entirely in `identity.*`,
-- never `responses.*` -- so responses.assert_no_identity_columns()
-- (0001_confidential_spine.sql) is structurally irrelevant to it; that
-- event trigger only fires on DDL in the responses schema. This table's
-- confidentiality contract is the opposite of everything else in
-- identity.* by design: it exists specifically to carry identity + raw
-- message together, on the reporter's own explicit, logged consent.
--
-- No FK from cycle_id to responses.survey_cycles -- same deliberate
-- no-cross-schema-FK pattern already used by identity.cycle_actions and
-- identity.survey_participants (0010_client_admin_layer.sql).
create table identity.sos_reports (
  id uuid primary key,
  tenant_id uuid not null references identity.tenants(id),
  cycle_id uuid,
  employee_id uuid not null references identity.employees(id),
  message text not null,
  consent_ack boolean not null,
  -- Snapshot of the safety-contact email AT SEND TIME, not a live join --
  -- if the safety contact is later changed, an already-sent report's
  -- record of where it actually went must stay accurate for audit
  -- purposes. Same "snapshot, not live join" philosophy as segment_team
  -- (0020_participant_team_snapshot.sql).
  routed_to_email text not null,
  email_status text not null default 'pending' check (email_status in ('pending', 'sent', 'failed')),
  created_at timestamptz not null default now()
);

alter table identity.sos_reports enable row level security;

grant select, insert, update on identity.sos_reports to safersay_app;

create policy tenant_isolation on identity.sos_reports
  using (tenant_id = current_setting('app.current_tenant_id', true)::uuid)
  with check (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

create index sos_reports_tenant_idx on identity.sos_reports (tenant_id, created_at desc);

-- Deliberately separate from the existing customer_admin lookup
-- (identityRepository.ts's primaryContactEmail) -- at a small tenant,
-- customer_admin is very likely the person a report could be about.
-- No default, no fallback: null means the SOS button does not render at
-- all for respondents (enforced server-side, not just client-side hidden).
alter table identity.tenant_settings add column if not exists safety_contact_email text;
