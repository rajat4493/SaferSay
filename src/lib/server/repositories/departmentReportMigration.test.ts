import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";

describe("department-scoped report migration", () => {
  const migration = readFileSync("db/migrations/0021_department_scoped_report.sql", "utf8");

  it("aggregates against the requested cycle's own min_group_size-derived threshold, same gate as the org-level function", () => {
    expect(migration).toContain("report_question_scores_by_department");
    expect(migration).toContain("count(*) >= min_n");
    expect(migration).toContain("count(*) < min_n as protected");
  });

  it("is SECURITY DEFINER and grants only execute to the restricted app role, never a direct grant on answers", () => {
    expect(migration).toContain("security definer");
    expect(migration).toContain("grant execute on function responses.report_question_scores_by_department(uuid, text, integer) to safersay_app");
    expect(migration).not.toMatch(/grant\s+select.*on\s+responses\.answers/i);
  });
});

describe("participant team snapshot migration", () => {
  const migration = readFileSync("db/migrations/0020_participant_team_snapshot.sql", "utf8");

  it("adds team to identity.survey_participants, not to the responses schema", () => {
    expect(migration).toContain("alter table identity.survey_participants add column if not exists team text");
    expect(migration).not.toMatch(/alter table responses\./);
  });
});
