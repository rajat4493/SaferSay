import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";

describe("survey cycle creation foundation", () => {
  it("creates tenant-scoped cycles and issues respondent tokens", () => {
    const service = readFileSync("src/lib/server/surveyCycleService.ts", "utf8");
    expect(service).toContain("createTenantSurveyCycle");
    expect(service).toContain("countActiveEmployees");
    expect(service).toContain("issueTokens");
    expect(service).toContain("createInviteOutboxForIssuedTokens");
    expect(service).toContain("invitesPrepared");
    expect(service).toContain("responses.survey_cycles");
  });

  it("protects the cycle creation API with an authenticated session", () => {
    const route = readFileSync("src/app/api/cycles/create/route.ts", "utf8");
    expect(route).toContain("getSessionContext");
    expect(route).toContain("Unauthorized survey cycle creation.");
  });

  it("prevents duplicate participant tokens per cycle employee", () => {
    const migration = readFileSync("db/migrations/0003_participant_cycle_uniqueness.sql", "utf8");
    const repo = readFileSync("src/lib/server/repositories/identityRepository.ts", "utf8");
    expect(migration).toContain("survey_participants_cycle_employee_key");
    expect(repo).toContain("on conflict (cycle_id, employee_id) do nothing");
  });

  it("stores delivery-safe respondent links only in the identity invite outbox", () => {
    const migration = readFileSync("db/migrations/0005_delivery_safe_invite_links.sql", "utf8");
    const repo = readFileSync("src/lib/server/repositories/identityRepository.ts", "utf8");
    const delivery = readFileSync("src/lib/server/resendDelivery.ts", "utf8");
    expect(migration).toContain("identity.invite_outbox");
    expect(migration).toContain("respondent_path");
    expect(repo).toContain("createInviteOutboxForIssuedTokens");
    expect(repo).toContain("respondent_path");
    expect(repo).toContain("`/s/${token.rawToken}`");
    expect(delivery).toContain("delivery.respondentPath");
    expect(migration).not.toContain("responses.");
  });
});
