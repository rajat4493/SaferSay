import { randomUUID } from "crypto";
import type { Queryable } from "@/lib/server/db/tenantPool";
import {
  ResponseAnswerInput,
  ProtectedReport,
  ProtectedTextReport,
  ProtectedOptionReport,
  QuestionBankItem,
  QuestionBankQuestionType,
  QuestionOption,
  QuestionType,
  ShowIfCondition,
  ReportScope,
  RespondentSurveySession,
  CycleTrendQuestion,
} from "./types";

const MAX_TREND_CYCLES = 6;

/** Trim/lowercase so cosmetic differences (whitespace, casing) don't split
 * an otherwise-identical question into two trend lines. */
function normalizeQuestionText(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, " ");
}

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
    // Already-canonicalized (see normalizeTeamLabel) and already-snapshotted
    // at invite-issuance time -- this method just stores the string, it
    // does not look anything up or normalize it further.
    segmentTeam?: string | null;
  }) {
    const submissionId = randomUUID();
    await this.db.query(
      `insert into responses.submissions
        (id, tenant_id, cycle_id, spent_token_hash, submitted_at_bucket, segment_team)
       values ($1, $2, $3, $4, current_date, $5)`,
      [submissionId, params.tenantId, params.cycleId, params.spentTokenHash, params.segmentTeam ?? null],
    );

    for (const answer of params.answers) {
      const answerId = randomUUID();
      await this.db.query(
        `insert into responses.answers
          (id, submission_id, question_id, number_value, text_value)
         values ($1, $2, $3, $4, $5)`,
        [answerId, submissionId, answer.questionId, answer.numberValue ?? null, answer.textValue ?? null],
      );

      for (const [index, optionKey] of (answer.optionKeys ?? []).entries()) {
        await this.db.query(
          `insert into responses.answer_options (id, answer_id, option_key, rank)
           values ($1, $2, $3, $4)`,
          [randomUUID(), answerId, optionKey, answer.ranked ? index + 1 : null],
        );
      }
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
      question_type: QuestionType;
      construct: string | null;
      is_optional: boolean;
      options: Array<{ key: string; label: string }> | null;
      matrix_group_id: string | null;
      show_if: ShowIfCondition | null;
    }>(
      `select id, position, question_text, question_type, construct, is_optional, options, matrix_group_id, show_if
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
        options: question.options,
        matrixGroupId: question.matrix_group_id,
        showIf: question.show_if,
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

  /**
   * SUPPRESSION ASSUMPTION -- read before adding branching/skip logic.
   * This method (and getDepartmentProtectedReport, getCrossCycleTrendForTenant
   * below) assume every respondent in a cycle is a candidate to answer every
   * question, so "n answered" and "n were shown" are the same number. Skip
   * logic breaks that: branch membership itself becomes disclosive (a small
   * follow-up population reveals how someone answered the gating question,
   * even with the follow-up's own content suppressed), and each of these
   * functions would need re-auditing for that new leak class, not just reuse.
   * Do not add conditional/branching question logic without redesigning
   * suppression for it first -- see plan history: "Design thinking: survey
   * branching vs. the k-anonymity engine."
   */
  async getProtectedReportForTenant(
    tenantId: string,
    cycleId: string,
    minGroupSize = 5,
    scope: ReportScope = orgScope,
  ): Promise<ProtectedReport> {
    if (scope.type === "team") {
      // manager_email is unverified free text with no hierarchy table --
      // building a k-anonymity-gated view on top of it risks the same
      // "team" being sliced differently across cycles as values drift.
      // Fails loudly rather than silently degrading; ship department scope
      // (backed by the validated, snapshotted segment_team) first.
      throw new Error(`Report scope "team" is not implemented -- see department scope.`);
    }

    if (scope.type === "department") {
      return this.getDepartmentProtectedReport(tenantId, cycleId, minGroupSize, scope.department);
    }

    const countResult = await this.db.query<{ n: string }>(
      "select count(*)::text as n from responses.submissions where tenant_id = $1 and cycle_id = $2",
      [tenantId, cycleId],
    );
    const n = Number(countResult.rows[0]?.n ?? 0);
    if (n < minGroupSize) return { protected: true, n, rows: [] };

    const result = await this.db.query<{ question_id: string; question_text: string; construct: string | null; n: number; average: string | null }>(
      `select r.question_id, q.question_text, q.construct, r.n, r.average
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
        construct: row.construct,
        n: row.n,
        average: row.average === null ? null : Number(row.average),
      })),
    };
  }

  /**
   * Open-text answers, gated at a stricter threshold than numeric scores
   * (minGroupSize + 3, never the bare numeric threshold) since a sentence
   * of free text is more identifying than a number -- see
   * ProtectedTextReport's doc comment. Deliberately no filtering or
   * redaction of the returned strings; that's a product decision made in
   * the UI layer (a persistent content-note banner), not something this
   * repository should silently do to what someone actually wrote.
   *
   * v1 scope: org-only, no department-scoped text -- text is more
   * identifying than numbers, so department-slicing it would compound the
   * differencing-attack risk getDepartmentReleasability exists to guard
   * against. Deliberate non-goal, not an oversight.
   */
  async getProtectedOpenTextReport(tenantId: string, cycleId: string, minGroupSize = 5): Promise<ProtectedTextReport> {
    const minTextGroupSize = minGroupSize + 3;

    const countResult = await this.db.query<{ n: string }>(
      "select count(*)::text as n from responses.submissions where tenant_id = $1 and cycle_id = $2",
      [tenantId, cycleId],
    );
    const n = Number(countResult.rows[0]?.n ?? 0);
    if (n < minTextGroupSize) return { protected: true, n, rows: [] };

    const result = await this.db.query<{ question_id: string; question_text: string; n: number; text_value: string | null }>(
      `select r.question_id, q.question_text, r.n, r.text_value
       from responses.report_open_text_answers($1, $2) r
       join responses.survey_cycles c on c.id = $1
       join responses.template_questions q on q.id = r.question_id
       where c.tenant_id = $3
         and r.protected = false`,
      [cycleId, minTextGroupSize, tenantId],
    );

    const byQuestion = new Map<string, { label: string; n: number; answers: string[] }>();
    for (const row of result.rows) {
      let entry = byQuestion.get(row.question_id);
      if (!entry) {
        entry = { label: row.question_text, n: row.n, answers: [] };
        byQuestion.set(row.question_id, entry);
      }
      if (row.text_value) entry.answers.push(row.text_value);
    }

    return {
      protected: false,
      n,
      rows: Array.from(byQuestion.entries()).map(([questionId, entry]) => ({
        questionId,
        label: entry.label,
        n: entry.n,
        answers: entry.answers,
      })),
    };
  }

  /**
   * Per-option tallies for multiple_choice/ranking/matrix questions.
   * Suppression is applied twice, deliberately: first the whole-cycle gate
   * (same as every other report method -- too few respondents overall,
   * nothing is releasable), then a second, per-option gate inside
   * responses.report_option_tallies -- one respondent picking a rare
   * option is exactly as identifying as a numeric outlier, so each
   * option's own pick-count must independently clear min_n. An option that
   * doesn't clear it is dropped from the row entirely, not zeroed out --
   * showing "0 for this option, hidden for that one" would itself leak who
   * picked the hidden one by elimination.
   */
  async getProtectedOptionReport(tenantId: string, cycleId: string, minGroupSize = 5): Promise<ProtectedOptionReport> {
    const countResult = await this.db.query<{ n: string }>(
      "select count(*)::text as n from responses.submissions where tenant_id = $1 and cycle_id = $2",
      [tenantId, cycleId],
    );
    const n = Number(countResult.rows[0]?.n ?? 0);
    if (n < minGroupSize) return { protected: true, n, rows: [] };

    const result = await this.db.query<{
      question_id: string;
      question_text: string;
      option_key: string;
      n: number;
      avg_rank: string | null;
    }>(
      `select r.question_id, q.question_text, r.option_key, r.n, r.avg_rank
       from responses.report_option_tallies($1, $2) r
       join responses.survey_cycles c on c.id = $1
       join responses.template_questions q on q.id = r.question_id
       where c.tenant_id = $3
         and r.protected = false`,
      [cycleId, minGroupSize, tenantId],
    );

    const byQuestion = new Map<string, { label: string; options: Array<{ optionKey: string; n: number; avgRank: number | null }> }>();
    for (const row of result.rows) {
      let entry = byQuestion.get(row.question_id);
      if (!entry) {
        entry = { label: row.question_text, options: [] };
        byQuestion.set(row.question_id, entry);
      }
      entry.options.push({ optionKey: row.option_key, n: row.n, avgRank: row.avg_rank === null ? null : Number(row.avg_rank) });
    }

    return {
      protected: false,
      n,
      rows: Array.from(byQuestion.entries()).map(([questionId, entry]) => ({
        questionId,
        label: entry.label,
        options: entry.options,
      })),
    };
  }

  /**
   * Complementary suppression against differencing attacks: a viewer who
   * can see the org total plus every department's report except one could
   * back-calculate the suppressed department's exact average by
   * subtraction. If exactly one department in this cycle would be the
   * lone suppressed remainder, an additional (smallest-n) releasable
   * department is bundled into suppression too, so at least two
   * departments' worth of data stay ambiguous together. Computed fresh per
   * request against the cycle's current department membership, not cached
   * -- membership can change as team values get imported.
   */
  async getDepartmentReleasability(
    tenantId: string,
    cycleId: string,
    minGroupSize: number,
  ): Promise<Map<string, { n: number; releasable: boolean }>> {
    const countsResult = await this.db.query<{ segment_team: string; n: string }>(
      `select segment_team, count(*)::text as n
       from responses.submissions
       where tenant_id = $1 and cycle_id = $2 and segment_team is not null
       group by segment_team`,
      [tenantId, cycleId],
    );

    const counts = countsResult.rows.map((row) => ({ department: row.segment_team, n: Number(row.n) }));
    const belowThreshold = counts.filter((row) => row.n < minGroupSize);
    const releasable = counts.filter((row) => row.n >= minGroupSize);

    const additionallySuppressed = new Set<string>();
    if (belowThreshold.length === 1 && releasable.length >= 1) {
      const smallest = releasable.reduce((min, row) => (row.n < min.n ? row : min));
      additionallySuppressed.add(smallest.department);
    }

    const result = new Map<string, { n: number; releasable: boolean }>();
    for (const row of counts) {
      const naturallyBelow = row.n < minGroupSize;
      result.set(row.department, { n: row.n, releasable: !naturallyBelow && !additionallySuppressed.has(row.department) });
    }
    return result;
  }

  // SUPPRESSION ASSUMPTION -- see getProtectedReportForTenant above before
  // adding branching/skip logic; same "answered == shown" assumption applies.
  private async getDepartmentProtectedReport(
    tenantId: string,
    cycleId: string,
    minGroupSize: number,
    department: string,
  ): Promise<ProtectedReport> {
    const releasability = await this.getDepartmentReleasability(tenantId, cycleId, minGroupSize);
    const entry = releasability.get(department);

    // Deliberately never returns the real n here, even though the
    // org-level protected report does (see getProtectedReport's comment) --
    // for a *department*, the exact count is itself part of what a
    // differencing attack could use, so a suppressed department's response
    // always looks identical whether it's naturally below threshold,
    // additionally suppressed to protect another department, or simply
    // has zero responses at all.
    if (!entry || !entry.releasable) return { protected: true, n: 0, rows: [] };

    const result = await this.db.query<{ question_id: string; question_text: string; construct: string | null; n: number; average: string | null }>(
      `select r.question_id, q.question_text, q.construct, r.n, r.average
       from responses.report_question_scores_by_department($1, $2, $3) r
       join responses.survey_cycles c on c.id = $1
       join responses.template_questions q on q.id = r.question_id
       where c.tenant_id = $4
         and r.protected = false`,
      [cycleId, department, minGroupSize, tenantId],
    );
    return {
      protected: false,
      n: entry.n,
      rows: result.rows.map((row) => ({
        questionId: row.question_id,
        label: row.question_text,
        construct: row.construct,
        n: row.n,
        average: row.average === null ? null : Number(row.average),
      })),
    };
  }

  /**
   * Raw per-team respondent counts for a cycle -- the same query
   * getDepartmentReleasability groups internally, exposed standalone so
   * the manager-rollup orchestration (managerRollupService.ts) can reuse
   * it against multiple candidate team-sets without a repeated query per
   * candidate. Deliberately still only touches responses.submissions --
   * team-label strings, not individual identity.
   */
  async getTeamCounts(tenantId: string, cycleId: string): Promise<Map<string, number>> {
    const result = await this.db.query<{ segment_team: string; n: string }>(
      `select segment_team, count(*)::text as n
       from responses.submissions
       where tenant_id = $1 and cycle_id = $2 and segment_team is not null
       group by segment_team`,
      [tenantId, cycleId],
    );
    return new Map(result.rows.map((row) => [row.segment_team, Number(row.n)]));
  }

  /**
   * Same shape as getDepartmentProtectedReport, generalized to a SET of
   * team labels merged into one count (a manager's reporting subtree, or
   * the whole company) -- used by the manager-rollup orchestration once
   * it has already decided, using identity-side org-chart data, which
   * team labels belong together and that the merged n clears threshold.
   * This method only ever receives team labels and a pre-computed n; it
   * never resolves who's whose manager itself -- see
   * managerRollupService.ts, not here, for the org-chart walk.
   */
  async getMultiTeamProtectedReport(tenantId: string, cycleId: string, minGroupSize: number, teams: string[], n: number): Promise<ProtectedReport> {
    const result = await this.db.query<{ question_id: string; question_text: string; construct: string | null; n: number; average: string | null }>(
      `select r.question_id, q.question_text, q.construct, r.n, r.average
       from responses.report_question_scores_by_departments($1, $2, $3) r
       join responses.survey_cycles c on c.id = $1
       join responses.template_questions q on q.id = r.question_id
       where c.tenant_id = $4
         and r.protected = false`,
      [cycleId, teams, minGroupSize, tenantId],
    );

    return {
      protected: false,
      n,
      rows: result.rows.map((row) => ({
        questionId: row.question_id,
        label: row.question_text,
        construct: row.construct,
        n: row.n,
        average: row.average === null ? null : Number(row.average),
      })),
    };
  }

  /** Reusable, tenant-private survey questions -- see 0024_question_bank.sql. Archived items are excluded, not deleted, so past cycles that used them keep their own snapshot untouched. */
  async listQuestionBank(tenantId: string): Promise<QuestionBankItem[]> {
    const result = await this.db.query<{
      id: string;
      construct: string | null;
      text: string;
      question_type: QuestionBankQuestionType;
      options: QuestionOption[] | null;
    }>(
      `select id, construct, text, question_type, options
       from responses.question_bank
       where tenant_id = $1 and archived_at is null
       order by created_at desc`,
      [tenantId],
    );
    return result.rows.map((row) => ({ id: row.id, construct: row.construct, text: row.text, questionType: row.question_type, options: row.options }));
  }

  async addQuestionToBank(
    tenantId: string,
    input: { construct?: string | null; text: string; questionType: QuestionBankQuestionType; options?: QuestionOption[] | null },
  ): Promise<QuestionBankItem> {
    const id = randomUUID();
    const result = await this.db.query<{
      id: string;
      construct: string | null;
      text: string;
      question_type: QuestionBankQuestionType;
      options: QuestionOption[] | null;
    }>(
      `insert into responses.question_bank (id, tenant_id, construct, text, question_type, options)
       values ($1, $2, $3, $4, $5, $6::jsonb)
       returning id, construct, text, question_type, options`,
      [id, tenantId, input.construct ?? null, input.text, input.questionType, input.options ? JSON.stringify(input.options) : null],
    );
    const row = result.rows[0];
    return { id: row.id, construct: row.construct, text: row.text, questionType: row.question_type, options: row.options };
  }

  async archiveQuestionFromBank(tenantId: string, questionId: string): Promise<void> {
    const result = await this.db.query(
      `update responses.question_bank set archived_at = now() where tenant_id = $1 and id = $2 and archived_at is null`,
      [tenantId, questionId],
    );
    if (result.rowCount !== 1) throw new Error("Question not found.");
  }

  /**
   * Distinct department (segment_team) labels present in a cycle's
   * submissions -- names only, alphabetical, never counts or any
   * size-implying order, so listing departments doesn't itself leak which
   * ones are small. Reads only from this repository's own responses.*
   * tables (submissions already has a direct grant for the restricted
   * role, see 0011) -- this repository never reaches into the identity
   * schema, same severance guarantee as every other method here.
   */
  async listDepartmentsForCycle(tenantId: string, cycleId: string): Promise<string[]> {
    const result = await this.db.query<{ segment_team: string }>(
      `select distinct segment_team
       from responses.submissions
       where tenant_id = $1 and cycle_id = $2 and segment_team is not null
       order by segment_team asc`,
      [tenantId, cycleId],
    );
    return result.rows.map((row) => row.segment_team);
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

  /**
   * draft -> open only -- guarded so this can never resurrect a closed
   * survey, and is a harmless no-op if called again (e.g. a reminder send
   * after the cycle is already open). See /api/invites/send, which is the
   * only real founder-facing action that should trigger this.
   */
  async openCycle(tenantId: string, cycleId: string) {
    const result = await this.db.query(
      `update responses.survey_cycles
       set status = 'open'
       where tenant_id = $1 and id = $2 and status = 'draft'`,
      [tenantId, cycleId],
    );
    return (result.rowCount ?? 0) > 0;
  }

  /**
   * Replaces a draft cycle's questions wholesale. Only ever called for
   * status = 'draft' cycles (enforced by the caller before this runs) --
   * once a cycle opens, tokens may already be usable and answers.question_id
   * FKs into these rows, so rewriting them post-open would risk orphaning
   * submitted answers or breaking cross-question comparability.
   */
  async updateTemplateQuestions(
    tenantId: string,
    cycleId: string,
    questions: Array<{
      text: string;
      type: QuestionType;
      construct: string | null;
      optional: boolean;
      options: { key: string; label: string }[] | null;
      showIf: ShowIfCondition | null;
      matrixGroupId: string | null;
    }>,
  ): Promise<{ ok: true } | { ok: false; error: "not_found" | "not_draft" | "empty" }> {
    if (questions.length === 0) return { ok: false, error: "empty" };

    const cycleResult = await this.db.query<{ template_id: string; status: string }>(
      `select template_id, status from responses.survey_cycles where tenant_id = $1 and id = $2 limit 1`,
      [tenantId, cycleId],
    );
    const cycle = cycleResult.rows[0];
    if (!cycle) return { ok: false, error: "not_found" };
    if (cycle.status !== "draft") return { ok: false, error: "not_draft" };

    await this.db.query(`delete from responses.template_questions where template_id = $1`, [cycle.template_id]);
    for (let index = 0; index < questions.length; index += 1) {
      const question = questions[index];
      await this.db.query(
        `insert into responses.template_questions
          (id, template_id, position, question_text, question_type, construct, is_optional, options, show_if, matrix_group_id)
         values ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9::jsonb, $10)`,
        [
          randomUUID(),
          cycle.template_id,
          index + 1,
          question.text,
          question.type,
          question.construct,
          question.optional,
          question.options ? JSON.stringify(question.options) : null,
          question.showIf ? JSON.stringify(question.showIf) : null,
          question.matrixGroupId,
        ],
      );
    }
    return { ok: true };
  }

  async closeCycle(tenantId: string, cycleId: string) {
    const result = await this.db.query(
      `update responses.survey_cycles
       set status = 'closed', actual_closed_at = now()
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

  /**
   * Per-question average across a tenant's most recent cycles, matched by
   * normalized question text since edited templates get a fresh question_id
   * every time a question is reworded (surveyCycleService.ts's
   * createCycleScopedTemplate) -- id-based matching would fail to connect
   * most real tenants' cycles. Each point still carries its own cycle's
   * k-anonymity protection (min_group_size), unchanged from the single-cycle
   * report -- this is a pivot of the same protected data, not a new
   * aggregation path around it.
   *
   * SUPPRESSION ASSUMPTION -- see getProtectedReportForTenant above before
   * adding branching/skip logic. This is also where a real k-anonymity leak
   * (exact respondent counts shipped for below-threshold points) was found
   * and fixed -- extra reason to re-audit this function specifically if
   * per-question "was shown" ever stops being identical to "answered".
   */
  async getCrossCycleTrendForTenant(tenantId: string, tenantName?: string): Promise<CycleTrendQuestion[]> {
    const cycles = await this.listCyclesForTenant(tenantId, tenantName);
    const recentCycles = cycles.slice(0, MAX_TREND_CYCLES).reverse(); // oldest first
    if (recentCycles.length === 0) return [];

    const cycleIds = recentCycles.map((cycle) => cycle.id);
    const result = await this.db.query<{
      cycle_id: string;
      question_id: string;
      question_text: string;
      n: number;
      average: string | null;
      protected: boolean;
    }>(
      `select cycle_id, question_id, question_text, n, average, protected
       from responses.report_question_trend($1, $2)`,
      [tenantId, cycleIds],
    );

    const cycleById = new Map(recentCycles.map((cycle) => [cycle.id, cycle]));
    const questionsByNormalizedText = new Map<string, CycleTrendQuestion>();

    for (const row of result.rows) {
      const cycle = cycleById.get(row.cycle_id);
      if (!cycle) continue; // defensive: row from a cycle outside the requested set

      const normalized = normalizeQuestionText(row.question_text);
      let question = questionsByNormalizedText.get(normalized);
      if (!question) {
        question = { questionText: row.question_text, points: [] };
        questionsByNormalizedText.set(normalized, question);
      }
      question.points.push({
        cycleId: cycle.id,
        cycleName: cycle.name,
        cycleCreatedAt: cycle.createdAt,
        // report_question_trend() always computes the real count(*) as n,
        // same as it always computes the real average -- protected only
        // says whether n cleared min_group_size. average is correctly
        // nulled below threshold; n must be too, or a below-threshold
        // point's exact respondent count ships to the client just not
        // rendered, which is not the same as not being exposed (same
        // "never reveal exact n" rule getDepartmentProtectedReport
        // enforces for department-scoped reports).
        n: row.protected ? 0 : row.n,
        average: row.protected || row.average === null ? null : Number(row.average),
        protected: row.protected,
      });
    }

    // Order each question's points to match cycle recency (oldest first),
    // and drop questions with fewer than 2 points -- a single-cycle line
    // isn't a trend and just adds noise to the panel. Also drop questions
    // where every point is still protected -- a wall of locked icons with
    // zero real data isn't a trend either, just noise; same "silent until
    // there's something to compare" philosophy as the <2-point case.
    const cycleOrder = new Map(recentCycles.map((cycle, index) => [cycle.id, index]));
    return Array.from(questionsByNormalizedText.values())
      .filter((question) => question.points.length > 1 && question.points.some((point) => !point.protected && point.average !== null))
      .map((question) => ({
        ...question,
        points: [...question.points].sort((a, b) => (cycleOrder.get(a.cycleId) ?? 0) - (cycleOrder.get(b.cycleId) ?? 0)),
      }));
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

  async createRecurrence(params: {
    tenantId: string;
    templateSlug: string;
    interval: "weekly" | "monthly" | "quarterly";
    autoSend: boolean;
  }) {
    const id = randomUUID();
    await this.db.query(
      `insert into responses.survey_recurrences (id, tenant_id, template_slug, interval, auto_send, next_run_at)
       values ($1, $2, $3, $4, $5, $6)`,
      [id, params.tenantId, params.templateSlug, params.interval, params.autoSend, nextRunAtFrom(new Date(), params.interval)],
    );
    return { id };
  }

  async listRecurrencesForTenant(tenantId: string) {
    const result = await this.db.query<{
      id: string;
      template_slug: string;
      interval: "weekly" | "monthly" | "quarterly";
      auto_send: boolean;
      next_run_at: string;
      disabled_at: string | null;
    }>(
      `select id, template_slug, interval, auto_send, next_run_at, disabled_at
       from responses.survey_recurrences
       where tenant_id = $1
       order by created_at desc`,
      [tenantId],
    );
    return result.rows.map((row) => ({
      id: row.id,
      templateSlug: row.template_slug,
      interval: row.interval,
      autoSend: row.auto_send,
      nextRunAt: row.next_run_at,
      disabled: row.disabled_at !== null,
    }));
  }

  async deleteRecurrence(tenantId: string, recurrenceId: string) {
    const result = await this.db.query(`delete from responses.survey_recurrences where tenant_id = $1 and id = $2`, [tenantId, recurrenceId]);
    return (result.rowCount ?? 0) > 0;
  }
}

/** Anchors to "now" at creation/run time, not calendar boundaries -- a monthly recurrence created on the 15th fires on the 15th of each following month, not the 1st. */
export function nextRunAtFrom(from: Date, interval: "weekly" | "monthly" | "quarterly"): Date {
  const next = new Date(from);
  if (interval === "weekly") next.setDate(next.getDate() + 7);
  else if (interval === "monthly") next.setMonth(next.getMonth() + 1);
  else next.setMonth(next.getMonth() + 3);
  return next;
}
