-- Long-lived, tenant-scoped API keys for non-interactive read access to
-- report data (PowerBI/Tableau/ChatGPT-style integrations -- see
-- /api/report/export). Only the hash is ever stored, same convention as
-- respondent tokens (hashServerToken, tokenHashing.ts) -- the raw key is
-- shown to the admin exactly once, at creation time, and never again.
create table identity.tenant_api_keys (
  id uuid primary key,
  tenant_id uuid not null references identity.tenants(id),
  key_hash text not null unique,
  label text,
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);

alter table identity.tenant_api_keys enable row level security;

grant select, insert, update on identity.tenant_api_keys to safersay_app;

create policy tenant_isolation on identity.tenant_api_keys
  using (tenant_id = current_setting('app.current_tenant_id', true)::uuid)
  with check (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

-- Key lookup (validating an incoming Authorization header) happens before
-- app.current_tenant_id is known -- it's what *establishes* the tenant --
-- so that one lookup path needs the privileged pool, same pattern as
-- respondent token resolution (findIssuedToken) via getDatabasePool().
create index tenant_api_keys_hash_idx on identity.tenant_api_keys (key_hash) where revoked_at is null;
