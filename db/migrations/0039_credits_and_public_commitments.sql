-- Pay-when-you-listen ledger and employee-safe follow-through. Both tables
-- stay in identity: they must never be joined to response content.

create table if not exists identity.survey_credits (
  id uuid primary key,
  tenant_id uuid not null references identity.tenants(id),
  source_reference text not null,
  source_position integer not null,
  employee_band text not null check (employee_band = 'up_to_100'),
  expires_at timestamptz not null,
  consumed_at timestamptz,
  cycle_id uuid,
  created_at timestamptz not null default now(),
  unique (source_reference, source_position),
  unique (tenant_id, cycle_id)
);

create index if not exists survey_credits_available_idx
  on identity.survey_credits (tenant_id, expires_at, created_at)
  where consumed_at is null;

create table if not exists identity.cycle_commitments (
  id uuid primary key,
  tenant_id uuid not null references identity.tenants(id),
  cycle_id uuid not null,
  statement text not null check (char_length(trim(statement)) between 1 and 500),
  target_date date not null,
  status text not null check (status in ('published', 'in_progress', 'completed')),
  progress_update text,
  published_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, cycle_id)
);

grant select, insert, update on identity.survey_credits to safersay_app;
grant select, insert, update on identity.cycle_commitments to safersay_app;
grant update on responses.survey_cycles to safersay_app;

alter table identity.survey_credits enable row level security;
alter table identity.cycle_commitments enable row level security;

drop policy if exists tenant_isolation on identity.survey_credits;
create policy tenant_isolation on identity.survey_credits
  using (tenant_id = current_setting('app.current_tenant_id', true)::uuid)
  with check (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

drop policy if exists tenant_isolation on identity.cycle_commitments;
create policy tenant_isolation on identity.cycle_commitments
  using (tenant_id = current_setting('app.current_tenant_id', true)::uuid)
  with check (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
