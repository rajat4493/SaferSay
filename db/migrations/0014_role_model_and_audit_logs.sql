-- Admin refactor: four-role model + audit logging
-- PART 1: Audit logs table (identity schema, operator actions only)
-- PART 2: Support for survey_creator and auditor roles (user_role field expansion)

-- Audit logs: record operator ACTIONS ONLY, never respondent data
-- Hard rule: no identity↔answer joins, no per-person submission tracking,
-- no response content. Audit entries must never enable de-anonymization.
-- See docs/strategy/CLAUDE_CODE_ADMIN_REFACTOR.md §3 ("THE HARD RULE").

create table if not exists identity.audit_logs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references identity.tenants(id),
  actor_role text not null, -- "customer_admin" | "survey_creator" | "auditor" | "employee"
  actor_id text not null,   -- user email or identifier (never respondent email)
  action text not null,     -- e.g., "survey created", "invites sent", "threshold changed"
  target_type text,         -- "survey" | "workspace" | "people_list" | null
  target_id uuid,           -- survey_id or similar (never respondent id)
  safe_counts jsonb,        -- e.g., {"invites_sent": 30, "people_imported": 25} (safe, aggregate-only)
  created_at timestamptz not null default now()
);

alter table identity.audit_logs enable row level security;

create index if not exists audit_logs_tenant_created_idx
  on identity.audit_logs (tenant_id, created_at desc);

create index if not exists audit_logs_actor_idx
  on identity.audit_logs (tenant_id, actor_id, created_at desc);

-- Auditor role can read audit logs (gated by tenant_id in app layer)
create policy audit_logs_auditor_read on identity.audit_logs
  for select
  using (true); -- RLS is tenant-scoped in app layer, not database

-- No INSERT/UPDATE/DELETE at application layer for audit logs
-- (only server-side admin service can write; application has no direct access)
