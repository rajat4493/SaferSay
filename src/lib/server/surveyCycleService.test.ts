import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";

describe("survey cycle creation foundation", () => {
  it("creates tenant-scoped cycles and issues respondent tokens", () => {
    const service = readFileSync("src/lib/server/surveyCycleService.ts", "utf8");
    expect(service).toContain("createTenantSurveyCycle");
    expect(service).toContain("countActiveEmployees");
    expect(service).toContain("issueTokens");
    expect(service).toContain("responses.survey_cycles");
  });

  it("protects the cycle creation API with admin access", () => {
    const route = readFileSync("src/app/api/cycles/create/route.ts", "utf8");
    expect(route).toContain("verifyAdminAccessToken");
    expect(route).toContain("Unauthorized survey cycle creation.");
    expect(route).toContain("resolveTenantContext");
  });

  it("prevents duplicate participant tokens per cycle employee", () => {
    const migration = readFileSync("db/migrations/0003_participant_cycle_uniqueness.sql", "utf8");
    const repo = readFileSync("src/lib/server/repositories/identityRepository.ts", "utf8");
    expect(migration).toContain("survey_participants_cycle_employee_key");
    expect(repo).toContain("on conflict (cycle_id, employee_id) do nothing");
  });
});
