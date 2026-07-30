import { describe, expect, it } from "vitest";
import {
  assertResponseHasNoIdentityFields,
  getReminderTargets,
  issueSubmissionToken,
  reportQuestionScore,
  submitConfidentialResponse,
  type IdentityStore,
  type ResponseStore,
} from "./confidentiality";

const secret = "test-secret";

describe("confidentiality spine", () => {
  it("stores answers without identity fields", () => {
    const identityStore = makeIdentityStore(5);
    const responseStore: ResponseStore = { submissions: [], answers: [] };
    const issued = issueSubmissionToken({
      identityStore,
      tenantId: "tenant_1",
      cycleId: "cycle_1",
      employeeId: "employee_1",
      secret,
    });

    const submission = submitConfidentialResponse({
      identityStore,
      responseStore,
      rawToken: issued.rawToken,
      secret,
      answers: [{ questionId: "q1", numberValue: 4 }],
      segmentTeam: "Product",
      now: new Date("2026-07-30T12:42:00Z"),
    });

    expect(submission).toMatchObject({
      tenantId: "tenant_1",
      cycleId: "cycle_1",
      submittedAtBucket: "2026-07-30",
      segmentTeam: "Product",
    });
    expect(submission).not.toHaveProperty("employeeId");
    expect(submission).not.toHaveProperty("email");
    expect(responseStore.answers).toHaveLength(1);
  });

  it("rejects identity-shaped fields in response records", () => {
    expect(() =>
      assertResponseHasNoIdentityFields({
        cycleId: "cycle_1",
        employeeId: "employee_1",
      }),
    ).toThrow(/forbidden identity fields/);
  });

  it("prevents duplicate submissions with the same token", () => {
    const identityStore = makeIdentityStore(1);
    const responseStore: ResponseStore = { submissions: [], answers: [] };
    const issued = issueSubmissionToken({
      identityStore,
      tenantId: "tenant_1",
      cycleId: "cycle_1",
      employeeId: "employee_1",
      secret,
    });

    submitConfidentialResponse({
      identityStore,
      responseStore,
      rawToken: issued.rawToken,
      secret,
      answers: [{ questionId: "q1", numberValue: 5 }],
    });

    expect(() =>
      submitConfidentialResponse({
        identityStore,
        responseStore,
        rawToken: issued.rawToken,
        secret,
        answers: [{ questionId: "q1", numberValue: 3 }],
      }),
    ).toThrow(/invalid or already spent/);
  });

  it("targets reminders from participation state only", () => {
    const identityStore = makeIdentityStore(3);
    const responseStore: ResponseStore = { submissions: [], answers: [] };
    const tokens = identityStore.employees.map((employee) =>
      issueSubmissionToken({
        identityStore,
        tenantId: "tenant_1",
        cycleId: "cycle_1",
        employeeId: employee.id,
        secret,
      }),
    );

    submitConfidentialResponse({
      identityStore,
      responseStore,
      rawToken: tokens[0].rawToken,
      secret,
      answers: [{ questionId: "q1", numberValue: 4 }],
    });

    const targets = getReminderTargets({ identityStore, tenantId: "tenant_1", cycleId: "cycle_1" });

    expect(targets.map((target) => target.employeeId)).toEqual(["employee_2", "employee_3"]);
    expect(responseStore.submissions).toHaveLength(1);
  });

  it("protects question scores below the minimum group size", () => {
    const identityStore = makeIdentityStore(4);
    const responseStore = submitMany(identityStore, 4);

    expect(reportQuestionScore({ responseStore, cycleId: "cycle_1", questionId: "q1" })).toEqual({
      protected: true,
      n: 4,
      average: null,
    });
  });

  it("renders question scores when the minimum group size is met", () => {
    const identityStore = makeIdentityStore(5);
    const responseStore = submitMany(identityStore, 5);

    expect(reportQuestionScore({ responseStore, cycleId: "cycle_1", questionId: "q1" })).toEqual({
      protected: false,
      n: 5,
      average: 4,
    });
  });
});

function makeIdentityStore(count: number): IdentityStore {
  return {
    employees: Array.from({ length: count }, (_, index) => ({
      id: `employee_${index + 1}`,
      tenantId: "tenant_1",
      email: `person${index + 1}@example.com`,
      team: "Product",
    })),
    participants: [],
  };
}

function submitMany(identityStore: IdentityStore, count: number): ResponseStore {
  const responseStore: ResponseStore = { submissions: [], answers: [] };

  identityStore.employees.slice(0, count).forEach((employee) => {
    const issued = issueSubmissionToken({
      identityStore,
      tenantId: "tenant_1",
      cycleId: "cycle_1",
      employeeId: employee.id,
      secret,
    });

    submitConfidentialResponse({
      identityStore,
      responseStore,
      rawToken: issued.rawToken,
      secret,
      answers: [{ questionId: "q1", numberValue: 4 }],
    });
  });

  return responseStore;
}
