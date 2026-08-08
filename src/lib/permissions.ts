import type { UserRole } from "@/lib/server/repositories/types";

/**
 * Permission checks for role-based access control.
 * Follows the four-role model from CLAUDE_CODE_ADMIN_REFACTOR.md §2.
 *
 * Roles:
 * - customer_admin: owner, controls everything
 * - survey_creator: day-to-day HR, creates/runs surveys & manages people (Workspace hidden)
 * - auditor: read-only verification, views confidentiality proof + audit logs (NEW, v1.1+)
 * - employee: respondent, token link only
 */

export function canAccessWorkspace(role: UserRole): boolean {
  return role === "customer_admin";
}

export function canAccessPeople(role: UserRole): boolean {
  return role === "customer_admin" || role === "survey_creator";
}

export function canCreateSurvey(role: UserRole): boolean {
  return role === "customer_admin" || role === "survey_creator";
}

export function canRunSurvey(role: UserRole): boolean {
  return role === "customer_admin" || role === "survey_creator";
}

export function canViewSurveyResults(role: UserRole): boolean {
  // customer_admin and survey_creator see full, k-safe results
  // auditor sees k-safe results only (never individuals, never sub-k)
  // employee cannot view results
  return role === "customer_admin" || role === "survey_creator" || role === "auditor";
}

export function canAccessAuditLog(role: UserRole): boolean {
  return role === "auditor" || role === "customer_admin";
}

export function canAccessSecurityProof(role: UserRole): boolean {
  // auditor can view confidentiality architecture proof
  // customer_admin can view all settings including security proof
  return role === "auditor" || role === "customer_admin";
}

export function canModifySettings(role: UserRole): boolean {
  return role === "customer_admin";
}

export function canModifyBilling(role: UserRole): boolean {
  return role === "customer_admin";
}

export function canAccessGoLive(role: UserRole): boolean {
  return role === "customer_admin";
}

export function canManageTeam(role: UserRole): boolean {
  return role === "customer_admin";
}

export function canImportEmployees(role: UserRole): boolean {
  return role === "customer_admin" || role === "survey_creator";
}

export function isReadOnlyRole(role: UserRole): boolean {
  return role === "auditor";
}

export function getVisibleNavZones(role: UserRole): ("surveys" | "people" | "workspace")[] {
  switch (role) {
    case "customer_admin":
      return ["surveys", "people", "workspace"];
    case "survey_creator":
      return ["surveys", "people"];
    case "auditor":
      // Auditor role is v1.1+, behind a flag -- not surfaced in nav until customer needs it
      // TODO: Add "audit" zone once auditor is exposed
      return [];
    case "employee":
      return [];
    default:
      return [];
  }
}
