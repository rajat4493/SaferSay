-- Snapshot the respondent's team at invite-issuance time rather than
-- joining identity.employees live at submission time -- an employee's team
-- (or the department itself) can change mid-cycle, which would otherwise
-- silently reshuffle anonymity groups after invites already went out.
-- issueTokens() writes this once; findIssuedToken() reads it back with no
-- join needed. This column lives in `identity`, not `responses`, so it's
-- outside responses.assert_no_identity_columns's forbidden-column scope
-- entirely -- it's still identity-schema data at this point, not yet
-- copied into the severed responses.submissions.segment_team column.
alter table identity.survey_participants add column if not exists team text;
