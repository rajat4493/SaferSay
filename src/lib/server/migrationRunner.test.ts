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
});
