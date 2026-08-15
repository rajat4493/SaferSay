-- Cross-cycle trend: per-cycle, per-question aggregation across a set of
-- cycles, reusing each cycle's own min_group_size (not a single global
-- threshold, since cycles can differ) -- same protection semantics as
-- responses.report_question_scores. Cross-cycle *matching* of questions by
-- normalized text (since edited templates get fresh question_ids per
-- cycle) happens in the application layer, not here: this function stays a
-- straightforward per-cycle aggregate, mirroring report_question_scores.
create or replace function responses.report_question_trend(
  target_tenant_id uuid,
  cycle_ids uuid[]
)
returns table (
  cycle_id uuid,
  question_id uuid,
  question_text text,
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
  group by s.cycle_id, a.question_id, q.question_text, c.min_group_size;
$$;

-- Same restricted-role access as report_question_scores() (0011): raw
-- responses.answers content is reachable only through this SECURITY
-- DEFINER function, never a direct grant on the table.
grant execute on function responses.report_question_trend(uuid, uuid[]) to safersay_app;
