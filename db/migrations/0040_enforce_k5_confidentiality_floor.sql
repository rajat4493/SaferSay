-- Launch privacy rule: every protected-report path uses k >= 5. Normalize
-- legacy settings/cycles before restoring the database constraints.

update identity.tenant_settings
set default_min_group_size = 5
where default_min_group_size < 5;

update responses.survey_cycles
set min_group_size = 5
where min_group_size < 5;

alter table identity.tenant_settings
  drop constraint if exists tenant_settings_default_min_group_size_check,
  add constraint tenant_settings_default_min_group_size_check
    check (default_min_group_size >= 5);

alter table responses.survey_cycles
  drop constraint if exists survey_cycles_min_group_size_check,
  add constraint survey_cycles_min_group_size_check
    check (min_group_size >= 5);
