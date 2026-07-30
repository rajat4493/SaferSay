export type SurveyStatus = "draft" | "open" | "closed";

export type EmployeeRecord = {
  id: string;
  email: string;
  name: string;
  team: string;
};

export type ParticipantRecord = {
  employeeId: string;
  cycleId: string;
  token: string;
  status: "issued" | "spent";
  reminderCount: number;
};

export type SurveyCycleRecord = {
  id: string;
  name: string;
  template: string;
  status: SurveyStatus;
  opensAt: string;
  closesAt: string;
};

export type SubmissionRecord = {
  id: string;
  cycleId: string;
  spentToken: string;
  submittedAtBucket: string;
};

export type AnswerRecord = {
  submissionId: string;
  questionId: string;
  value: number;
};

export type SurveyData = {
  identity: {
    employees: EmployeeRecord[];
    participants: ParticipantRecord[];
  };
  responses: {
    cycles: SurveyCycleRecord[];
    submissions: SubmissionRecord[];
    answers: AnswerRecord[];
  };
};

export const questionBank = [
  { id: "q_role", label: "Role clarity", text: "I understand what is expected of me at work." },
  { id: "q_manager", label: "Manager support", text: "My manager gives me the support I need to do good work." },
  { id: "q_recognition", label: "Recognition", text: "Good work is noticed and recognised here." },
  { id: "q_workload", label: "Workload", text: "My workload is sustainable." },
];

export const initialSurveyData: SurveyData = {
  identity: {
    employees: [],
    participants: [],
  },
  responses: {
    cycles: [
      {
        id: "cycle_1",
        name: "Engagement Check",
        template: "Engagement Check",
        status: "draft",
        opensAt: "",
        closesAt: "",
      },
    ],
    submissions: [],
    answers: [],
  },
};

export function seedEmployees(): EmployeeRecord[] {
  return Array.from({ length: 31 }, (_, index) => ({
    id: `employee_${index + 1}`,
    email: `employee${index + 1}@company.com`,
    name: `Employee ${index + 1}`,
    team: ["Product", "Sales", "Operations", "Leadership"][index % 4],
  }));
}

export function createParticipantTokens(cycleId: string, employees: EmployeeRecord[]): ParticipantRecord[] {
  return employees.map((employee, index) => ({
    employeeId: employee.id,
    cycleId,
    token: `demo-token-${index + 1}`,
    status: "issued",
    reminderCount: 0,
  }));
}

export function submitTokenResponse(data: SurveyData, token: string, values: number[]): SurveyData {
  const participant = data.identity.participants.find((item) => item.token === token);
  if (!participant || participant.status === "spent") return data;

  const submissionId = `submission_${data.responses.submissions.length + 1}`;
  return {
    identity: {
      ...data.identity,
      participants: data.identity.participants.map((item) =>
        item.token === token ? { ...item, status: "spent" } : item,
      ),
    },
    responses: {
      ...data.responses,
      submissions: [
        ...data.responses.submissions,
        {
          id: submissionId,
          cycleId: participant.cycleId,
          spentToken: token,
          submittedAtBucket: new Date().toISOString().slice(0, 10),
        },
      ],
      answers: [
        ...data.responses.answers,
        ...questionBank.map((question, index) => ({
          submissionId,
          questionId: question.id,
          value: values[index] ?? 4,
        })),
      ],
    },
  };
}

export function buildReport(data: SurveyData, cycleId: string, minGroupSize = 5) {
  const submissions = data.responses.submissions.filter((submission) => submission.cycleId === cycleId);
  if (submissions.length < minGroupSize) {
    return { protected: true as const, n: submissions.length, rows: [] };
  }

  const submissionIds = new Set(submissions.map((submission) => submission.id));
  const rows = questionBank.map((question) => {
    const answers = data.responses.answers.filter(
      (answer) => submissionIds.has(answer.submissionId) && answer.questionId === question.id,
    );
    const average = answers.reduce((sum, answer) => sum + answer.value, 0) / answers.length;
    return {
      label: question.label,
      value: average.toFixed(1),
      width: `${Math.round((average / 5) * 100)}%`,
    };
  });

  return { protected: false as const, n: submissions.length, rows };
}
