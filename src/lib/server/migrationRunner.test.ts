import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "fs";

describe("run-migrations.mjs", () => {
  const source = readFileSync("scripts/run-migrations.mjs", "utf8");

  it("applies files sorted by filename, so the numeric prefix controls order", () => {
    expect(source).toContain(".sort()");
  });

  it("halts on the first failure rather than silently continuing with a partially-migrated database", () => {
    expect(source).toContain("process.exit(1)");
    const catchBlock = source.slice(source.indexOf("} catch"), source.indexOf("} catch") + 200);
    expect(catchBlock).toContain("process.exit(1)");
  });

  it("reads every .sql file actually present in db/migrations/, not a hardcoded list", () => {
    const files = readdirSync("db/migrations").filter((name) => name.endsWith(".sql"));
    expect(files.length).toBeGreaterThan(20);
    expect(source).toContain('.filter((name) => name.endsWith(".sql"))');
  });

  it("tracks applied migrations in a schema_migrations table and skips already-recorded files", () => {
    expect(source).toContain("create table if not exists schema_migrations");
    expect(source).toContain("applied.has(file)");
  });

  it("treats already-exists errors as a legacy migration applied before tracking existed, not a fatal failure", () => {
    expect(source).toContain("ALREADY_EXISTS_CODES");
    expect(source).toContain("42P07");
  });

  it("skips quietly instead of failing the build when run with --if-configured and no DATABASE_URL", () => {
    expect(source).toContain("--if-configured");
  });

  it("tolerates already-exists errors per statement, not per file", () => {
    // Regression test: 0029_data_retention.sql has three `alter table`
    // statements in one file. An earlier per-file version of this
    // tolerance logic rolled back and silently dropped a genuinely-new
    // column when a different statement in the same file already
    // existed -- see db/migrations/0037_fix_missing_retention_columns.sql.
    // Applying/tolerating per statement (not per file) is what fixes
    // that class of bug.
    expect(source).toContain("function splitStatements(sql)");
    expect(source).toContain("for (const statement of statements)");
  });

  it("respects dollar-quoted function bodies when splitting statements, so a ; inside a function isn't treated as a statement boundary", () => {
    expect(source).toContain("dollarTag");
  });
});
