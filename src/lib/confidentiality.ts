import { createHash, randomBytes, timingSafeEqual } from "crypto";

export const MIN_GROUP_SIZE = 5;

export const FORBIDDEN_RESPONSE_COLUMNS = [
  "user_id",
  "employee_id",
  "email",
  "name",
  "provider_subject",
  "sso_subject",
  "ip_address",
  "user_agent",
  "invitation_id",
] as const;

export type Employee = {
  id: string;
  tenantId: string;
  email: string;
  name?: string;
  team?: string;
  location?: string;
};

export type Participant = {
  tenantId: string;
  cycleId: string;
  employeeId: string;
  tokenHash: string;
  status: "issued" | "spent" | "revoked";
  issuedAt: Date;
  spentAt?: Date;
  lastRemindedAt?: Date;
  reminderCount: number;
};

export type Submission = {
  id: string;
  tenantId: string;
  cycleId: string;
  spentTokenHash: string;
  submittedAtBucket: string;
  segmentTeam?: string;
  segmentLocation?: string;
};

export type Answer = {
  submissionId: string;
  questionId: string;
  numberValue?: number;
  textValue?: string;
};

export type IdentityStore = {
  employees: Employee[];
  participants: Participant[];
};

export type ResponseStore = {
  submissions: Submission[];
  answers: Answer[];
};

export type IssuedToken = {
  rawToken: string;
  tokenHash: string;
};

export function hashSubmissionToken(rawToken: string, secret: string): string {
  return createHash("sha256").update(`${secret}:${rawToken}`).digest("hex");
}

export function issueSubmissionToken(params: {
  identityStore: IdentityStore;
  tenantId: string;
  cycleId: string;
  employeeId: string;
  secret: string;
}): IssuedToken {
  const rawToken = randomBytes(32).toString("base64url");
  const tokenHash = hashSubmissionToken(rawToken, params.secret);

  params.identityStore.participants.push({
    tenantId: params.tenantId,
    cycleId: params.cycleId,
    employeeId: params.employeeId,
    tokenHash,
    status: "issued",
    issuedAt: new Date(),
    reminderCount: 0,
  });

  return { rawToken, tokenHash };
}

export function submitConfidentialResponse(params: {
  identityStore: IdentityStore;
  responseStore: ResponseStore;
  rawToken: string;
  secret: string;
  answers: Omit<Answer, "submissionId">[];
  segmentTeam?: string;
  segmentLocation?: string;
  now?: Date;
}): Submission {
  const tokenHash = hashSubmissionToken(params.rawToken, params.secret);
  const participant = params.identityStore.participants.find((candidate) =>
    safeEqual(candidate.tokenHash, tokenHash),
  );

  if (!participant || participant.status !== "issued") {
    throw new Error("Token is invalid or already spent.");
  }

  const submission: Submission = {
    id: randomBytes(16).toString("hex"),
    tenantId: participant.tenantId,
    cycleId: participant.cycleId,
    spentTokenHash: tokenHash,
    submittedAtBucket: toDateBucket(params.now ?? new Date()),
    segmentTeam: params.segmentTeam,
    segmentLocation: params.segmentLocation,
  };

  assertResponseHasNoIdentityFields(submission);

  params.responseStore.submissions.push(submission);
  params.responseStore.answers.push(
    ...params.answers.map((answer) => ({
      ...answer,
      submissionId: submission.id,
    })),
  );

  participant.status = "spent";
  participant.spentAt = params.now ?? new Date();

  return submission;
}

export function getReminderTargets(params: {
  identityStore: IdentityStore;
  tenantId: string;
  cycleId: string;
}): Participant[] {
  return params.identityStore.participants.filter(
    (participant) =>
      participant.tenantId === params.tenantId &&
      participant.cycleId === params.cycleId &&
      participant.status === "issued",
  );
}

export function reportQuestionScore(params: {
  responseStore: ResponseStore;
  cycleId: string;
  questionId: string;
  minGroupSize?: number;
}):
  | { protected: true; n: number; average: null }
  | { protected: false; n: number; average: number } {
  const answers = params.responseStore.answers.filter((answer) => {
    const submission = params.responseStore.submissions.find(
      (candidate) => candidate.id === answer.submissionId,
    );

    return (
      submission?.cycleId === params.cycleId &&
      answer.questionId === params.questionId &&
      typeof answer.numberValue === "number"
    );
  });

  const minGroupSize = params.minGroupSize ?? MIN_GROUP_SIZE;
  if (answers.length < minGroupSize) {
    return { protected: true, n: answers.length, average: null };
  }

  const total = answers.reduce((sum, answer) => sum + (answer.numberValue ?? 0), 0);
  return { protected: false, n: answers.length, average: total / answers.length };
}

export function assertResponseHasNoIdentityFields(record: object): void {
  const columns = new Set(Object.keys(record).map((key) => toSnakeCase(key)));
  const forbidden = FORBIDDEN_RESPONSE_COLUMNS.filter((column) => columns.has(column));

  if (forbidden.length > 0) {
    throw new Error(`Response record contains forbidden identity fields: ${forbidden.join(", ")}`);
  }
}

function toDateBucket(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function safeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

function toSnakeCase(value: string): string {
  return value.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}
