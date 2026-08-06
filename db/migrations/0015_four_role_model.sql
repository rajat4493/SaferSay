-- Fixes a real gap between the four-role model shipped in application code
-- (customer_admin | survey_creator | auditor | employee -- see
-- src/lib/server/repositories/types.ts) and the database, which still only
-- allowed the old three roles (owner | admin | employee). Since that
-- change landed, every new signup has been failing this check constraint
-- (createUser inserts role='customer_admin'), and every existing user's
-- real role='owner' row no longer matches any `role === "customer_admin"`
-- check in the app -- silently breaking Workspace/People nav visibility
-- and the RoleTag label for every existing tenant.

-- Drop the old constraint before backfilling -- 'customer_admin' isn't in
-- its allowed set, so the UPDATE below would violate it otherwise.
alter table identity.users drop constraint if exists users_role_check;

update identity.users set role = 'customer_admin' where role = 'owner';
update identity.users set role = 'survey_creator' where role = 'admin';

alter table identity.users
  add constraint users_role_check
  check (role in ('customer_admin', 'survey_creator', 'auditor', 'employee'));
