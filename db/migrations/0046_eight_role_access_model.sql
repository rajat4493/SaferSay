-- The customer-facing eight-persona model has seven tenant-side roles plus
-- employee/respondent. Platform SuperAdmin remains an application-level,
-- allowlisted capability and is intentionally not stored in identity.users.
alter table identity.users drop constraint if exists users_role_check;

alter table identity.users
  add constraint users_role_check
  check (role in (
    'customer_admin',
    'survey_creator',
    'auditor',
    'people_leader',
    'integration_admin',
    'compliance_reviewer',
    'employee'
  ));

alter table identity.pending_invites drop constraint if exists pending_invites_role_check;

alter table identity.pending_invites
  add constraint pending_invites_role_check
  check (role in (
    'customer_admin',
    'survey_creator',
    'auditor',
    'integration_admin',
    'compliance_reviewer'
  ));
