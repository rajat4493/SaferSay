-- Department-scoped counterpart to report_open_text_answers (0022),
-- modeled directly on report_question_scores_by_department (0021): same
-- SECURITY DEFINER pattern, same k-anonymity threshold semantics. Comments
-- were deliberately org-only until now (see getProtectedOpenTextReport's
-- old doc comment) because a department-scoped comment view is exactly
-- the differencing-attack shape department-scoped numeric reports already
-- have to guard against -- comments minus comments-excluding-one-team
-- reveals the excluded team's comments. The repository layer (see
-- responseRepository.ts's getProtectedOpenTextReport) now runs the same
-- getDepartmentReleasability complementary-suppression check department-
-- scoped numeric reports use, at the same (stricter, minGroupSize+3)
-- threshold text already requires, before ever calling this function.
create or replace function responses.report_open_text_answers_by_department(
  target_cycle_id uuid,
  department text,
  min_n integer
)
returns table (
  question_id uuid,
  n integer,
  protected boolean,
  text_value text
)
language sql
security definer
as $$
  with counts as (
    select a.question_id, count(*)::integer as n
    from responses.answers a
    join responses.submissions s on s.id = a.submission_id
    where s.cycle_id = target_cycle_id
      and s.segment_team = department
      and a.text_value is not null
      and a.text_value <> ''
    group by a.question_id
  )
  select
    a.question_id,
    c.n,
    c.n < min_n as protected,
    case when c.n >= min_n then a.text_value else null end as text_value
  from responses.answers a
  join responses.submissions s on s.id = a.submission_id
  join counts c on c.question_id = a.question_id
  where s.cycle_id = target_cycle_id
    and s.segment_team = department
    and a.text_value is not null
    and a.text_value <> '';
$$;

grant execute on function responses.report_open_text_answers_by_department(uuid, text, integer) to safersay_app;
