export type TenantRecord = {
  id: string;
  name: string;
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

export type ResponseAnswerInput = {
  questionId: string;
  numberValue?: number;
  textValue?: string;
};

export type ProtectedReport =
  | { protected: true; n: number; rows: [] }
  | {
      protected: false;
      n: number;
      rows: Array<{ questionId: string; n: number; average: number | null }>;
    };
