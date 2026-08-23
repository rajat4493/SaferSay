-- Array counterpart to report_question_scores_by_department (0021): a
-- manager-hierarchy rollup needs to aggregate several team labels at
-- once (a manager's own team plus every team in their reporting subtree
-- -- see responseRepository.ts's getManagerRollupReport), not one. Same
-- SECURITY DEFINER pattern, same threshold semantics.
create or replace function responses.report_question_scores_by_departments(
  target_cycle_id uuid,
  departments text[],
  min_n integer default 5
)
returns table (
  question_id uuid,
  n integer,
  average numeric,
  protected boolean
)
language sql
security definer
as $$
  select
    a.question_id,
    count(*)::integer as n,
    case when count(*) >= min_n then avg(a.number_value) else null end as average,
    count(*) < min_n as protected
  from responses.answers a
  join responses.submissions s on s.id = a.submission_id
  where s.cycle_id = target_cycle_id
    and s.segment_team = any(departments)
    and a.number_value is not null
  group by a.question_id;
$$;

grant execute on function responses.report_question_scores_by_departments(uuid, text[], integer) to safersay_app;
