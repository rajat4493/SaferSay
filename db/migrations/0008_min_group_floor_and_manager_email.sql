-- Lower the min_group_size hard floor from 5 to 3 (never below 3, per
-- SAFERSAY_FINAL_ARCHITECTURE.md §3). A 10-person startup with 3-person
-- teams needs headroom below the old floor; 3 is still a real confidentiality
-- guarantee, 1 or 2 would not be.
alter table responses.survey_cycles
  drop constraint survey_cycles_min_group_size_check;
alter table responses.survey_cycles
  add constraint survey_cycles_min_group_size_check check (min_group_size >= 3);

alter table identity.tenant_settings
  drop constraint tenant_settings_default_min_group_size_check;
alter table identity.tenant_settings
  add constraint tenant_settings_default_min_group_size_check check (default_min_group_size >= 3);

-- Capture manager_email now even though Manager/Team scope is v1.1 -- the
-- CSV import already has all employees in front of the admin once; asking
-- every customer to re-upload later just to add this column is avoidable
-- pain. Column is unused by any query today.
alter table identity.employees add column if not exists manager_email text;
