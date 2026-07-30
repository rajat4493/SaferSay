import { createHash, randomBytes, randomUUID } from "crypto";
import { Pool } from "pg";

export const SERVER_MIN_GROUP_SIZE = 5;
const TOKEN_SECRET = process.env.TOKEN_SECRET ?? "local-development-token-secret";

export type ServerEmployee = {
  id: string;
  tenantId: string;
  email: string;
  name: string;
  team?: string;
  location?: string;
};

export type ServerParticipant = {
  id: string;
  tenantId: string;
  cycleId: string;
  employeeId: string;
  tokenHash: string;
  status: "issued" | "spent" | "revoked";
  reminderCount: number;
};

export type ServerCycle = {
  id: string;
  tenantId: string;
  name: string;
  status: "draft" | "scheduled" | "open" | "closed";
  paymentStatus: "unpaid" | "pending" | "paid" | "free_preview";
};

export type ServerSubmission = {
  id: string;
  tenantId: string;
  cycleId: string;
  spentTokenHash: string;
};

export type ServerAnswer = {
  submissionId: string;
  questionId: string;
  numberValue: number;
};

export type InviteTarget = {
  email: string;
  name: string;
  token: string;
};

type MemoryStore = {
  employees: ServerEmployee[];
  participants: Array<ServerParticipant & { rawToken: string }>;
  cycles: ServerCycle[];
  submissions: ServerSubmission[];
  answers: ServerAnswer[];
};

const memoryStore: MemoryStore = {
  employees: [],
  participants: [],
  cycles: [
    {
      id: "00000000-0000-4000-8000-000000000001",
      tenantId: "00000000-0000-4000-8000-000000000010",
      name: "Engagement Check",
      status: "draft",
      paymentStatus: "free_preview",
    },
  ],
  submissions: [],
  answers: [],
};

let pool: Pool | null = null;

function getPool() {
  if (!process.env.DATABASE_URL) return null;
  pool ??= new Pool({ connectionString: process.env.DATABASE_URL });
  return pool;
}

export function hashServerToken(rawToken: string) {
  return createHash("sha256").update(`${TOKEN_SECRET}:${rawToken}`).digest("hex");
}

export function getDefaultCycle() {
  return memoryStore.cycles[0];
}

export async function seedServerEmployees(tenantId = getDefaultCycle().tenantId, cycleId = getDefaultCycle().id) {
  const pg = getPool();
  if (pg) {
    throw new Error("Postgres seed endpoint is intentionally not implemented without a tenant import flow.");
  }

  memoryStore.submissions = [];
  memoryStore.answers = [];
  memoryStore.cycles = memoryStore.cycles.map((cycle) =>
    cycle.id === cycleId ? { ...cycle, status: "draft", paymentStatus: "free_preview" } : cycle,
  );
  memoryStore.employees = Array.from({ length: 31 }, (_, index) => ({
    id: randomUUID(),
    tenantId,
    email: `employee${index + 1}@company.com`,
    name: `Employee ${index + 1}`,
    team: ["Product", "Sales", "Operations", "Leadership"][index % 4],
  }));
  memoryStore.participants = memoryStore.employees.map((employee) => {
    const rawToken = randomBytes(24).toString("base64url");
    return {
      id: randomUUID(),
      tenantId,
      cycleId,
      employeeId: employee.id,
      rawToken,
      tokenHash: hashServerToken(rawToken),
      status: "issued",
      reminderCount: 0,
    };
  });

  return { employees: memoryStore.employees.length, participants: memoryStore.participants.length };
}

export async function markCyclePaid(cycleId = getDefaultCycle().id) {
  const cycle = memoryStore.cycles.find((item) => item.id === cycleId);
  if (!cycle) throw new Error("Cycle not found.");
  cycle.paymentStatus = "paid";
  return cycle;
}

export async function launchPaidCycle(cycleId = getDefaultCycle().id) {
  const cycle = memoryStore.cycles.find((item) => item.id === cycleId);
  if (!cycle) throw new Error("Cycle not found.");
  if (!["paid", "free_preview"].includes(cycle.paymentStatus)) {
    throw new Error("Cycle must be paid before launch.");
  }
  cycle.status = "open";
  return cycle;
}

export async function getInviteTargets(cycleId = getDefaultCycle().id): Promise<InviteTarget[]> {
  return memoryStore.participants
    .filter((participant) => participant.cycleId === cycleId && participant.status === "issued")
    .map((participant) => {
      const employee = memoryStore.employees.find((item) => item.id === participant.employeeId);
      if (!employee) return null;
      return { email: employee.email, name: employee.name, token: participant.rawToken };
    })
    .filter((item): item is InviteTarget => Boolean(item));
}

export async function submitServerResponse(rawToken: string, answers: Array<{ questionId: string; numberValue: number }>) {
  const tokenHash = hashServerToken(rawToken);
  const participant = memoryStore.participants.find((item) => item.tokenHash === tokenHash);
  if (!participant || participant.status !== "issued") {
    throw new Error("Token is invalid or already spent.");
  }

  const submission: ServerSubmission = {
    id: randomUUID(),
    tenantId: participant.tenantId,
    cycleId: participant.cycleId,
    spentTokenHash: tokenHash,
  };
  memoryStore.submissions.push(submission);
  memoryStore.answers.push(
    ...answers.map((answer) => ({
      submissionId: submission.id,
      questionId: answer.questionId,
      numberValue: answer.numberValue,
    })),
  );
  participant.status = "spent";
  return submission;
}

export async function getProtectedServerReport(cycleId = getDefaultCycle().id, minGroupSize = SERVER_MIN_GROUP_SIZE) {
  const submissions = memoryStore.submissions.filter((submission) => submission.cycleId === cycleId);
  if (submissions.length < minGroupSize) {
    return { protected: true, n: submissions.length, rows: [] };
  }

  const submissionIds = new Set(submissions.map((submission) => submission.id));
  const questionIds = [...new Set(memoryStore.answers.map((answer) => answer.questionId))];
  const rows = questionIds.map((questionId) => {
    const answers = memoryStore.answers.filter(
      (answer) => answer.questionId === questionId && submissionIds.has(answer.submissionId),
    );
    const average = answers.reduce((sum, answer) => sum + answer.numberValue, 0) / answers.length;
    return { questionId, average: Number(average.toFixed(2)), n: answers.length };
  });
  return { protected: false, n: submissions.length, rows };
}

export async function incrementReminderCounts(cycleId = getDefaultCycle().id) {
  const targets = memoryStore.participants.filter(
    (participant) => participant.cycleId === cycleId && participant.status === "issued",
  );
  targets.forEach((target) => {
    target.reminderCount += 1;
  });
  return targets.length;
}

export function getMemorySnapshotForTests() {
  return memoryStore;
}
