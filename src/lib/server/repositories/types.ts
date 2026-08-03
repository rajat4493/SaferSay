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

export type EmployeeImportRecord = {
  email: string;
  name?: string;
  team?: string;
  location?: string;
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

export type ProtectedReport =
  | { protected: true; n: number; rows: [] }
  | {
      protected: false;
      n: number;
      rows: Array<{ questionId: string; label?: string; n: number; average: number | null }>;
    };
