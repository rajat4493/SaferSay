// Applies every file in db/migrations/, in filename order, against a
// target database. Safe to re-run: a schema_migrations tracking table
// records which files have already been applied and skips them on
// subsequent runs. This is what lets the same script serve two call
// sites -- provisioning a brand-new, empty dedicated database for a
// tenant (dedicated-db provisioning flow, see
// identityRepository.ts's setDedicatedDatabaseUrl doc comment) and
// running automatically on every deploy against a database that
// already has some migrations applied.
//
// Legacy databases (prod/preview) already had 0001-0029 applied by
// hand before this tracking table existed. To backfill them without a
// manual bootstrap step, a migration that fails with a Postgres
// "already exists" class error (duplicate_table/duplicate_column/
// duplicate_object) is treated as already applied -- it's recorded and
// skipped rather than aborting the run. Any other failure still halts
// the run immediately, so a genuinely broken migration is never
// silently skipped.
import pg from "pg";
import { readdirSync, readFileSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";

const { Pool } = pg;

const args = process.argv.slice(2);
const ifConfigured = args.includes("--if-configured");
const targetUrl = args.find((arg) => !arg.startsWith("--")) || process.env.DATABASE_URL;
if (!targetUrl) {
  if (ifConfigured) {
    // Used as a build-time step (`npm run build`) where a local/CI build
    // may not have a DATABASE_URL at all -- skip quietly rather than
    // failing the build, since there's nothing to migrate against.
    console.log("run-migrations: no DATABASE_URL configured, skipping.");
    process.exit(0);
  }
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

// Postgres error codes for "this already exists" -- the signature of a
// legacy migration that was applied by hand before schema_migrations
// existed, not a real failure.
const ALREADY_EXISTS_CODES = new Set(["42P07", "42701", "42710"]);

await pool.query(
  "create table if not exists schema_migrations (filename text primary key, applied_at timestamptz not null default now())",
);
const { rows: appliedRows } = await pool.query("select filename from schema_migrations");
const applied = new Set(appliedRows.map((row) => row.filename));

let appliedCount = 0;
for (const file of files) {
  if (applied.has(file)) {
    continue;
  }
  const sql = readFileSync(path.join(migrationsDir, file), "utf8");
  const client = await pool.connect();
  let alreadyExists = false;
  await client.query("begin");
  try {
    await client.query(sql);
  } catch (error) {
    if (!ALREADY_EXISTS_CODES.has(error.code)) {
      console.error(`${file}: FAILED -- ${error.message}`);
      process.exit(1);
    }
    await client.query("rollback").catch(() => {});
    alreadyExists = true;
    console.log(`${file}: already applied (legacy) -- backfilling schema_migrations`);
    await client.query("begin");
  }
  await client.query("insert into schema_migrations (filename) values ($1)", [file]);
  await client.query("commit");
  if (!alreadyExists) console.log(`${file}: applied`);
  appliedCount += 1;
  client.release();
}

console.log(`Applied ${appliedCount} new migration(s); ${files.length - appliedCount} already up to date.`);
await pool.end();
