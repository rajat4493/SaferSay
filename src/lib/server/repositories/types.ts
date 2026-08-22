export type TenantRecord = {
  id: string;
  name: string;
  slug: string;
};

export type UserRole = "customer_admin" | "survey_creator" | "auditor" | "employee";

export type UserRecord = {
  id: string;
  tenantId: string;
  authProvider: string;
  providerSubject: string;
  email: string;
  name: string | null;
  role: UserRole;
};

export type OnboardingEventKey = "signup" | "employees" | "cycle" | "tokens" | "outbox" | "queue" | "responses" | "report";

/** A teammate's role is limited to the three staff roles -- "employee" is
 * the respondent role, never assignable through team invites. */
export type TeamRole = Exclude<UserRole, "employee">;

export type PendingInviteRecord = {
  id: string;
  tenantId: string;
  email: string;
  role: TeamRole;
  invitedByEmail: string;
  createdAt: string;
};

export type AuditLogRecord = {
  id: string;
  actorRole: string;
  actorId: string;
  action: string;
  targetType: string | null;
  targetId: string | null;
  safeCounts: Record<string, number> | null;
  details: string | null;
  createdAt: string;
};

export type TeamMember = {
  id: string;
  email: string;
  name: string | null;
  role: UserRole;
  status: "active" | "pending";
  createdAt: string;
};

export type EmployeeRecord = {
  id: string;
  email: string;
  name: string | null;
  team: string | null;
  location: string | null;
  employmentStatus: string;
};

export type TenantDirectoryEntry = {
  id: string;
  name: string;
  slug: string;
  employeeCount: number;
  latestCycleName: string | null;
  latestCycleStatus: string | null;
  lastActivityAt: string | null;
  planTier: TenantPlanTier;
  createdAt: string;
};

export type TenantPlanTier = "standard" | "growth" | "enterprise";

export type TenantSupportNote = {
  id: string;
  authorEmail: string;
  note: string;
  createdAt: string;
};

/**
 * Everything the Owner console's tenant-detail view is allowed to show:
 * operational status, config, and counts. No response content, no
 * per-employee identity beyond a count (see
 * docs/strategy/OWNER_CONTROL_ROOM_SPEC.md §3/§9).
 */
export type TenantDetail = {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
  primaryContactEmail: string | null;
  dataResidencyRegion: string;
  planTier: TenantPlanTier;
  features: Record<string, boolean>;
  minGroupSize: number;
  employeeCount: number;
  latestCycle: {
    id: string;
    name: string;
    status: string;
    participantCount: number;
    respondedCount: number;
    completionRate: number;
  } | null;
  supportNotes: TenantSupportNote[];
  /** Real, accepted members only -- not pending invites (that's a tenant-side, not Owner-side, concern). */
  members: Array<{ email: string; role: UserRole; joinedAt: string }>;
};

export type PlatformAttentionItem = {
  tenantId: string;
  tenantName: string;
  kind: "no_employees" | "stalled_draft" | "delivery_failures" | "inactive_30d";
  detail: string;
};

export type PlatformActivityItem = {
  tenantId: string;
  tenantName: string;
  eventKey: OnboardingEventKey;
  occurredAt: string;
};

export type PlatformOverview = {
  activeTenantCount: number;
  liveSurveyCount: number;
  totalEmployeeCount: number;
  inactiveTenantCount: number;
  tenantGrowth: Array<{ weekStart: string; cumulativeTenants: number }>;
  attention: PlatformAttentionItem[];
  recentActivity: PlatformActivityItem[];
};

/**
 * A tenant's own view of their plan/settings -- read-only for plan/features
 * (the Owner console controls those), but minGroupSize is tenant-adjustable
 * within the floor (see docs/strategy/CLIENT_TENANT_ADMIN_SPEC.md §7).
 */
export type TenantSelfSettings = {
  minGroupSize: number;
  dataResidencyRegion: string;
  planTier: TenantPlanTier;
  features: Record<string, boolean>;
  // null = SOS button does not render for respondents. No default/fallback
  // (e.g. to the customer_admin contact) -- see 0023_sos_reports.sql.
  safetyContactEmail: string | null;
  // Never the password -- just enough for the settings UI to show
  // "configured" vs "not configured". null smtpConfigured means invite/
  // reminder email falls back to the global Resend sender.
  smtpConfigured: boolean;
  smtpFromEmail: string | null;
  // Never the webhook URL itself -- just enough for the settings UI to
  // show "connected" vs "not connected", same convention as smtpConfigured.
  slackConnected: boolean;
};

export type CycleAction = {
  id: string;
  authorEmail: string;
  actionText: string;
  createdAt: string;
};

export type PlatformUsageHealth = {
  totalSurveysCreated: number;
  totalResponsesSubmitted: number;
  invitesSent: number;
  invitesPending: number;
  invitesFailed: number;
  databaseHealthy: boolean;
};

export type EmployeeImportRecord = {
  email: string;
  name?: string;
  team?: string;
  location?: string;
  // Captured now, unused until Manager/Team scope ships (v1.1+) -- this is
  // the org chart, no separate builder needed. See
  // docs/strategy/SAFERSAY_FINAL_ARCHITECTURE.md §5.
  managerEmail?: string;
  // Only ever set by the HRIS sync webhook (/api/employees/sync), never
  // CSV import -- matching still keys on email either way (see
  // 0031_employee_sync.sql); these ride along for a future vendor
  // connector to reconcile against without a schema change then.
  externalId?: string;
  sourceSystem?: string;
};

export type IssuedParticipantToken = {
  employeeId: string;
  email: string;
  name?: string;
  rawToken: string;
};

