alter table identity.tenants
  add column if not exists slug text,
  add column if not exists updated_at timestamptz not null default now();

update identity.tenants
set slug = lower(regexp_replace(name, '[^a-zA-Z0-9]+', '-', 'g'))
where slug is null;

alter table identity.tenants
  alter column slug set not null;

create unique index if not exists tenants_slug_key on identity.tenants (slug);

create table if not exists identity.tenant_settings (
  tenant_id uuid primary key references identity.tenants(id),
  default_min_group_size integer not null default 5 check (default_min_group_size >= 5),
  data_residency_region text not null default 'EU',
  retention_months integer not null default 24 check (retention_months >= 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table identity.tenant_settings enable row level security;
