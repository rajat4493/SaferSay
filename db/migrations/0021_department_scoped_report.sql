-- Department-scoped protected report, modeled directly on
-- responses.report_question_scores (0001) and responses.report_question_trend
-- (0019): same SECURITY DEFINER pattern, same k-anonymity threshold
-- semantics (count(*) < min_n => protected/null). The anonymity gate
-- extends to this new granularity rather than being bypassed by it.
--
-- Note: listing distinct department names for a cycle does NOT need a
-- SECURITY DEFINER function here -- responses.submissions already has a
-- direct SELECT grant for safersay_app (0011_rls_tenant_isolation.sql), so
-- that read happens as a plain query in the repository layer. Only
-- responses.answers content needs the SECURITY DEFINER indirection.
create or replace function responses.report_question_scores_by_department(
  target_cycle_id uuid,
  department text,
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
    and s.segment_team = department
    and a.number_value is not null
  group by a.question_id;
$$;

grant execute on function responses.report_question_scores_by_department(uuid, text, integer) to safersay_app;
