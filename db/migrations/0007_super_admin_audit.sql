-- Audit trail for the platform super-admin tenant switch (see SUPER_ADMIN_EMAILS).
-- Every time a super admin views a tenant that isn't their own, it is logged here.
create table identity.super_admin_access_log (
  id uuid primary key default gen_random_uuid(),
  super_admin_user_id uuid not null,
  super_admin_email text not null,
  tenant_id uuid not null references identity.tenants(id),
  occurred_at timestamptz not null default now()
);

create index idx_super_admin_access_log_tenant on identity.super_admin_access_log(tenant_id, occurred_at);
create index idx_super_admin_access_log_admin on identity.super_admin_access_log(super_admin_user_id, occurred_at);
