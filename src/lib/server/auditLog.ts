import { getDatabasePool } from "@/lib/server/db/pool";
import type { UserRole } from "@/lib/server/repositories/types";

/**
 * Audit logging service for operator actions.
 *
 * CRITICAL: THE HARD RULE (from CLAUDE_CODE_ADMIN_REFACTOR.md §3)
 * Audit logs must NEVER become a de-anonymisation tool.
 * - Log OPERATOR ACTIONS ONLY (what admins do to the system)
 * - NEVER log respondent participation, submission status tied to identity, or response content
 * - If an audit entry would let someone infer that a specific person responded (or what they said),
 *   it must NOT be recorded
 * - Participation state stays in the operational participation store (for reminders only)
 *   and is NEVER surfaced to the Auditor role
 *
 * Examples of SAFE entries:
 * - "threshold changed to 5"
 * - "invites sent to 30 people" (aggregate count only)
 * - "survey created from Engagement template"
 * - "survey closed"
 * - "employee list imported (30 rows)"
 * - "report exported"
 *
 * Examples of UNSAFE entries (NEVER log these):
 * - "john@company.com submitted response"
 * - "bob@company.com has not submitted"
 * - "alice@company.com response: [answer data]"
 * - Any per-person submission tracking tied to email/identity
 */

export type AuditLogAction =
  | "survey_created"
  | "survey_questions_updated"
  | "survey_closed"
  | "survey_deleted"
  | "invites_sent"
  | "reminders_sent"
  | "employee_list_imported"
  | "employee_added"
  | "employee_removed"
  | "report_exported"
  | "threshold_changed"
  | "settings_updated"
  | "team_invite_sent"
  | "team_member_removed"
  | "team_member_role_changed"
  | "people_leader_assigned"
  | "data_retention_purged"
  | "deletion_requested"
  | "commitment_published"
  | "commitment_updated";

export type AuditLogTargetType = "survey" | "workspace" | "people_list" | null;

export interface AuditLogEntry {
  tenantId: string;
  actorRole: UserRole;
  actorId: string;
  action: AuditLogAction;
  targetType?: AuditLogTargetType;
  targetId?: string;
  safeCounts?: Record<string, number>;
  details?: string;
}

/**
 * Validate that safe_counts contains only aggregate data, no PII or identity info.
 * This guard ensures we never accidentally log respondent-identifying information.
 */
function validateSafeCounts(counts: Record<string, number> | undefined): void {
  if (!counts) return;

  const unsafePrefixes = [
    "email",
    "respondent",
    "participant",
    "person",
    "employee_",
    "user_",
    "identity",
    "submission_per_",
  ];

  for (const key of Object.keys(counts)) {
    for (const unsafe of unsafePrefixes) {
      if (key.toLowerCase().includes(unsafe)) {
        throw new Error(
          `AUDIT GUARD VIOLATION: count key "${key}" looks like PII or respondent-specific data. ` +
            `Audit logs must never track individual responses or submission status.`
        );
      }
    }
  }
}

/**
 * Validate that details string contains no respondent email addresses or PII.
 */
function validateDetailsNoPII(details: string | undefined): void {
  if (!details) return;

  // Basic check: if details look like they contain an email that's not the actor,
  // that's a red flag for logging respondent email
  const emailPattern = /[\w.-]+@[\w.-]+\.\w+/g;
  const emails = details.match(emailPattern) || [];

  if (emails.length > 0) {
    throw new Error(
      `AUDIT GUARD VIOLATION: details contain email addresses. ` +
        `Audit logs must not contain respondent email addresses or PII. ` +
        `Use aggregate counts instead (e.g., "invites_sent: 30" not "invites_sent_to: [emails]").`
    );
  }
}

/**
 * Log an audit event. Enforces the hard rule: operator actions only, never respondent data.
 *
 * This function validates its inputs to catch PII violations at insert time.
 * The database layer also enforces RLS to prevent unauthorized reads.
 */
