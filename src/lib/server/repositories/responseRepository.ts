import { randomUUID } from "crypto";
import type { Queryable } from "@/lib/server/db/tenantPool";
import { ResponseAnswerInput, ProtectedReport, ReportScope, RespondentSurveySession } from "./types";

const orgScope: ReportScope = { type: "org" };

/**
 * Cycles created without an explicit name are stored as `"{tenantName}
 * {templateName}"` (see createTenantSurveyCycle) -- the sidebar already
 * shows workspace context, so that prefix is redundant noise on every
 * survey list. Strip it for display only; the stored name is untouched.
 */
function stripTenantPrefix(name: string, tenantName?: string): string {
  if (!tenantName) return name;
  const prefix = `${tenantName} `;
  return name.startsWith(prefix) ? name.slice(prefix.length) : name;
}

export class ResponseRepository {
  constructor(private readonly db: Queryable) {}

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

  async getRespondentSurveySession(cycleId: string): Promise<RespondentSurveySession | null> {
    const cycleResult = await this.db.query<{
      cycle_id: string;
      cycle_name: string;
      template_name: string;
    }>(
      `select c.id as cycle_id, c.name as cycle_name, t.name as template_name
       from responses.survey_cycles c
       join responses.survey_templates t on t.id = c.template_id
       where c.id = $1
       limit 1`,
      [cycleId],
    );
    const cycle = cycleResult.rows[0];
    if (!cycle) return null;

    const questions = await this.db.query<{
      id: string;
      position: number;
      question_text: string;
      question_type: "likert_5" | "enps_0_10" | "open_text";
      construct: string | null;
      is_optional: boolean;
    }>(
      `select id, position, question_text, question_type, construct, is_optional
       from responses.template_questions
       where template_id = (
         select template_id from responses.survey_cycles where id = $1
       )
       order by position`,
      [cycleId],
    );

    return {
      cycleId: cycle.cycle_id,
      cycleName: cycle.cycle_name,
      templateName: cycle.template_name,
      questions: questions.rows.map((question) => ({
        id: question.id,
        position: question.position,
        text: question.question_text,
        type: question.question_type,
        construct: question.construct,
        optional: question.is_optional,
      })),
    };
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

  async getProtectedReportForTenant(
    tenantId: string,
    cycleId: string,
    minGroupSize = 5,
    scope: ReportScope = orgScope,
  ): Promise<ProtectedReport> {
    if (scope.type !== "org") {
      // Department/Team scoping isn't implemented yet (v1.1+) -- fail loudly
      // rather than silently returning org-wide data under a narrower
      // scope's name, which would be a confidentiality-adjacent bug.
      throw new Error(`Report scope "${scope.type}" is not implemented yet.`);
    }

    const countResult = await this.db.query<{ n: string }>(
      "select count(*)::text as n from responses.submissions where tenant_id = $1 and cycle_id = $2",
      [tenantId, cycleId],
    );
    const n = Number(countResult.rows[0]?.n ?? 0);
    if (n < minGroupSize) return { protected: true, n, rows: [] };

    const result = await this.db.query<{ question_id: string; question_text: string; n: number; average: string | null }>(
      `select r.question_id, q.question_text, r.n, r.average
       from responses.report_question_scores($1, $2) r
       join responses.survey_cycles c on c.id = $1
       join responses.template_questions q on q.id = r.question_id
       where c.tenant_id = $3
         and r.protected = false`,
      [cycleId, minGroupSize, tenantId],
    );
    return {
      protected: false,
      n,
      rows: result.rows.map((row) => ({
        questionId: row.question_id,
        label: row.question_text,
        n: row.n,
        average: row.average === null ? null : Number(row.average),
      })),
    };
  }

  /**
   * All cycles for the tenant, newest first, with a response count per
   * cycle. Response *count* (n) is aggregate-only and already shown
   * unprotected elsewhere (see getProtectedReport) -- only the per-question
   * breakdown is gated by min_group_size, so surfacing n here on a list of
   * a tenant's own surveys doesn't cross the confidentiality line.
   */
  async listCyclesForTenant(tenantId: string, tenantName?: string) {
    const result = await this.db.query<{
      id: string;
      name: string;
      status: string;
      min_group_size: number;
      created_at: string;
      response_count: number;
    }>(
      `select c.id, c.name, c.status, c.min_group_size, c.created_at,
              coalesce(s.n, 0)::int as response_count
       from responses.survey_cycles c
       left join (
         select cycle_id, count(*)::int as n
         from responses.submissions
         where tenant_id = $1
         group by cycle_id
       ) s on s.cycle_id = c.id
       where c.tenant_id = $1
       order by c.created_at desc`,
      [tenantId],
    );
    return result.rows.map((row) => ({
      id: row.id,
      name: stripTenantPrefix(row.name, tenantName),
      status: row.status,
      minGroupSize: row.min_group_size,
      createdAt: row.created_at,
      responseCount: row.response_count,
    }));
  }

  async getCycleForTenant(tenantId: string, cycleId: string, tenantName?: string) {
    const result = await this.db.query<{
      id: string;
      name: string;
      status: string;
      min_group_size: number;
      created_at: string;
    }>(
      `select id, name, status, min_group_size, created_at
       from responses.survey_cycles
       where tenant_id = $1 and id = $2
       limit 1`,
      [tenantId, cycleId],
    );
    const row = result.rows[0];
    if (!row) return null;
    return {
      id: row.id,
      name: stripTenantPrefix(row.name, tenantName),
      status: row.status,
      minGroupSize: row.min_group_size,
      createdAt: row.created_at,
    };
  }

  async closeCycle(tenantId: string, cycleId: string) {
    const result = await this.db.query(
      `update responses.survey_cycles
       set status = 'closed'
       where tenant_id = $1 and id = $2 and status <> 'closed'`,
      [tenantId, cycleId],
    );
    return (result.rowCount ?? 0) > 0;
  }

  async getLatestCycleForTenant(tenantId: string, tenantName?: string) {
    const result = await this.db.query<{ id: string; name: string; min_group_size: number }>(
      `select id, name, min_group_size
       from responses.survey_cycles
       where tenant_id = $1
       order by created_at desc
       limit 1`,
      [tenantId],
    );
    const row = result.rows[0];
    if (!row) return null;
    return { ...row, name: stripTenantPrefix(row.name, tenantName) };
  }

  async getLatestProtectedReportForTenant(tenantId: string, scope: ReportScope = orgScope, tenantName?: string) {
    const cycle = await this.getLatestCycleForTenant(tenantId, tenantName);
    if (!cycle) {
      return {
        cycle: null,
        report: { protected: true as const, n: 0, rows: [] },
      };
    }
    return {
      cycle: { id: cycle.id, name: cycle.name, minGroupSize: cycle.min_group_size },
      report: await this.getProtectedReportForTenant(tenantId, cycle.id, cycle.min_group_size, scope),
    };
  }
}
