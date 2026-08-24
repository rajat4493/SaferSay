-- People Leader: a fifth role scoped to just one manager's reporting
-- subtree, reusing the manager_id hierarchy already built for the (later
-- removed, now reintroduced with a guard) manager-rollup feature -- see
-- responseRepository.ts's team-scope branch and
-- IdentityRepository.getSubtreeTeamLabels.
--
-- people_leader_root_employee_id is the identity.employees row this user
-- is scoped to -- nullable so the constraint can be added before every
-- people_leader user has one assigned (there are none yet), but the
-- application layer (see permissions.ts / /api/report) never lets a
-- people_leader without an assigned root see anything -- no root means no
-- report, never a fallback to org-wide.
alter table identity.users drop constraint if exists users_role_check;

alter table identity.users
  add constraint users_role_check
  check (role in ('customer_admin', 'survey_creator', 'auditor', 'employee', 'people_leader'));

alter table identity.users add column if not exists people_leader_root_employee_id uuid references identity.employees(id);
