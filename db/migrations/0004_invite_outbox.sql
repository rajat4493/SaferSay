create table if not exists identity.invite_outbox (
  id uuid primary key,
  tenant_id uuid not null references identity.tenants(id),
  cycle_id uuid not null,
  participant_id uuid not null references identity.survey_participants(id),
  delivery_type text not null check (delivery_type in ('invite', 'reminder')),
  delivery_status text not null default 'pending' check (delivery_status in ('pending', 'queued', 'sent', 'failed')),
  queued_at timestamptz,
  sent_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (participant_id, delivery_type)
);

alter table identity.invite_outbox enable row level security;
