create schema if not exists identity;
create schema if not exists responses;

create table identity.tenants (
  id uuid primary key,
  name text not null,
  logo_url text,
  created_at timestamptz not null default now()
);

create table identity.users (
  id uuid primary key,
  tenant_id uuid not null references identity.tenants(id),
  auth_provider text not null,
  provider_subject text not null,
  email text not null,
  name text,
  role text not null check (role in ('owner', 'admin', 'employee')),
  created_at timestamptz not null default now(),
  unique (auth_provider, provider_subject)
);

create table identity.employees (
  id uuid primary key,
  tenant_id uuid not null references identity.tenants(id),
  email text not null,
  name text,
  team text,
  location text,
  employment_status text not null default 'active',
  created_at timestamptz not null default now(),
  unique (tenant_id, email)
);

create table identity.survey_participants (
  id uuid primary key,
  tenant_id uuid not null references identity.tenants(id),
  cycle_id uuid not null,
  employee_id uuid not null references identity.employees(id),
  token_hash text not null unique,
  token_status text not null check (token_status in ('issued', 'spent', 'revoked')),
  issued_at timestamptz not null,
  spent_at timestamptz,
  last_reminded_at timestamptz,
  reminder_count integer not null default 0
);

create table identity.billing_accounts (
  tenant_id uuid primary key references identity.tenants(id),
  stripe_customer_id text,
  floor_plan_status text not null default 'inactive' check (floor_plan_status in ('inactive', 'active', 'canceled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table identity.cycle_payments (
  id uuid primary key,
  tenant_id uuid not null references identity.tenants(id),
  cycle_id uuid not null,
  stripe_checkout_session_id text unique,
  status text not null check (status in ('unpaid', 'pending', 'paid', 'refunded')),
  amount_minor integer not null,
  currency text not null,
  created_at timestamptz not null default now(),
  paid_at timestamptz
);

create table responses.survey_templates (
  id uuid primary key,
  slug text unique not null,
  name text not null,
  description text not null,
  category text not null,
  estimated_minutes integer not null,
  is_active boolean not null default true
);

create table responses.template_questions (
  id uuid primary key,
  template_id uuid not null references responses.survey_templates(id),
  position integer not null,
  question_text text not null,
  question_type text not null check (question_type in ('likert_5', 'enps_0_10', 'open_text')),
  construct text,
  is_optional boolean not null default false,
  unique (template_id, position)
);

create table responses.survey_cycles (
  id uuid primary key,
  tenant_id uuid not null,
  template_id uuid not null references responses.survey_templates(id),
  name text not null,
  status text not null check (status in ('draft', 'scheduled', 'open', 'closed')),
  payment_status text not null default 'unpaid' check (payment_status in ('unpaid', 'pending', 'paid', 'free_preview')),
  opens_at timestamptz,
  closes_at timestamptz,
  min_group_size integer not null default 5 check (min_group_size >= 5),
  created_at timestamptz not null default now()
);

create table responses.submissions (
  id uuid primary key,
  tenant_id uuid not null,
  cycle_id uuid not null references responses.survey_cycles(id),
  spent_token_hash text not null unique,
  submitted_at_bucket date not null,
  segment_team text,
  segment_location text,
  created_at timestamptz not null default now()
);

create table responses.answers (
  id uuid primary key,
  submission_id uuid not null references responses.submissions(id),
  question_id uuid not null references responses.template_questions(id),
  number_value numeric,
  text_value text,
  created_at timestamptz not null default now(),
  check (number_value is not null or text_value is not null)
);

create or replace view responses.question_scores as
select
  s.tenant_id,
  s.cycle_id,
  a.question_id,
  count(*)::integer as n,
  case when count(*) >= 5 then avg(a.number_value) else null end as average,
  count(*) < 5 as protected
from responses.answers a
join responses.submissions s on s.id = a.submission_id
where a.number_value is not null
group by s.tenant_id, s.cycle_id, a.question_id;

create or replace function responses.report_question_scores(
  target_cycle_id uuid,
  min_n integer default 5
)
returns table (
  question_id uuid,
  n integer,
  average numeric,
  protected boolean
)
language sql
security definer
as $$
  select
    a.question_id,
    count(*)::integer as n,
    case when count(*) >= min_n then avg(a.number_value) else null end as average,
    count(*) < min_n as protected
  from responses.answers a
  join responses.submissions s on s.id = a.submission_id
  where s.cycle_id = target_cycle_id
    and a.number_value is not null
  group by a.question_id;
$$;

create or replace function responses.assert_no_identity_columns()
returns event_trigger
language plpgsql
as $$
declare
  forbidden text[] := array[
    'user_id',
    'employee_id',
    'email',
    'employee_name',
    'respondent_name',
    'provider_subject',
    'sso_subject',
    'ip_address',
    'user_agent',
    'invitation_id'
  ];
  offending record;
begin
  select table_schema, table_name, column_name
  into offending
  from information_schema.columns
  where table_schema = 'responses'
    and column_name = any(forbidden)
  limit 1;

  if found then
    raise exception 'Forbidden identity column %.%:% in responses schema',
      offending.table_schema,
      offending.table_name,
      offending.column_name;
  end if;
end;
$$;

drop event trigger if exists response_identity_column_guard;
create event trigger response_identity_column_guard
  on ddl_command_end
  execute function responses.assert_no_identity_columns();

alter table identity.tenants enable row level security;
alter table identity.users enable row level security;
alter table identity.employees enable row level security;
alter table identity.survey_participants enable row level security;
alter table identity.billing_accounts enable row level security;
alter table identity.cycle_payments enable row level security;
alter table responses.survey_templates enable row level security;
alter table responses.template_questions enable row level security;
alter table responses.survey_cycles enable row level security;
alter table responses.submissions enable row level security;
alter table responses.answers enable row level security;
