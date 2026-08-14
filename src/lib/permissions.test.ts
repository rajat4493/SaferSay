import { describe, expect, it } from "vitest";
import {
  canAccessAuditLog,
  canAccessPeople,
  canAccessSecurityProof,
  canAccessWorkspace,
  canCreateSurvey,
  canImportEmployees,
  canManageTeam,
  canModifyBilling,
  canModifySettings,
  canRunSurvey,
  canViewSurveyResults,
  getVisibleNavZones,
  isReadOnlyRole,
} from "@/lib/permissions";
import type { UserRole } from "@/lib/server/repositories/types";

const roles: UserRole[] = ["customer_admin", "survey_creator", "auditor", "employee"];

function expectGrantedTo(fn: (role: UserRole) => boolean, granted: UserRole[]) {
  for (const role of roles) {
    expect(fn(role), `${fn.name}("${role}")`).toBe(granted.includes(role));
  }
}

describe("permissions", () => {
  it("canAccessWorkspace is customer_admin only", () => {
    expectGrantedTo(canAccessWorkspace, ["customer_admin"]);
  });

  it("canAccessPeople grants customer_admin and survey_creator", () => {
    expectGrantedTo(canAccessPeople, ["customer_admin", "survey_creator"]);
  });

  it("canCreateSurvey grants customer_admin and survey_creator", () => {
    expectGrantedTo(canCreateSurvey, ["customer_admin", "survey_creator"]);
  });

  it("canRunSurvey grants customer_admin and survey_creator", () => {
    expectGrantedTo(canRunSurvey, ["customer_admin", "survey_creator"]);
  });

  it("canViewSurveyResults grants customer_admin, survey_creator, and auditor (read-only), never employee", () => {
    expectGrantedTo(canViewSurveyResults, ["customer_admin", "survey_creator", "auditor"]);
  });

  it("canAccessAuditLog grants customer_admin and auditor", () => {
    expectGrantedTo(canAccessAuditLog, ["customer_admin", "auditor"]);
  });

  it("canAccessSecurityProof grants customer_admin and auditor", () => {
    expectGrantedTo(canAccessSecurityProof, ["customer_admin", "auditor"]);
  });

  it("canModifySettings is customer_admin only", () => {
    expectGrantedTo(canModifySettings, ["customer_admin"]);
  });

  it("canModifyBilling is customer_admin only", () => {
    expectGrantedTo(canModifyBilling, ["customer_admin"]);
  });

  it("canManageTeam is customer_admin only", () => {
    expectGrantedTo(canManageTeam, ["customer_admin"]);
  });

  it("canImportEmployees grants customer_admin and survey_creator", () => {
    expectGrantedTo(canImportEmployees, ["customer_admin", "survey_creator"]);
  });

  it("isReadOnlyRole is auditor only", () => {
    expectGrantedTo(isReadOnlyRole, ["auditor"]);
  });

  describe("getVisibleNavZones", () => {
    it("gives customer_admin every zone", () => {
      expect(getVisibleNavZones("customer_admin")).toEqual(["surveys", "people", "workspace"]);
    });

    it("gives survey_creator surveys and people, no workspace", () => {
      expect(getVisibleNavZones("survey_creator")).toEqual(["surveys", "people"]);
    });

    it("gives auditor and employee no nav zones", () => {
      expect(getVisibleNavZones("auditor")).toEqual([]);
      expect(getVisibleNavZones("employee")).toEqual([]);
    });
  });

  it("employee never gets any elevated permission", () => {
    const checks = [
      canAccessWorkspace,
      canAccessPeople,
      canCreateSurvey,
      canRunSurvey,
      canViewSurveyResults,
      canAccessAuditLog,
      canAccessSecurityProof,
      canModifySettings,
      canModifyBilling,
      canManageTeam,
      canImportEmployees,
    ];
    for (const check of checks) {
      expect(check("employee"), check.name).toBe(false);
    }
  });

  it("auditor is read-only: sees results/audit/security but cannot create, run, or manage anything", () => {
    expect(canViewSurveyResults("auditor")).toBe(true);
    expect(canAccessAuditLog("auditor")).toBe(true);
    expect(canAccessSecurityProof("auditor")).toBe(true);
    expect(canCreateSurvey("auditor")).toBe(false);
    expect(canRunSurvey("auditor")).toBe(false);
    expect(canImportEmployees("auditor")).toBe(false);
    expect(canAccessPeople("auditor")).toBe(false);
    expect(canManageTeam("auditor")).toBe(false);
    expect(canModifySettings("auditor")).toBe(false);
    expect(canModifyBilling("auditor")).toBe(false);
    expect(canAccessWorkspace("auditor")).toBe(false);
  });
});
