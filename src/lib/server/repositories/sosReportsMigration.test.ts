import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";

describe("sos_reports migration", () => {
  const migration = readFileSync("db/migrations/0023_sos_reports.sql", "utf8");

  it("enables RLS with a tenant-isolation policy, same pattern as identity.cycle_actions", () => {
    expect(migration).toContain("alter table identity.sos_reports enable row level security");
    expect(migration).toContain("create policy tenant_isolation on identity.sos_reports");
    expect(migration).toContain("current_setting('app.current_tenant_id', true)::uuid");
  });

  it("never touches the responses schema -- lives entirely in identity.*", () => {
    expect(migration).not.toMatch(/create table responses\./);
    expect(migration).not.toMatch(/alter table responses\./);
  });

  it("adds safety_contact_email with no default value -- no fallback contact is ever implied", () => {
    expect(migration).toContain("add column if not exists safety_contact_email text");
    expect(migration).not.toMatch(/safety_contact_email text.*default/i);
  });

  it("has no foreign key from cycle_id to responses.survey_cycles, matching cycle_actions' cross-schema convention", () => {
    const tableBody = migration.slice(migration.indexOf("create table identity.sos_reports"), migration.indexOf(");", migration.indexOf("create table identity.sos_reports")));
    expect(tableBody).toContain("cycle_id uuid");
    expect(tableBody).not.toContain("references responses.survey_cycles");
  });
});
