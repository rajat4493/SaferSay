// Applies every file in db/migrations/, in filename order, against a
// target database. For provisioning a tenant's dedicated database (target
// = that tenant's own connection string, invoked from the dedicated-DB
// provisioning flow -- see identityRepository.ts's setDedicatedDatabaseUrl
// doc comment). Requires a genuinely empty target database: 0001 does
// plain `create table` (no `if not exists`), so re-running the full set
// against a database that already has some (but not all) migrations
// applied will fail on the first already-applied statement -- this is a
// one-shot provisioning tool, not an idempotent "sync" command.
import pg from "pg";
import { readdirSync, readFileSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";

const { Pool } = pg;

const targetUrl = process.argv[2] || process.env.DATABASE_URL;
if (!targetUrl) {
  console.error("Usage: node scripts/run-migrations.mjs <target-database-url>  (or set DATABASE_URL)");
  process.exit(1);
}

const migrationsDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "db", "migrations");
const files = readdirSync(migrationsDir)
  .filter((name) => name.endsWith(".sql"))
  .sort();

const pool = new Pool({
  connectionString: targetUrl,
  ssl: targetUrl.includes("supabase.com") ? { rejectUnauthorized: false } : undefined,
});

for (const file of files) {
  const sql = readFileSync(path.join(migrationsDir, file), "utf8");
  try {
    await pool.query(sql);
    console.log(`${file}: applied`);
  } catch (error) {
    console.error(`${file}: FAILED -- ${error.message}`);
    await pool.end();
    process.exit(1);
  }
}

console.log(`Applied ${files.length} migrations.`);
await pool.end();
