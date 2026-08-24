-- eNPS promoter/passive/detractor scoring for enps_0_10 questions.
-- Today enps_0_10 is just a 0-10 numeric scale averaged like any other
-- question (report_question_scores, 0001) -- there is no promoter
-- (9-10) / passive (7-8) / detractor (0-6) classification anywhere. This
-- adds that as a second, purpose-built aggregation, following the exact
-- suppression shape report_option_tallies (0030) already established for
-- per-bucket counts: each bucket's own respondent count must clear min_n
-- independently, not just the question's total -- a single detractor is as
-- identifying as a single rare option pick. A bucket that doesn't clear
-- the threshold is dropped from the result entirely (never zeroed), same
-- "missing, not zero" rule report_option_tallies follows, so a suppressed
-- bucket can't be inferred by elimination against the other two.
create or replace function responses.report_enps_buckets(
  target_cycle_id uuid,
  min_n integer default 5
)
returns table (
  question_id uuid,
  bucket text,
  n integer,
  protected boolean
)
language sql
security definer
as $$
  with counts as (
    select
      a.question_id,
      case
        when a.number_value >= 9 then 'promoter'
        when a.number_value >= 7 then 'passive'
        else 'detractor'
      end as bucket,
      count(*)::integer as n
    from responses.answers a
    join responses.submissions s on s.id = a.submission_id
    where s.cycle_id = target_cycle_id
      and a.number_value is not null
    group by a.question_id, 2
  )
  select question_id, bucket, n, n < min_n as protected
  from counts;
$$;

grant execute on function responses.report_enps_buckets(uuid, integer) to safersay_app;
