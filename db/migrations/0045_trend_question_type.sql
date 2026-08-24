-- Widens report_question_trend (0019) to also return question_type -- the
-- Overview dashboard's "Change vs Last Survey" sparkline (see
-- getCrossCycleTrendForTenant/overview/page.tsx) needs to average a
-- cycle's questions onto a common 0-10 scale before averaging across
-- questions of different types (likert_5 vs enps_0_10), the same
-- normalization reportThemes.ts already applies to a single cycle's
-- report rows. Without scaleMax, a per-cycle overall average would treat
-- an enps_0_10 answer of "8" as identical in weight to a likert_5 answer
-- of "8" (twice the real proportion), silently skewing any cycle that
-- mixes question types (e.g. the enps-pulse template). Additive only --
-- same query, same grouping, one more selected/grouped column from the
-- template_questions join this function already has.
-- Postgres won't let create-or-replace change a function's return table
-- shape in place -- drop and recreate.
drop function if exists responses.report_question_trend(uuid, uuid[]);

create function responses.report_question_trend(
  target_tenant_id uuid,
  cycle_ids uuid[]
)
returns table (
  cycle_id uuid,
  question_id uuid,
  question_text text,
  question_type text,
  n integer,
  average numeric,
  protected boolean
)
language sql
security definer
as $$
  select
    s.cycle_id,
    a.question_id,
    q.question_text,
    q.question_type,
    count(*)::integer as n,
    case when count(*) >= c.min_group_size then avg(a.number_value) else null end as average,
    count(*) < c.min_group_size as protected
  from responses.answers a
  join responses.submissions s on s.id = a.submission_id
  join responses.survey_cycles c on c.id = s.cycle_id
  join responses.template_questions q on q.id = a.question_id
  where s.cycle_id = any(cycle_ids)
    and c.tenant_id = target_tenant_id
    and a.number_value is not null
  group by s.cycle_id, a.question_id, q.question_text, q.question_type, c.min_group_size;
$$;

grant execute on function responses.report_question_trend(uuid, uuid[]) to safersay_app;
