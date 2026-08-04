export type TenantRecord = {
  id: string;
  name: string;
  slug: string;
};

export type UserRole = "owner" | "admin" | "employee";

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

export type ResponseAnswerInput = {
  questionId: string;
  numberValue?: number;
  textValue?: string;
};

export type RespondentSurveyQuestion = {
  id: string;
  position: number;
  text: string;
  type: "likert_5" | "enps_0_10" | "open_text";
  construct: string | null;
  optional: boolean;
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
export type ReportScope =
  | { type: "org" }
  | { type: "department"; department: string }
  | { type: "team"; managerEmail: string };

export type ProtectedReport =
  | { protected: true; n: number; rows: [] }
  | {
      protected: false;
      n: number;
      rows: Array<{ questionId: string; label?: string; n: number; average: number | null }>;
    };
