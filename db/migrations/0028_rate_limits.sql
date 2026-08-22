-- Generic fixed-window rate-limit counter, for the handful of routes
-- that are reachable without an authenticated session (respondent token
-- submission, SOS submission, dev-login) -- exactly the ones a token- or
-- credential-guessing attacker would hit. Deliberately NOT tenant-scoped
-- (keys are things like a token hash or an IP address, not a tenant id)
-- and NOT RLS-protected -- this is an internal control-plane table
-- touched only via the privileged pool, same posture as
-- identity.super_admin_access_log (see 0011_rls_tenant_isolation.sql).
create table if not exists identity.rate_limits (
  bucket_key text primary key,
  count integer not null default 1,
  window_start timestamptz not null default now()
);
