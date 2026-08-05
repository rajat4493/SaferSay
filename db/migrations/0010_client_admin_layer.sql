-- Client/Tenant Admin layer additions (CLIENT_TENANT_ADMIN_SPEC.md).
-- identity schema only -- no response content, no cross-schema FK to
-- responses.survey_cycles (same pattern as identity.survey_participants).

create table if not exists identity.cycle_actions (
  id uuid primary key,
  tenant_id uuid not null references identity.tenants(id),
  cycle_id uuid not null,
  author_email text not null,
  action_text text not null,
  created_at timestamptz not null default now()
);

alter table identity.cycle_actions enable row level security;

create index if not exists cycle_actions_tenant_cycle_idx
  on identity.cycle_actions (tenant_id, cycle_id, created_at desc);
