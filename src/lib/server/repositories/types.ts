import type { BillingTerms } from "@/lib/billingCatalog";

export type TenantRecord = {
  id: string;
  name: string;
  slug: string;
};

/**
 * Tenant roles. Platform SuperAdmin is deliberately not included here: it is
 * an environment-allowlisted SaferSay operator capability, not a role a
 * customer can grant inside their workspace.
 */
export type UserRole =
  | "customer_admin"
  | "survey_creator"
  | "auditor"
  | "people_leader"
  | "integration_admin"
  | "compliance_reviewer"
  | "employee";

export type UserRecord = {
  id: string;
  tenantId: string;
  authProvider: string;
  providerSubject: string;
  email: string;
  name: string | null;
  role: UserRole;
  // Only meaningful for role === "people_leader": the identity.employees
  // row whose reporting subtree this user is scoped to. Never set (or
  // read) for any other role -- see getProtectedReportForTenant's team
  // scope and /api/report's server-side enforcement that a people_leader
  // can only ever request their own assigned subtree, never org-wide or
  // another manager's.
  peopleLeaderRootEmployeeId: string | null;
};

export type OnboardingEventKey = "signup" | "employees" | "cycle" | "tokens" | "outbox" | "queue" | "responses" | "report";

/** A teammate can never be invited as an employee/respondent. */
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
  billingTerms: BillingTerms;
  features: Record<string, boolean>;
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
  billingTerms: BillingTerms;
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
  billingTerms: BillingTerms;
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
  // Enterprise SSO (SAML) for staff roles only -- never survey takers.
  // ssoDomain is shown back to the admin for confirmation; the metadata
  // URL/XML and Supabase provider id are not (write-only, like SMTP's
  // password).
  ssoConnected: boolean;
  ssoDomain: string | null;
  // "we recognize and recommend, it's your choice" -- see ActionMode.
  actionMode: ActionMode;
};

/**
 * insights_only: free recognition/recommendation only (today's default),
 * nothing to track. tracked: commitments become trackable items with a
 * status and progress updates -- the tenant's opt-in choice. tracked_with_
 * rollup: adds an org-wide, customer_admin-only view of every commitment's
 * status across cycles -- visibility the workspace owner chose for
 * themselves, never an enforcement mechanism aimed at anyone else.
 */
export type ActionMode = "insights_only" | "tracked" | "tracked_with_rollup";

export type TenantSsoConfig = {
  domain: string | null;
  metadataUrl: string | null;
  hasMetadataXml: boolean;
  providerId: string | null;
  enabled: boolean;
};

export type CycleAction = {
  id: string;
  authorEmail: string;
  actionText: string;
  createdAt: string;
};

export type CycleCommitment = {
  id: string;
  cycleId: string;
  statement: string;
  targetDate: string;
  status: "published" | "in_progress" | "completed";
  progressUpdate: string | null;
  publishedAt: string;
  updatedAt: string;
  // 'insight' = created with one click from an AI Synthesis recommendation;
  // 'manual' = written from scratch. Both are equally real commitments --
  // this is provenance, not a quality signal.
  source: "manual" | "insight";
};

/** One tenant-wide row for the customer_admin-only rollup view --
 * everything a CycleCommitment has, plus which cycle it belongs to (by
 * name, not just id -- identity.cycle_commitments deliberately has no FK
 * to responses.survey_cycles, so the API route resolves this separately)
 * and whether it's overdue. */
export type CommitmentRollupItem = CycleCommitment & {
  cycleName: string;
  stale: boolean;
};

export type AvailableSurveyCredit = { id: string; expiresAt: string };

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

export type QuestionBankQuestionType = "scale" | "open_text" | "multiple_choice" | "ranking" | "matrix";

export type QuestionBankItem = {
  id: string;
  construct: string | null;
  text: string;
  questionType: QuestionBankQuestionType;
  // Only meaningful for multiple_choice/ranking/matrix -- null otherwise.
  // No show_if here: a branching condition is cycle-specific (gates one
  // question instance against that cycle's respondents), not a property
  // of a reusable question definition -- see plan history.
  options: QuestionOption[] | null;
};

/**
 * Reporting scope: what slice of the org a report is aggregated over.
 *
 * "team" scopes to one manager's full reporting subtree (a People
 * Leader's assigned scope -- see permissions.ts). ResponseRepository
 * never resolves manager hierarchy itself (that stays identity-side, see
 * IdentityRepository.getSubtreeTeamLabels/getSiblingManagerIds) -- the
 * caller (the /api/report route, for the people_leader role only) resolves
 * rootManagerId to its own subtree's team labels, plus every SIBLING
 * subtree's team labels at the same level (same parent manager, including
 * the root's own subtree), and passes the resolved sets in. This is what
 * lets getProtectedReportForTenant run a generalized complementary-
 * suppression check across sibling subtrees (see getManagerSubtreeReport)
 * -- the same differencing-attack guard department scope already has
 * (getDepartmentReleasability), one level up: if a viewer could see every
 * sibling subtree's report except one, they could back-calculate the
 * missing one by subtraction from the parent's own total. When a People
 * Leader's assigned subtree has fewer than k responses, /api/report may
 * resolve exactly one parent subtree instead; that fallback is still built
 * as a normal team scope and is never client-selectable.
 */
export type ReportScope =
  | { type: "org" }
  | { type: "department"; department: string }
  | {
      type: "team";
      rootManagerId: string;
      teamLabels: string[];
      siblingSubtrees: Array<{ managerId: string; teamLabels: string[] }>;
    };

export type ProtectedReport =
  | { protected: true; n: number; rows: [] }
  | {
      protected: false;
      n: number;
      rows: Array<{ questionId: string; label?: string; construct?: string | null; n: number; average: number | null; scaleMax?: 5 | 10 }>;
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
      rows: Array<{ questionId: string; label?: string; construct?: string | null; n: number; answers: string[] }>;
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
  // Lets a consumer normalize this point onto a common 0-10 scale before
  // averaging across questions of different types (see the Overview
  // dashboard's per-cycle overall-score derivation) -- see
  // scaleMaxForQuestionType.
  scaleMax: 5 | 10;
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

/**
 * eNPS classification (promoter 9-10 / passive 7-8 / detractor 0-6) for
 * enps_0_10 questions -- see responses.report_enps_buckets (0042). A
 * question only appears here when ALL THREE buckets independently clear
 * min_group_size; if even one bucket is too small, the whole question is
 * omitted rather than partially shown, because releasing two of three
 * bucket counts alongside the question's already-public total n would let
 * the third (suppressed) bucket be back-calculated by subtraction -- the
 * same differencing-attack shape getDepartmentReleasability guards
 * against, one level down. `score` is the standard NPS formula:
 * promoterPct - detractorPct, on a -100..100 scale.
 */
export type ProtectedEnpsReport =
  | { protected: true; n: number; rows: [] }
  | {
      protected: false;
      n: number;
      rows: Array<{
        questionId: string;
        label?: string;
        n: number;
        promoterPct: number;
        passivePct: number;
        detractorPct: number;
        score: number;
      }>;
    };
