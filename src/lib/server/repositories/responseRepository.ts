import { randomUUID } from "crypto";
import { Pool } from "pg";
import { ResponseAnswerInput, ProtectedReport } from "./types";

export class ResponseRepository {
  constructor(private readonly db: Pool) {}

  async createCycle(params: {
    tenantId: string;
    templateId: string;
    name: string;
    paymentStatus?: "unpaid" | "pending" | "paid" | "free_preview";
  }) {
    const id = randomUUID();
    await this.db.query(
      `insert into responses.survey_cycles (id, tenant_id, template_id, name, status, payment_status)
       values ($1, $2, $3, $4, 'draft', $5)`,
      [id, params.tenantId, params.templateId, params.name, params.paymentStatus ?? "unpaid"],
    );
    return { id };
  }

  async submitAnswers(params: {
    tenantId: string;
    cycleId: string;
    spentTokenHash: string;
    answers: ResponseAnswerInput[];
  }) {
    const submissionId = randomUUID();
    await this.db.query(
      `insert into responses.submissions
        (id, tenant_id, cycle_id, spent_token_hash, submitted_at_bucket)
       values ($1, $2, $3, $4, current_date)`,
      [submissionId, params.tenantId, params.cycleId, params.spentTokenHash],
    );

    for (const answer of params.answers) {
      await this.db.query(
        `insert into responses.answers
          (id, submission_id, question_id, number_value, text_value)
         values ($1, $2, $3, $4, $5)`,
        [randomUUID(), submissionId, answer.questionId, answer.numberValue ?? null, answer.textValue ?? null],
      );
    }
    return { submissionId };
  }

  async getProtectedReport(cycleId: string, minGroupSize = 5): Promise<ProtectedReport> {
    const countResult = await this.db.query<{ n: string }>(
      "select count(*)::text as n from responses.submissions where cycle_id = $1",
      [cycleId],
    );
    const n = Number(countResult.rows[0]?.n ?? 0);
    if (n < minGroupSize) return { protected: true, n, rows: [] };

    const result = await this.db.query<{ question_id: string; n: number; average: string | null }>(
      `select question_id, n, average
       from responses.report_question_scores($1, $2)
       where protected = false`,
      [cycleId, minGroupSize],
    );
    return {
      protected: false,
      n,
      rows: result.rows.map((row) => ({
        questionId: row.question_id,
        n: row.n,
        average: row.average === null ? null : Number(row.average),
      })),
    };
  }

  async getProtectedReportForTenant(tenantId: string, cycleId: string, minGroupSize = 5): Promise<ProtectedReport> {
    const countResult = await this.db.query<{ n: string }>(
      "select count(*)::text as n from responses.submissions where tenant_id = $1 and cycle_id = $2",
      [tenantId, cycleId],
    );
    const n = Number(countResult.rows[0]?.n ?? 0);
    if (n < minGroupSize) return { protected: true, n, rows: [] };

    const result = await this.db.query<{ question_id: string; n: number; average: string | null }>(
      `select r.question_id, r.n, r.average
       from responses.report_question_scores($1, $2) r
       join responses.survey_cycles c on c.id = $1
       where c.tenant_id = $3
         and r.protected = false`,
      [cycleId, minGroupSize, tenantId],
    );
    return {
      protected: false,
      n,
      rows: result.rows.map((row) => ({
        questionId: row.question_id,
        n: row.n,
        average: row.average === null ? null : Number(row.average),
      })),
    };
  }
}
