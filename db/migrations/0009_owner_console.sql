-- Owner Control Room: real per-tenant plan/feature state and an ops notes
-- log for the support-only tenant detail view. No response content is
-- touched by anything in this migration (identity schema only).

alter table identity.tenant_settings
  add column if not exists plan_tier text not null default 'standard'
    check (plan_tier in ('standard', 'growth', 'enterprise')),
  add column if not exists features jsonb not null default '{}'::jsonb;

create table if not exists identity.tenant_support_notes (
  id uuid primary key,
  tenant_id uuid not null references identity.tenants(id),
  author_email text not null,
  note text not null,
  created_at timestamptz not null default now()
);

alter table identity.tenant_support_notes enable row level security;

create index if not exists tenant_support_notes_tenant_idx
  on identity.tenant_support_notes (tenant_id, created_at desc);
