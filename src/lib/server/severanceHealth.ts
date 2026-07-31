import type { Pool } from "pg";

const forbiddenResponseColumns = [
  "user_id",
  "employee_id",
  "email",
  "employee_name",
  "respondent_name",
  "provider_subject",
  "sso_subject",
  "ip_address",
  "user_agent",
  "invitation_id",
];

type HealthRow = {
  schema_name?: string;
  table_schema?: string;
  table_name?: string;
  column_name?: string;
  relrowsecurity?: boolean;
  foreign_table_schema?: string;
  foreign_table_name?: string;
};

export type SeveranceHealthCheck = {
  key: string;
  label: string;
  ok: boolean;
  detail: string;
  evidence?: HealthRow[];
};

export type SeveranceHealth = {
  ok: boolean;
  checkedAt: string;
  checks: SeveranceHealthCheck[];
};

const rlsTables = [
  ["identity", "tenants"],
  ["identity", "users"],
  ["identity", "employees"],
  ["identity", "survey_participants"],
  ["identity", "invite_outbox"],
  ["identity", "billing_accounts"],
  ["identity", "cycle_payments"],
  ["identity", "tenant_settings"],
  ["responses", "survey_templates"],
  ["responses", "template_questions"],
  ["responses", "survey_cycles"],
  ["responses", "submissions"],
  ["responses", "answers"],
];

export async function runSeveranceHealthCheck(pool: Pool): Promise<SeveranceHealth> {
  const [schemaResult, forbiddenColumnResult, crossFkResult, rlsResult] = await Promise.all([
    pool.query<HealthRow>(
      `select schema_name
       from information_schema.schemata
       where schema_name = any($1::text[])`,
      [["identity", "responses"]],
    ),
    pool.query<HealthRow>(
      `select table_name, column_name
       from information_schema.columns
       where table_schema = 'responses'
         and column_name = any($1::text[])`,
      [forbiddenResponseColumns],
    ),
    pool.query<HealthRow>(
      `select
          tc.table_schema,
          tc.table_name,
          ccu.table_schema as foreign_table_schema,
          ccu.table_name as foreign_table_name
       from information_schema.table_constraints tc
       join information_schema.constraint_column_usage ccu
         on ccu.constraint_name = tc.constraint_name
       where tc.constraint_type = 'FOREIGN KEY'
         and tc.table_schema = 'responses'
         and ccu.table_schema = 'identity'`,
    ),
    pool.query<HealthRow>(
      `select n.nspname as table_schema, c.relname as table_name, c.relrowsecurity
       from pg_class c
       join pg_namespace n on n.oid = c.relnamespace
       where (n.nspname, c.relname) in (${rlsTables.map((_, index) => `($${index * 2 + 1}, $${index * 2 + 2})`).join(", ")})`,
      rlsTables.flat(),
    ),
  ]);

  const schemas = new Set(schemaResult.rows.map((row) => row.schema_name));
  const missingSchemas = ["identity", "responses"].filter((schema) => !schemas.has(schema));
  const rlsRowsByKey = new Map(rlsResult.rows.map((row) => [`${row.table_schema}.${row.table_name}`, row]));
  const missingOrUnsafeRlsTables = rlsTables
    .map(([schema, table]) => `${schema}.${table}`)
    .filter((key) => rlsRowsByKey.get(key)?.relrowsecurity !== true);

  const checks: SeveranceHealthCheck[] = [
    {
      key: "schemas",
      label: "Identity and response schemas",
      ok: missingSchemas.length === 0,
      detail: missingSchemas.length === 0 ? "Both severed schemas exist." : `Missing schemas: ${missingSchemas.join(", ")}.`,
    },
    {
      key: "response_identity_columns",
      label: "No identity columns in responses",
      ok: forbiddenColumnResult.rowCount === 0,
      detail:
        forbiddenColumnResult.rowCount === 0
          ? "Responses schema has no forbidden personal identity columns."
          : "Forbidden personal identity columns were found in responses.",
      evidence: forbiddenColumnResult.rows,
    },
    {
      key: "response_identity_foreign_keys",
      label: "No response-to-identity joins",
      ok: crossFkResult.rowCount === 0,
      detail:
        crossFkResult.rowCount === 0
          ? "Responses schema has no foreign keys back to identity schema."
          : "Responses schema has foreign keys back to identity schema.",
      evidence: crossFkResult.rows,
    },
    {
      key: "rls_enabled",
      label: "RLS enabled on protected tables",
      ok: missingOrUnsafeRlsTables.length === 0,
      detail:
        missingOrUnsafeRlsTables.length === 0
          ? "All expected identity and response tables have row-level security enabled."
          : `RLS missing or disabled on: ${missingOrUnsafeRlsTables.join(", ")}.`,
    },
  ];

  return {
    ok: checks.every((check) => check.ok),
    checkedAt: new Date().toISOString(),
    checks,
  };
}
