-- Adds three new question types (multiple_choice, ranking, matrix) and
-- structural-only skip logic ("Option B" branching -- see plan history:
-- "Design thinking: survey branching vs. the k-anonymity engine"). Kept in
-- one migration since both touch template_questions/question_bank.
--
-- Branching is deliberately restricted to structural respondent attributes
-- (team/location -- the only two identity.employees columns that already
-- get snapshotted onto responses.submissions at invite time; there is no
-- role or tenure column in this schema) that the department-suppression
-- code already treats as a suppressible grouping key -- never a prior
-- answer. show_if is validated at the application layer (see the
-- /api/cycles/[id]/questions PATCH handler) to enforce that restriction;
-- the check constraint here only guards the JSON shape.

alter table responses.template_questions
  drop constraint template_questions_question_type_check;

alter table responses.template_questions
  add constraint template_questions_question_type_check
  check (question_type in ('likert_5', 'enps_0_10', 'open_text', 'multiple_choice', 'ranking', 'matrix'));

alter table responses.question_bank
  drop constraint question_bank_question_type_check;

alter table responses.question_bank
  add constraint question_bank_question_type_check
  check (question_type in ('scale', 'open_text', 'multiple_choice', 'ranking', 'matrix'));

-- Option list (multiple_choice/ranking) or rows-and-columns definition
-- (matrix) for the new question types. Null for likert/enps/open_text.
-- Shape is validated at the application layer, not the DB, matching how
-- question_text/construct are already app-validated free text.
alter table responses.template_questions add column options jsonb;
alter table responses.question_bank add column options jsonb;

-- Matrix questions are stored as one template_questions row per matrix
-- row-item (each behaving like a multiple_choice question against the
-- matrix's shared column set), tied together by matrix_group_id so the
-- report/builder/taker layers can render and tally them as one visual
-- grid. Null for every other question type.
alter table responses.template_questions add column matrix_group_id uuid;

-- Structural-only skip-logic condition: { "attribute": "team"|"location",
-- "op": "eq"|"neq", "value": text }. Never references a prior answer --
-- enforced at the application layer, not just documented, since the whole
-- point of Option B is that this can't quietly grow into opinion-based
-- branching later.
alter table responses.template_questions add column show_if jsonb;

-- location wasn't previously snapshotted at invite time the way team is
-- (0020_participant_team_snapshot.sql) -- only team was needed until now.
-- Branching on location needs the same snapshot-at-issuance guarantee: an
-- employee's location changing mid-cycle must not reshuffle who sees a
-- location-gated question after invites already went out.
alter table identity.survey_participants add column if not exists location text;

-- multiple_choice/ranking/matrix answers carry no scalar value of their
-- own -- their content lives entirely in responses.answer_options below,
-- referencing this row's id. Drop the old "must have a scalar" check;
-- the invariant becomes "has number_value, text_value, or at least one
-- answer_options row", which is app-enforced in submitAnswers (the same
-- place the old invariant was enforced from, in practice -- the DB check
-- only ever caught what the app already guaranteed).
alter table responses.answers drop constraint answers_check;

-- Multi-value answers (multiple_choice = one row per selected option, no
-- rank; ranking = one row per option with its rank; matrix = one row per
-- sub-question option, using question_id for the sub-question). Kept
-- alongside responses.answers.number_value/text_value rather than
-- replacing them -- existing scalar types are untouched.
create table responses.answer_options (
  id uuid primary key,
  answer_id uuid not null references responses.answers(id),
  option_key text not null,
  rank integer,
  created_at timestamptz not null default now()
);

alter table responses.answer_options enable row level security;

-- Mirrors responses.answers' own RLS posture (0013): no tenant_id column
-- of its own (scoped indirectly via answer_id -> answers.submission_id ->
-- submissions.tenant_id), no direct SELECT grant -- raw option picks are
-- only reachable through a SECURITY DEFINER report function, never a
-- direct table grant. INSERT-only, relying on submissions' own tenant-
-- scoped RLS having already gated creation of the row this references.
grant insert on responses.answer_options to safersay_app;

create policy respondent_submit on responses.answer_options
  for insert
  with check (true);

create index answer_options_answer_idx on responses.answer_options (answer_id);

-- Per-option tallies for multiple_choice/ranking/matrix, gated by the same
-- k-anonymity threshold as report_question_scores() (0001) -- but applied
-- per OPTION, not per question: one respondent picking a rare option is as
-- identifying as a numeric outlier, so each option's own pick-count must
-- clear min_n independently, not just the question's total respondent
-- count. avg_rank is only meaningful for ranking questions; null for
-- multiple_choice/matrix picks (callers ignore it there).
create or replace function responses.report_option_tallies(
  target_cycle_id uuid,
  min_n integer
)
returns table (
  question_id uuid,
  option_key text,
  n integer,
  avg_rank numeric,
  protected boolean
)
language sql
security definer
as $$
  with counts as (
    select
      a.question_id,
      ao.option_key,
      count(*)::integer as n,
      avg(ao.rank) as avg_rank
    from responses.answer_options ao
    join responses.answers a on a.id = ao.answer_id
    join responses.submissions s on s.id = a.submission_id
    where s.cycle_id = target_cycle_id
    group by a.question_id, ao.option_key
  )
  select
    question_id,
    option_key,
    n,
    case when n >= min_n then avg_rank else null end as avg_rank,
    n < min_n as protected
  from counts;
$$;

grant execute on function responses.report_option_tallies(uuid, integer) to safersay_app;
