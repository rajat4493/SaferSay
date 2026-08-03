-- Track onboarding funnel events for TAT measurement
create table identity.onboarding_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references identity.tenants(id),
  user_id uuid not null,
  event_key text not null check (event_key in (
    'signup', 'employees', 'cycle', 'tokens', 'outbox', 'queue', 'responses', 'report'
  )),
  occurred_at timestamptz not null default now(),
  unique (tenant_id, event_key)
);

create index idx_onboarding_events_tenant_occurred on identity.onboarding_events(tenant_id, occurred_at);
