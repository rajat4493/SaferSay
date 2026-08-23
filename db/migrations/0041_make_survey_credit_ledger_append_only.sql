-- A credit may move exactly once: unused -> consumed for one cycle. The app
-- role retains UPDATE only for that transition; this trigger prevents it
-- from re-crediting, re-dating, or otherwise rewriting a paid ledger row.

create or replace function identity.enforce_survey_credit_immutability()
returns trigger
language plpgsql
security definer
set search_path = identity, pg_temp
as $$
begin
  if new.id is distinct from old.id
     or new.tenant_id is distinct from old.tenant_id
     or new.source_reference is distinct from old.source_reference
     or new.source_position is distinct from old.source_position
     or new.employee_band is distinct from old.employee_band
     or new.expires_at is distinct from old.expires_at
     or new.created_at is distinct from old.created_at then
    raise exception 'survey credit ledger fields are immutable';
  end if;

  if old.consumed_at is null
     and new.consumed_at is not null
     and old.cycle_id is null
     and new.cycle_id is not null then
    return new;
  end if;

  raise exception 'survey credits can only transition once from unused to consumed';
end;
$$;

drop trigger if exists survey_credit_immutability on identity.survey_credits;
create trigger survey_credit_immutability
before update on identity.survey_credits
for each row execute function identity.enforce_survey_credit_immutability();
