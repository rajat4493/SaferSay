import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";

describe("open-text report migration", () => {
  const migration = readFileSync("db/migrations/0022_open_text_report.sql", "utf8");

  it("gates per question on the caller-supplied threshold, same pattern as report_question_scores", () => {
    expect(migration).toContain("report_open_text_answers");
    expect(migration).toContain("c.n < min_n as protected");
    expect(migration).toContain("c.n >= min_n then a.text_value else null end as text_value");
  });

  it("is SECURITY DEFINER and grants only execute to the restricted app role, never a direct grant on answers", () => {
    expect(migration).toContain("security definer");
    expect(migration).toContain("grant execute on function responses.report_open_text_answers(uuid, integer) to safersay_app");
    expect(migration).not.toMatch(/grant\s+select.*on\s+responses\.answers/i);
  });
});

describe("open-text report repository", () => {
  const repo = readFileSync("src/lib/server/repositories/responseRepository.ts", "utf8");

  it("always uses minGroupSize + 3, never the bare numeric threshold, for the text reveal gate", () => {
    expect(repo).toContain("minGroupSize + 3");
  });

  it("stays entirely inside the responses schema -- no identity-table access", () => {
    const method = repo.slice(repo.indexOf("async getProtectedOpenTextReport"), repo.indexOf("async getProtectedOpenTextReport") + 2000);
    expect(method).not.toContain("identity.employees");
    expect(method).not.toContain("identity.survey_participants");
  });
});
