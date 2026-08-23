import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";

const read = (path: string) => readFileSync(path, "utf8");

describe("pay-when-you-listen security regressions", () => {
  it("keeps sensitive tenant and people mutations role-gated", () => {
    expect(read("src/app/api/tenants/settings/route.ts")).toContain("canModifySettings(session.role)");
    expect(read("src/app/api/employees/route.ts")).toContain("canAccessPeople(session.role)");
    expect(read("src/app/api/employees/route.ts")).toContain("canImportEmployees(session.role)");
    expect(read("src/app/api/employees/import/route.ts")).toContain("canImportEmployees(session.role)");
    expect(read("src/app/api/employees/[id]/status/route.ts")).toContain("canImportEmployees(session.role)");
    expect(read("src/app/api/cycles/create/route.ts")).toContain("canCreateSurvey(session.role)");
    expect(read("src/app/api/cycles/launch/route.ts")).toContain("canModifyBilling(session.role)");
  });

  it("does not leave public bootstrap or readiness reconnaissance in production", () => {
    expect(read("src/app/api/tenants/bootstrap/route.ts")).toContain("isDevAuthAllowed()");
    const readiness = read("src/app/api/readiness/route.ts");
    expect(readiness).not.toContain("missingProduction:");
    expect(readiness).not.toContain("checks,");
  });

  it("opens with a credit before retrieving any invite delivery recipients", () => {
    for (const route of ["src/app/api/invites/send/route.ts", "src/app/api/invites/queue/route.ts"]) {
      const source = read(route);
      expect(source.indexOf("openCycleWithSurveyCredit")).toBeGreaterThan(-1);
      expect(source.indexOf("openCycleWithSurveyCredit")).toBeLessThan(source.indexOf("getQueuedOutboxDeliveries"));
    }
    expect(read("src/lib/server/surveyRecurrenceService.ts")).toContain("openCycleWithSurveyCredit");
  });

  it("waits for paid settlement and makes the ledger one-way", () => {
    const webhook = read("src/app/api/stripe/webhook/route.ts");
    expect(webhook).toContain('session.payment_status === "paid"');
    expect(webhook).toContain("checkout.session.async_payment_succeeded");
    expect(webhook).toContain("Number.isSafeInteger(credits)");
    const migration = read("db/migrations/0041_make_survey_credit_ledger_append_only.sql");
    expect(migration).toContain("enforce_survey_credit_immutability");
    expect(migration).toContain("unused to consumed");
  });
});
