-- Open-text answers, protected by the same k-anonymity gate as numeric
-- scores (responses.report_question_scores, 0001), just called with a
-- stricter min_n -- a sentence of free text is more identifying than a
-- number, so the app layer always passes minGroupSize + 3 here, never the
-- bare numeric threshold. No new column needed: the threshold is computed
-- in ResponseRepository.getProtectedOpenTextReport, not stored, so there's
-- nothing to keep in sync when a cycle's min_group_size changes.
create or replace function responses.report_open_text_answers(
  target_cycle_id uuid,
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
    and a.text_value is not null
    and a.text_value <> '';
$$;

-- Same restricted-role access as report_question_scores() (0011): raw
-- responses.answers content is reachable only through this SECURITY
-- DEFINER function, never a direct grant on the table.
grant execute on function responses.report_open_text_answers(uuid, integer) to safersay_app;
