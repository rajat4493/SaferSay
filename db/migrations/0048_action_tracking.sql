-- The tenant-wide action-tracking posture (recognize/recommend always on;
-- turning recognitions into tracked, trackable commitments is opt-in) and
-- the schema change that lets a cycle carry more than one commitment.
--
-- cycle_commitments previously had `unique (tenant_id, cycle_id)` --
-- exactly one public commitment per survey cycle. That was fine for the
-- single "You said / We will" statement it was built for, but blocks
-- turning individual AI Synthesis recommendations into separate tracked
-- items. Dropping it (the table's own `id` stays the real primary key,
-- so this is purely a widening, not a structural rewrite) lets a cycle
-- carry any number of commitments, each independently trackable.
alter table identity.cycle_commitments drop constraint if exists cycle_commitments_tenant_id_cycle_id_key;

-- Which recommendation a commitment came from, if any -- 'insight' means
-- a customer_admin turned an AI Synthesis quick-win/strategic-work/next-
-- action suggestion into a tracked commitment with one click; 'manual'
-- (the default, matching every commitment created before this column
-- existed) means they wrote it themselves.
alter table identity.cycle_commitments add column if not exists source text not null default 'manual' check (source in ('manual', 'insight'));

-- 'insights_only' (default): every tenant already gets free recognition
-- and recommendations (see /api/report/insights) with nothing to track --
-- purely informational, closest to today's shipped behavior.
-- 'tracked': commitments become trackable (owner marks them in-progress/
-- complete, publishes progress updates) -- opt-in, the tenant's choice.
-- 'tracked_with_rollup': adds an org-wide view of every commitment's
-- status across cycles, visible to customer_admin only -- never an
-- enforcement mechanism, just visibility the workspace owner opted into
-- for their own use.
alter table identity.tenant_settings add column if not exists action_mode text not null default 'insights_only' check (action_mode in ('insights_only', 'tracked', 'tracked_with_rollup'));