export type InviteOutboxSummary = {
  cycleId: string;
  pendingInvites: number;
  queuedInvites: number;
  sentInvites: number;
  pendingReminders: number;
  queuedReminders: number;
  sentReminders: number;
};

export type InviteOutboxRow = {
  id: string;
  cycleId: string;
  deliveryType: "invite" | "reminder";
  deliveryStatus: "pending" | "queued" | "sent" | "failed";
  email: string;
  name: string | null;
  reminderCount: number;
  tokenStatus: "issued" | "spent" | "revoked";
  respondentPath: string | null;
};

export type QueuedInviteDelivery = InviteOutboxRow & {
  outboxId: string;
};

export type PilotIdentitySummary = {
  employees: number;
  participants: number;
  issuedTokens: number;
  spentTokens: number;
  pendingInvites: number;
  queuedInvites: number;
  sentInvites: number;
};

export type QuestionType = "likert_5" | "enps_0_10" | "open_text" | "multiple_choice" | "ranking" | "matrix";

export type ResponseAnswerInput = {
  questionId: string;
  numberValue?: number;
  textValue?: string;
  // multiple_choice/matrix: the selected option keys, no rank. ranking:
  // every ranked option key, in the respondent's chosen order -- set
  // `ranked: true` so the repository stores each key's array position as
  // its rank; other types must leave `ranked` unset.
  optionKeys?: string[];
  ranked?: boolean;
};

/** A multiple_choice/ranking option, or one column of a matrix row. */
export type QuestionOption = { key: string; label: string };

/**
 * Structural-only skip-logic condition (Option B -- see plan history).
 * `attribute` is deliberately restricted to the two respondent facts
 * identity.employees actually carries and responses.submissions already
 * snapshots at invite time (segment_team/segment_location) -- there is no
 * role or tenure column in this schema. Never a prior answer -- enforced
 * in the /api/cycles/[id]/questions PATCH validation, not just this type.
 */
export type ShowIfCondition = {
  attribute: "team" | "location";
  op: "eq" | "neq";
  value: string;
};

export type RespondentSurveyQuestion = {
  id: string;
  position: number;
  text: string;
  type: QuestionType;
  construct: string | null;
  optional: boolean;
  options: QuestionOption[] | null;
  // Only set for matrix-row questions; rows sharing a matrix_group_id
  // render as one grid on the taker surface.
  matrixGroupId: string | null;
  showIf: ShowIfCondition | null;
};

export type RespondentSurveySession = {
  cycleId: string;
  cycleName: string;
  templateName: string;
  questions: RespondentSurveyQuestion[];
};

/**
 * Reporting scope: what slice of the org a report is aggregated over.
 * v1 only ever passes { type: "org" } -- Department/Team scoping is
 * deferred to v1.1+ (see docs/strategy/SAFERSAY_FINAL_ARCHITECTURE.md
 * §4). The parameter exists now so adding those scopes later is a query
 * change, not a reporting-layer rewrite.
 */
export type QuestionBankItem = {
  id: string;
  construct: string | null;
  text: string;
  questionType: "scale" | "open_text";
};

export type ReportScope =
  | { type: "org" }
  | { type: "department"; department: string }
  | { type: "team"; managerEmail: string };

export type ProtectedReport =
  | { protected: true; n: number; rows: [] }
  | {
      protected: false;
      n: number;
      rows: Array<{ questionId: string; label?: string; construct?: string | null; n: number; average: number | null }>;
    };

/**
 * Open-text answers, gated at a stricter threshold than numeric scores
 * (see getProtectedOpenTextReport -- always minGroupSize + 3, never the
 * bare numeric threshold) since a sentence of free text is more
 * identifying than a number. `answers` are the raw, unedited strings --
 * this app deliberately does not filter or redact them (see
 * ProtectedReportPanel's content-note banner).
 */
export type ProtectedTextReport =
  | { protected: true; n: number; rows: [] }
  | {
      protected: false;
      n: number;
      rows: Array<{ questionId: string; label?: string; n: number; answers: string[] }>;
    };

/**
 * One question's average across a set of cycles, oldest first. Cycles are
 * matched by normalized question text (see surveyCycleService.ts -- edited
 * templates get a fresh question_id per cycle, so text is the only stable
 * join key across cycles). A point with `protected: true` means that
 * cycle's own min_group_size wasn't met for this question; `average` is
 * null and must not be rendered as a real score.
 */
export type CycleTrendPoint = {
  cycleId: string;
  cycleName: string;
  // Repeat cycles of the same template often share an identical cycleName
  // (e.g. two "Engagement Check" runs) -- the date is what actually
  // disambiguates them in a shared legend, so it travels with the point
  // rather than being looked up separately.
  cycleCreatedAt: string;
  n: number;
  average: number | null;
  protected: boolean;
};

export type CycleTrendQuestion = {
  questionText: string;
  points: CycleTrendPoint[];
};

/**
 * Per-option tallies for multiple_choice/ranking/matrix questions. Each
 * option's pick-count is suppressed independently (see
 * responses.report_option_tallies, 0030) -- a rare option is as
 * identifying as a numeric outlier -- so `options` only ever contains
 * options that individually cleared the threshold, never the full set
 * with some counts zeroed out (that would still leak "someone picked the
 * missing one"). `avgRank` is only meaningful for ranking questions.
 */
export type ProtectedOptionReport =
  | { protected: true; n: number; rows: [] }
  | {
      protected: false;
      n: number;
      rows: Array<{
        questionId: string;
        label?: string;
        options: Array<{ optionKey: string; n: number; avgRank: number | null }>;
      }>;
    };
