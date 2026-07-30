import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";

describe("Postgres severance migration", () => {
  const migration = readFileSync("db/migrations/0001_confidential_spine.sql", "utf8");

  it("does not define forbidden identity columns in response tables", () => {
    const responseSection = migration
      .split("create table responses.submissions")[1]
      .split("create table responses.answers")[0];

    expect(responseSection).not.toMatch(/\b(employee_id|email|user_id|sso_subject|provider_subject|ip_address|user_agent|invitation_id)\b/);
  });

  it("does not define foreign keys from responses schema to identity schema", () => {
    expect(migration).not.toMatch(/responses\.[\s\S]+references identity\./i);
  });

  it("contains the response identity column guard and min group report function", () => {
    expect(migration).toContain("response_identity_column_guard");
    expect(migration).toContain("responses.report_question_scores");
    expect(migration).toContain("count(*) >= min_n");
  });
});
