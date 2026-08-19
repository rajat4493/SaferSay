-- Admin-managed, reusable survey questions, separate from the fixed
-- template_questions used to seed the 4 built-in templates
-- (0001_confidential_spine.sql). Each tenant's bank is private -- no
-- cross-tenant sharing in v1, matching the tenant-isolation posture used
-- everywhere else. Lives in responses.* alongside survey_templates since
-- it holds only question text/metadata, never respondent identity or
-- answers -- responses.assert_no_identity_columns() is a no-op here by
-- construction (no identity-shaped columns are added).
create table responses.question_bank (
  id uuid primary key,
  tenant_id uuid not null references identity.tenants(id),
  construct text,
  text text not null,
  question_type text not null check (question_type in ('scale', 'open_text')),
  archived_at timestamptz,
  created_at timestamptz not null default now()
);

alter table responses.question_bank enable row level security;

grant select, insert, update, delete on responses.question_bank to safersay_app;

create policy tenant_isolation on responses.question_bank
  using (tenant_id = current_setting('app.current_tenant_id', true)::uuid)
  with check (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

create index question_bank_tenant_idx on responses.question_bank (tenant_id, archived_at);
