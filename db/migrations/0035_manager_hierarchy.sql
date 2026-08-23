-- Real self-referencing org chart, built from manager_email (0008
-- migration) -- that column has been captured and cross-validated
-- against the roster since the CSV import path shipped, just never
-- resolved into an actual tree. Nullable with no default: a tenant that
-- never fills in manager_email gets every employee's manager_id null,
-- i.e. a fully flat organization -- the report-rollup logic (see
-- responseRepository.ts) treats that as "climb immediately to org-wide,"
-- so a flat startup and a real pyramid company are handled by the exact
-- same code path, not two special cases.
alter table identity.employees add column if not exists manager_id uuid references identity.employees(id);

-- Rollup climbs this chain per-request (WITH RECURSIVE) for a small
-- number of employees at a time (one manager's subtree), not a bulk
-- scan -- this index makes "who reports to X" cheap at that scale.
create index if not exists employees_manager_id_idx on identity.employees (manager_id);
