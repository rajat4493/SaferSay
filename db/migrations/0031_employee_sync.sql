-- Generic HRIS/roster sync (see /api/employees/sync): an external system
-- pushes employee records in via a per-tenant API key rather than an admin
-- uploading a CSV. Matching still keys on (tenant_id, email) -- the
-- existing unique constraint -- since email is the one identifier every
-- HRIS export reliably carries; external_id/source_system are captured
-- alongside it now so a future vendor-specific connector (Workday,
-- BambooHR, etc.) has a stable id to reconcile against without waiting on
-- a schema change then.
alter table identity.employees add column external_id text;
alter table identity.employees add column source_system text;
