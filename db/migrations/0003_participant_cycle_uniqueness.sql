create unique index if not exists survey_participants_cycle_employee_key
  on identity.survey_participants (cycle_id, employee_id);
