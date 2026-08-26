import type { UserRole } from "@/lib/server/repositories/types";

/**
 * Permission checks for role-based access control.
 * Follows the four-role model from CLAUDE_CODE_ADMIN_REFACTOR.md §2, plus
 * a fifth, narrower role added for the People Leader reporting scope.
 *
 * Roles:
 * - customer_admin: owner, controls everything
 * - survey_creator: day-to-day HR, creates/runs surveys & manages people (Workspace hidden)
 * - auditor: Report Viewer, reads protected organisation-level reports
 * - employee: respondent, token link only
 * - people_leader: read-only, scoped to one manager's reporting subtree
 *   only (see UserRecord.peopleLeaderRootEmployeeId and
 *   getProtectedReportForTenant's team-scope branch) -- never org-wide,
 *   never another manager's subtree, enforced server-side in /api/report,
 *   not just by hiding the scope picker in the UI.
 * - integration_admin: operates technical connections, never HR content
 * - compliance_reviewer: reads security/audit proof and protected numeric
 *   reports, never raw comments or portable exports
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
  // auditor (Report Viewer) sees k-safe organisation results only
  // people_leader sees k-safe results scoped to their own subtree only
  // compliance_reviewer sees k-safe numeric evidence only
  // employee cannot view results
  return role === "customer_admin" || role === "survey_creator" || role === "auditor" || role === "people_leader" || role === "compliance_reviewer";
}

/** True only for the scoped-to-one-subtree role -- see permissions.ts's
 * module doc comment. Callers that return an org-wide or scope-choosable
 * report (trend, export, the department picker) should block this role
 * outright rather than try to fit it into a scope they don't support. */
export function isScopedToOwnSubtree(role: UserRole): boolean {
  return role === "people_leader";
}

export function canAccessAuditLog(role: UserRole): boolean {
  return role === "compliance_reviewer" || role === "customer_admin";
}

export function canAccessSecurityProof(role: UserRole): boolean {
  // compliance reviewers can view confidentiality architecture proof
  // customer_admin can view all settings including security proof
  return role === "compliance_reviewer" || role === "customer_admin";
}

export function canModifySettings(role: UserRole): boolean {
  return role === "customer_admin";
}

export function canModifyBilling(role: UserRole): boolean {
  return role === "customer_admin";
}

export function canManageTeam(role: UserRole): boolean {
  return role === "customer_admin";
}

export function canImportEmployees(role: UserRole): boolean {
  return role === "customer_admin" || role === "survey_creator";
}

/** Technical configuration only: mail delivery, Slack and future SSO/HRIS. */
export function canManageIntegrations(role: UserRole): boolean {
  return role === "customer_admin" || role === "integration_admin";
}

/** Shared today by comments, cross-cycle trend, and export -- all three
 * carry more re-identification/portability risk than a single in-app
 * report view, so none of them extend to people_leader/compliance_reviewer
 * yet. Kept as one predicate so a future split (e.g. letting one of the
 * three diverge from the others) is a deliberate, visible change instead
 * of editing one of three identical-looking functions and forgetting the
 * other two. */
function canViewRawReportContent(role: UserRole): boolean {
  return role === "customer_admin" || role === "survey_creator" || role === "auditor";
}

/** Open text carries more re-identification risk than numeric aggregates. */
export function canViewComments(role: UserRole): boolean {
  return canViewRawReportContent(role);
}

export function canViewCrossCycleTrend(role: UserRole): boolean {
  return canViewRawReportContent(role);
}

export function canExportReports(role: UserRole): boolean {
  return canViewRawReportContent(role);
}

export function isReadOnlyRole(role: UserRole): boolean {
  return role === "auditor" || role === "people_leader" || role === "compliance_reviewer";
}

export function getVisibleNavZones(role: UserRole): ("surveys" | "people" | "workspace")[] {
  switch (role) {
    case "customer_admin":
      return ["surveys", "people", "workspace"];
    case "survey_creator":
      return ["surveys", "people"];
    case "auditor":
      return ["surveys"];
    case "people_leader":
      // No nav zone yet -- a People Leader reaches their scoped results via
      // a direct link (same v1.1+ posture as auditor above), never the
      // full surveys/people/workspace nav (people_leader must never see
      // the employee directory beyond their own subtree).
      return [];
    case "integration_admin":
    case "compliance_reviewer":
      return [];
    case "employee":
      return [];
    default:
      return [];
  }
}