export async function logAuditEvent(entry: AuditLogEntry): Promise<void> {
  // Guard: validate no PII in safe_counts or details
  validateSafeCounts(entry.safeCounts);
  validateDetailsNoPII(entry.details);

  // Guard: action must be an operator action, not respondent-tracking
  const respondentActionPatterns = [
    "responded",
    "submission",
    "participant_",
    "respondent_",
    "who_answered",
  ];

  for (const pattern of respondentActionPatterns) {
    if (entry.action.toLowerCase().includes(pattern)) {
      throw new Error(
        `AUDIT GUARD VIOLATION: action "${entry.action}" looks like respondent tracking. ` +
          `Audit logs must track operator actions only (survey creation, invites sent, settings changed), ` +
          `not who responded or what they said.`
      );
    }
  }

  console.log(`[AUDIT] ${entry.actorRole} (${entry.actorId}): ${entry.action}`, {
    target: entry.targetId ? `${entry.targetType}:${entry.targetId}` : "workspace",
    counts: entry.safeCounts,
  });

  // No DATABASE_URL (local/mock mode): console line above is the only record.
  const pool = getDatabasePool();
  if (!pool) return;

  try {
    await pool.query(
      `insert into identity.audit_logs
         (tenant_id, actor_role, actor_id, action, target_type, target_id, safe_counts, details)
       values ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        entry.tenantId,
        entry.actorRole,
        entry.actorId,
        entry.action,
        entry.targetType ?? null,
        entry.targetId ?? null,
        entry.safeCounts ? JSON.stringify(entry.safeCounts) : null,
        entry.details ?? null,
      ],
    );
  } catch (error) {
    console.error(`Audit log insertion failed: ${error}`);
    throw error;
  }
}

/**
 * Helper: Log survey creation
 */
export async function logSurveyCreated(
  tenantId: string,
  actorRole: UserRole,
  actorId: string,
  surveyId: string,
  templateName?: string
): Promise<void> {
  await logAuditEvent({
    tenantId,
    actorRole,
    actorId,
    action: "survey_created",
    targetType: "survey",
    targetId: surveyId,
    details: templateName ? `from ${templateName} template` : undefined,
  });
}

/**
 * Helper: Log a draft survey's questions being edited/reordered.
 */
export async function logSurveyQuestionsUpdated(
  tenantId: string,
  actorRole: UserRole,
  actorId: string,
  surveyId: string,
  questionCount: number
): Promise<void> {
  await logAuditEvent({
    tenantId,
    actorRole,
    actorId,
    action: "survey_questions_updated",
    targetType: "survey",
    targetId: surveyId,
    safeCounts: { question_count: questionCount },
  });
}

/**
 * Helper: Log a report export (CSV/JSON/PDF pull of aggregate results).
 * surveyId is null for a tenant-wide "latest cycle" export with no
 * specific cycleId query param.
 */
export async function logReportExported(
  tenantId: string,
  actorRole: UserRole,
  actorId: string,
  surveyId: string | null,
  format: "csv" | "json" | "pdf"
): Promise<void> {
  await logAuditEvent({
    tenantId,
    actorRole,
    actorId,
    action: "report_exported",
    targetType: "survey",
    targetId: surveyId ?? undefined,
    details: `format: ${format}`,
  });
}

/**
 * Helper: Log an automatic data-retention purge run for a tenant (aggregate
 * counts only -- which cycles/submissions were deleted, never which
 * respondent's data specifically, matching the audit guard's rules for
 * every other aggregate-only action).
 */
export async function logDataRetentionPurged(
  tenantId: string,
  retentionMonths: number,
  cyclesPurged: number,
  submissionsDeleted: number
): Promise<void> {
  await logAuditEvent({
    tenantId,
    actorRole: "customer_admin",
    actorId: "system-retention-job",
    action: "data_retention_purged",
    targetType: "workspace",
    safeCounts: { cycles_purged: cyclesPurged, submissions_deleted: submissionsDeleted },
    details: `retention window: ${retentionMonths} months`,
  });
}

/**
 * Helper: Log invites sent (aggregate count only, never individual emails)
 */
export async function logInvitesSent(
  tenantId: string,
  actorRole: UserRole,
  actorId: string,
  surveyId: string,
  inviteCount: number
): Promise<void> {
  await logAuditEvent({
    tenantId,
    actorRole,
    actorId,
    action: "invites_sent",
    targetType: "survey",
    targetId: surveyId,
    safeCounts: { invites_sent: inviteCount },
  });
}

/**
 * Helper: Log employee list import (aggregate count only, never individual emails)
 */
export async function logEmployeeImport(
  tenantId: string,
  actorRole: UserRole,
  actorId: string,
  rowCount: number
): Promise<void> {
  await logAuditEvent({
    tenantId,
    actorRole,
    actorId,
    action: "employee_list_imported",
    targetType: "people_list",
    safeCounts: { rows_imported: rowCount },
  });
}

/**
 * Helper: Log threshold change
 */
/**
 * Helper: Log an account-deletion request. This only records that a
 * request was made (for the audit trail an RFP reviewer expects) --
 * actual deletion stays a manual, super-admin-reviewed action, since
 * deleting a tenant's data is irreversible and shouldn't be one API call
 * away from an admin's own account.
 */
export async function logDeletionRequested(tenantId: string, actorRole: UserRole, actorId: string): Promise<void> {
  await logAuditEvent({
    tenantId,
    actorRole,
    actorId,
    action: "deletion_requested",
    targetType: "workspace",
  });
}

export async function logThresholdChanged(
  tenantId: string,
  actorRole: UserRole,
  actorId: string,
  newThreshold: number
): Promise<void> {
  await logAuditEvent({
    tenantId,
    actorRole,
    actorId,
    action: "threshold_changed",
    targetType: "workspace",
    safeCounts: { new_threshold: newThreshold },
  });
}

/**
 * Helper: Log reminders sent (aggregate count only, never individual emails)
 */
export async function logRemindersSent(
  tenantId: string,
  actorRole: UserRole,
  actorId: string,
  surveyId: string,
  reminderCount: number
): Promise<void> {
  await logAuditEvent({
    tenantId,
    actorRole,
    actorId,
    action: "reminders_sent",
    targetType: "survey",
    targetId: surveyId,
    safeCounts: { reminders_sent: reminderCount },
  });
}

/**
 * Helper: Log survey closure
 */
export async function logSurveyClosed(
  tenantId: string,
  actorRole: UserRole,
  actorId: string,
  surveyId: string
): Promise<void> {
  await logAuditEvent({
    tenantId,
    actorRole,
    actorId,
    action: "survey_closed",
    targetType: "survey",
    targetId: surveyId,
  });
}

/**
 * Helper: Log a team invite (role only -- never the invited email, which
 * would trip validateDetailsNoPII and isn't an operator action anyway).
 */
export async function logTeamInviteSent(
  tenantId: string,
  actorRole: UserRole,
  actorId: string,
  invitedRole: UserRole
): Promise<void> {
  await logAuditEvent({
    tenantId,
    actorRole,
    actorId,
    action: "team_invite_sent",
    targetType: "workspace",
    details: `role: ${invitedRole}`,
  });
}

/**
 * Helper: Log a team member/invite removal (role only, same reasoning as above).
 */
export async function logTeamMemberRemoved(
  tenantId: string,
  actorRole: UserRole,
  actorId: string,
  removedRole: UserRole
): Promise<void> {
  await logAuditEvent({
    tenantId,
    actorRole,
    actorId,
    action: "team_member_removed",
    targetType: "workspace",
    details: `role: ${removedRole}`,
  });
}

/**
 * Helper: Log a teammate's role changing, e.g. when an existing 'auditor'
 * is moved to 'compliance_reviewer' after that permission was repointed --
 * gives a tenant admin a visible trail of who moved whom, since there's no
 * automatic migration of existing role assignments.
 */
export async function logTeamMemberRoleChanged(
  tenantId: string,
  actorRole: UserRole,
  actorId: string,
  fromRole: UserRole,
  toRole: UserRole
): Promise<void> {
  await logAuditEvent({
    tenantId,
    actorRole,
    actorId,
    action: "team_member_role_changed",
    targetType: "workspace",
    details: `role: ${fromRole} -> ${toRole}`,
  });
}

/**
 * Helper: Log a People Leader assignment -- the assigned teammate's user
 * id goes in targetId (an opaque identifier, same convention every other
 * survey/workspace-targeted event here already uses), never in `details`
 * -- logAuditEvent's own validateDetailsNoPII guard hard-rejects any
 * email address in that field, and rightly caught this when the first
 * version of this helper put one there directly.
 */
export async function logPeopleLeaderAssigned(
  tenantId: string,
  actorRole: UserRole,
  actorId: string,
  assigneeUserId: string
): Promise<void> {
  await logAuditEvent({
    tenantId,
    actorRole,
    actorId,
    action: "people_leader_assigned",
    targetType: "workspace",
    targetId: assigneeUserId,
  });
}
