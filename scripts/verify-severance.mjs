import pg from "pg";

const { Pool } = pg;
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.log("DATABASE_URL not set; skipping Postgres severance verification.");
  process.exit(0);
}

const pool = new Pool({ connectionString: databaseUrl });

const forbiddenColumns = [
  "user_id",
  "employee_id",
  "email",
  "name",
  "provider_subject",
  "sso_subject",
  "ip_address",
  "user_agent",
  "invitation_id",
];

const forbiddenColumnResult = await pool.query(
  `select table_name, column_name
   from information_schema.columns
   where table_schema = 'responses'
     and column_name = any($1::text[])`,
  [forbiddenColumns],
);

const crossFkResult = await pool.query(
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
);

await pool.end();

if (forbiddenColumnResult.rowCount > 0 || crossFkResult.rowCount > 0) {
  console.error("Severance verification failed.");
  console.error({ forbiddenColumns: forbiddenColumnResult.rows, crossSchemaForeignKeys: crossFkResult.rows });
  process.exit(1);
}

console.log("Severance verification passed: no forbidden response identity columns and no responses -> identity foreign keys.");
