-- Team invite with role (coherence-directive Gap 4). A new table rather
-- than modifying identity.users directly -- the invited person doesn't
-- have a real users row (or an auth identity) until they actually sign
-- in for the first time; resolveUserRecord() in authSession.ts checks
-- this table between "existing user by email" and "brand-new tenant" and
-- creates the real row with this invite's role at that point.
create table if not exists identity.pending_invites (
  id uuid primary key,
  tenant_id uuid not null references identity.tenants(id),
  email text not null,
  role text not null check (role in ('customer_admin', 'survey_creator', 'auditor')),
  invited_by_email text not null,
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  unique (tenant_id, email)
);

grant select, insert, update on identity.pending_invites to safersay_app;

alter table identity.pending_invites enable row level security;

create policy tenant_isolation on identity.pending_invites
  using (tenant_id = current_setting('app.current_tenant_id', true)::uuid)
  with check (tenant_id = current_setting('app.current_tenant_id', true)::uuid);
