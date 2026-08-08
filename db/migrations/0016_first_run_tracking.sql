-- Tracks whether a tenant has completed the guided first-run sequence
-- (load people -> create survey -> send it), so /app/page.tsx can stop
-- showing the FirstRunGuide once it's done instead of re-deriving
-- completion from scratch on every load. Nullable -- absence means
-- "not completed yet" for every existing tenant, no backfill needed.
alter table identity.tenant_settings
  add column if not exists first_run_completed_at timestamptz;
