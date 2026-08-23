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
// manual bootstrap step, each file is split into its individual
// top-level statements (see splitStatements below) and applied one at
// a time, in its own transaction -- a statement that fails with a
// Postgres "already exists" class error (duplicate_table/
// duplicate_column/duplicate_object) is treated as already applied by
// hand and skipped, while the rest of the file's statements still run.
// This is deliberately per-statement, not per-file: a file can contain
// a mix of already-applied and genuinely-new statements (this bit a
// real deploy once -- 0029_data_retention.sql has three `alter table`
// statements in one file, and an earlier per-file version of this
// script silently dropped a new column when a different statement in
// the same file turned out to already exist). Any other error still
// halts the run immediately, so a genuinely broken migration is never
// silently skipped. If a file fails partway through, it's simply not
// recorded as applied -- the next run retries it, and the statements
// that already succeeded are themselves now "already exists" and get
// tolerated, so this is self-healing across retries.
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

// Splits a migration file into individual top-level SQL statements, on
// semicolons -- but not semicolons inside a single-quoted string or a
// dollar-quoted function body ($$...$$ / $tag$...$tag$, used by this
// repo's SECURITY DEFINER functions), and skipping over `--` line
// comments so a semicolon in a comment doesn't split anything either.
function splitStatements(sql) {
  const statements = [];
  let current = "";
  let dollarTag = null;
  let i = 0;
  while (i < sql.length) {
    if (dollarTag) {
      const closeIndex = sql.indexOf(dollarTag, i);
      if (closeIndex === -1) {
        current += sql.slice(i);
        i = sql.length;
      } else {
        current += sql.slice(i, closeIndex + dollarTag.length);
        i = closeIndex + dollarTag.length;
        dollarTag = null;
      }
      continue;
    }
    const char = sql[i];
    if (char === "$") {
      const match = /^\$[a-zA-Z_]*\$/.exec(sql.slice(i));
      if (match) {
        dollarTag = match[0];
        current += dollarTag;
        i += dollarTag.length;
        continue;
      }
    }
    if (char === "'") {
      current += char;
      i += 1;
      while (i < sql.length) {
        current += sql[i];
        if (sql[i] === "'") {
          if (sql[i + 1] === "'") {
            current += sql[i + 1];
            i += 2;
            continue;
          }
          i += 1;
          break;
        }
        i += 1;
      }
      continue;
    }
    if (char === "-" && sql[i + 1] === "-") {
      const endOfLine = sql.indexOf("\n", i);
      const end = endOfLine === -1 ? sql.length : endOfLine + 1;
      current += sql.slice(i, end);
      i = end;
      continue;
    }
    if (char === ";") {
      current += char;
      const trimmed = current.trim();
      if (trimmed) statements.push(trimmed);
      current = "";
      i += 1;
      continue;
    }
    current += char;
    i += 1;
  }
  const trimmed = current.trim();
  if (trimmed) statements.push(trimmed);
  return statements;
}

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
  const statements = splitStatements(readFileSync(path.join(migrationsDir, file), "utf8"));
  let anyAlreadyExisted = false;
  for (const statement of statements) {
    const client = await pool.connect();
    try {
      await client.query("begin");
      await client.query(statement);
      await client.query("commit");
    } catch (error) {
      if (!ALREADY_EXISTS_CODES.has(error.code)) {
        console.error(`${file}: FAILED -- ${error.message}`);
        process.exit(1);
      }
      await client.query("rollback").catch(() => {});
      anyAlreadyExisted = true;
    } finally {
      client.release();
    }
  }
  await pool.query("insert into schema_migrations (filename) values ($1)", [file]);
  console.log(anyAlreadyExisted ? `${file}: applied (some statements already existed)` : `${file}: applied`);
  appliedCount += 1;
}

console.log(`Applied ${appliedCount} new migration(s); ${files.length - appliedCount} already up to date.`);
await pool.end();
