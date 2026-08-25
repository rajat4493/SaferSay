import { describe, expect, it } from "vitest";
import {
  canAccessAuditLog,
  canAccessPeople,
  canAccessSecurityProof,
  canAccessWorkspace,
  canCreateSurvey,
  canExportReports,
  canImportEmployees,
  canManageIntegrations,
  canManageTeam,
  canModifyBilling,
  canModifySettings,
  canRunSurvey,
  canViewComments,
  canViewCrossCycleTrend,
  canViewSurveyResults,
  getVisibleNavZones,
  isReadOnlyRole,
} from "@/lib/permissions";
import type { UserRole } from "@/lib/server/repositories/types";

const roles: UserRole[] = ["customer_admin", "survey_creator", "auditor", "people_leader", "integration_admin", "compliance_reviewer", "employee"];

function expectGrantedTo(fn: (role: UserRole) => boolean, granted: UserRole[]) {
  for (const role of roles) expect(fn(role), `${fn.name}(\"${role}\")`).toBe(granted.includes(role));
}

describe("permissions", () => {
  it("keeps workspace ownership with the customer admin", () => expectGrantedTo(canAccessWorkspace, ["customer_admin"]));
  it("grants people access only to HR operators", () => expectGrantedTo(canAccessPeople, ["customer_admin", "survey_creator"]));
  it("grants survey creation and running only to HR operators", () => {
    expectGrantedTo(canCreateSurvey, ["customer_admin", "survey_creator"]);
    expectGrantedTo(canRunSurvey, ["customer_admin", "survey_creator"]);
  });
  it("grants protected reports to report roles, never integration admins or respondents", () => {
    expectGrantedTo(canViewSurveyResults, ["customer_admin", "survey_creator", "auditor", "people_leader", "compliance_reviewer"]);
  });
  it("gives compliance reviewers, not report viewers, audit and security evidence", () => {
    expectGrantedTo(canAccessAuditLog, ["customer_admin", "compliance_reviewer"]);
    expectGrantedTo(canAccessSecurityProof, ["customer_admin", "compliance_reviewer"]);
  });
  it("keeps billing, team management and privacy settings with the owner", () => {
    expectGrantedTo(canModifySettings, ["customer_admin"]);
    expectGrantedTo(canModifyBilling, ["customer_admin"]);
    expectGrantedTo(canManageTeam, ["customer_admin"]);
  });
  it("keeps roster import with HR operators", () => expectGrantedTo(canImportEmployees, ["customer_admin", "survey_creator"]));
  it("gives integration admins a technical lane without HR content", () => {
    expectGrantedTo(canManageIntegrations, ["customer_admin", "integration_admin"]);
    expect(canViewSurveyResults("integration_admin")).toBe(false);
    expect(canAccessPeople("integration_admin")).toBe(false);
  });
  it("keeps raw comments, trend and exports away from compliance and people-leader roles", () => {
    expectGrantedTo(canViewComments, ["customer_admin", "survey_creator", "auditor"]);
    expectGrantedTo(canViewCrossCycleTrend, ["customer_admin", "survey_creator", "auditor"]);
    expectGrantedTo(canExportReports, ["customer_admin", "survey_creator", "auditor"]);
  });
  it("marks every non-operator reporting role read-only", () => {
    expect(isReadOnlyRole("auditor")).toBe(true);
    expect(isReadOnlyRole("people_leader")).toBe(true);
    expect(isReadOnlyRole("compliance_reviewer")).toBe(true);
    expect(isReadOnlyRole("survey_creator")).toBe(false);
  });
  describe("getVisibleNavZones", () => {
    it("gives the owner every zone, HR operators surveys and people, and report viewers surveys", () => {
      expect(getVisibleNavZones("customer_admin")).toEqual(["surveys", "people", "workspace"]);
      expect(getVisibleNavZones("survey_creator")).toEqual(["surveys", "people"]);
      expect(getVisibleNavZones("auditor")).toEqual(["surveys"]);
      expect(getVisibleNavZones("people_leader")).toEqual([]);
      expect(getVisibleNavZones("integration_admin")).toEqual([]);
      expect(getVisibleNavZones("compliance_reviewer")).toEqual([]);
      expect(getVisibleNavZones("employee")).toEqual([]);
    });
  });
});
