-- Recurring surveys: an admin sets a cadence once instead of manually
-- creating (and optionally sending) a new cycle from the same template
-- every quarter/month. Runs off a new cron entry (see vercel.json),
-- following the exact same pattern as retention-purge
-- (/api/internal/cycle-scheduler, Authorization: Bearer $CRON_SECRET).
--
-- template_slug (not a survey_templates.id foreign key) matches the same
-- identifier createTenantSurveyCycle already takes -- one of the 4 fixed
-- template slugs in src/lib/templates.ts. A custom cycle-scoped template
-- (created via the question builder) gets a fresh id per cycle and has no
-- stable slug to recur from; recurrence is only offered for an
-- unmodified base template, which the builder UI enforces.
create table responses.survey_recurrences (
  id uuid primary key,
  tenant_id uuid not null,
  template_slug text not null,
  interval text not null check (interval in ('weekly', 'monthly', 'quarterly')),
  -- Send invites automatically once the cycle is created, vs. leaving it
  -- as a draft for an admin to review and send by hand.
  auto_send boolean not null default false,
  next_run_at timestamptz not null,
  created_at timestamptz not null default now(),
  disabled_at timestamptz
);

alter table responses.survey_recurrences enable row level security;

grant select, insert, update, delete on responses.survey_recurrences to safersay_app;

create policy tenant_isolation on responses.survey_recurrences
  using (tenant_id = current_setting('app.current_tenant_id', true)::uuid)
  with check (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

-- The scheduler cron job queries across every tenant on the privileged
-- pool (same reasoning as retention-purge), scanning for what's due.
create index survey_recurrences_due_idx on responses.survey_recurrences (next_run_at) where disabled_at is null;
