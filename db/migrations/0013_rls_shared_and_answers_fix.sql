-- Fixes two real gaps surfaced by testing 0011/0012 against the live app
-- (not just isolated scripts): RLS was enabled with zero policies on
-- responses.survey_templates/template_questions/answers since the very
-- first migration (0001) -- this is the exact pre-existing problem
-- SAFERSAY_CONFIDENTIALITY.md describes ("RLS enabled on some tables but
-- no policies are defined"), silently denying everything for any
-- non-owner role. It never surfaced before because the app has always
-- connected as a superuser/owner role that bypasses RLS entirely.

-- survey_templates/template_questions are shared reference data (question
-- text/config, not identity or response content -- see
-- surveyCycleService.ts), with no tenant_id column to scope a policy on.
-- RLS doesn't apply here by design; the table-level GRANT (0011/0012) is
-- the actual control.
alter table responses.survey_templates disable row level security;
alter table responses.template_questions disable row level security;

-- responses.answers has no tenant_id of its own (scoped indirectly via
-- submission_id -> submissions.tenant_id, which IS RLS-protected). Direct
-- SELECT stays ungranted (raw answers are only reachable through the
-- SECURITY DEFINER report_question_scores()), but INSERT must be allowed
-- for the respondent submission flow -- the submission it references can
-- only exist because submissions' own tenant-scoped RLS already let it be
-- created in this same transaction.
drop policy if exists respondent_submit on responses.answers;
create policy respondent_submit on responses.answers
  for insert
  with check (true);
