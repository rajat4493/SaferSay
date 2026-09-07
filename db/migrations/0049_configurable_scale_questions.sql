-- Adds a tenant-configurable numeric scale question type ("scale"), on top
-- of the two fixed built-in scales (likert_5, enps_0_10). Its range and
-- optional anchor labels are stored in the already-existing
-- template_questions.options jsonb column (added in 0030 for
-- multiple_choice/ranking/matrix) as { min, max, lowLabel?, highLabel? } --
-- see src/lib/scaleRange.ts, the single place that shape is read.
alter table responses.template_questions
  drop constraint template_questions_question_type_check;

alter table responses.template_questions
  add constraint template_questions_question_type_check
  check (question_type in ('likert_5', 'enps_0_10', 'open_text', 'multiple_choice', 'ranking', 'matrix', 'scale'));

-- report_question_trend (0045) needs the question's options too, so the
-- Overview trend line can resolve a "scale" question's real min/max
-- instead of falling back to a default range. Postgres won't let
-- create-or-replace change a function's return shape -- drop and recreate,
-- same as 0045 did.
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
  options jsonb,
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
    q.options,
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
  group by s.cycle_id, a.question_id, q.question_text, q.question_type, q.options, c.min_group_size;
$$;

grant execute on function responses.report_question_trend(uuid, uuid[]) to safersay_app;
