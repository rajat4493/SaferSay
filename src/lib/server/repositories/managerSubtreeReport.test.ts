import { describe, expect, it } from "vitest";
import { ResponseRepository } from "./responseRepository";
import type { Queryable } from "@/lib/server/db/tenantPool";
import type { ReportScope } from "./types";

/**
 * Fake Queryable for the People Leader / manager-subtree scope. Routes
 * per-sibling count queries (one per entry in scope.siblingSubtrees,
 * matched by the team-label array bound as $3) and the final
 * report_question_scores_by_departments call, mirroring
 * departmentReport.test.ts's pattern for the analogous department-scope
 * tests.
 */
function fakeDb(handlers: { countsByLabelSet: Record<string, string>; scores?: unknown[] }): Queryable {
  return {
    query: (async (sql: string, params?: unknown[]) => {
      if (sql.includes("segment_team = any($3)")) {
        const labels = (params?.[2] as string[]).join(",");
        return { rows: [{ n: handlers.countsByLabelSet[labels] ?? "0" }] };
      }
      if (sql.includes("report_question_scores_by_departments")) return { rows: handlers.scores ?? [] };
      throw new Error(`Unexpected query in test: ${sql}`);
    }) as Queryable["query"],
  };
}

const tenantId = "tenant-1";
const cycleId = "cycle-1";

function teamScope(overrides: Partial<Extract<ReportScope, { type: "team" }>>): Extract<ReportScope, { type: "team" }> {
  return {
    type: "team",
    rootManagerId: "manager-a",
    teamLabels: ["engineering"],
    siblingSubtrees: [
      { managerId: "manager-a", teamLabels: ["engineering"] },
      { managerId: "manager-b", teamLabels: ["sales"] },
    ],
    ...overrides,
  };
}

describe("manager-subtree (People Leader) scoped report", () => {
  it("returns real rows for a subtree at or above min_group_size with no differencing risk", async () => {
    const db = fakeDb({
      countsByLabelSet: { engineering: "6", sales: "8" },
      scores: [{ question_id: "q1", question_text: "How supported do you feel?", construct: "Support", n: 6, average: "4.1" }],
    });

    const report = await new ResponseRepository(db).getProtectedReportForTenant(tenantId, cycleId, 5, teamScope({}));

    expect(report).toEqual({
      protected: false,
      n: 6,
      rows: [{ questionId: "q1", label: "How supported do you feel?", construct: "Support", n: 6, average: 4.1 }],
    });
  });

  it("suppresses a subtree below min_group_size, without revealing its real n", async () => {
    const db = fakeDb({ countsByLabelSet: { engineering: "2", sales: "20" } });

    const report = await new ResponseRepository(db).getProtectedReportForTenant(tenantId, cycleId, 5, teamScope({}));

    expect(report).toEqual({ protected: true, n: 0, rows: [] });
  });

  it("complementary suppression: bundles a second sibling subtree when only one would be the lone suppressed remainder", async () => {
    // Regression guard for the exact gap the original (removed) manager-
    // rollup feature had: only "sales" is naturally below threshold here.
    // Releasing "engineering" alongside the parent's own total would let a
    // viewer reconstruct "sales"'s exact average by subtraction -- so the
    // smallest-n releasable sibling ("engineering") must also be
    // suppressed, leaving two subtrees' worth of data ambiguous.
    const db = fakeDb({ countsByLabelSet: { engineering: "6", sales: "2" } });
    const repo = new ResponseRepository(db);

    const engineeringReport = await repo.getProtectedReportForTenant(tenantId, cycleId, 5, teamScope({}));
    expect(engineeringReport).toEqual({ protected: true, n: 0, rows: [] });

    const salesReport = await repo.getProtectedReportForTenant(
      tenantId,
      cycleId,
      5,
      teamScope({ rootManagerId: "manager-b", teamLabels: ["sales"] }),
    );
    expect(salesReport).toEqual({ protected: true, n: 0, rows: [] });
  });

  it("does not apply complementary suppression when no sibling subtree is naturally below threshold", async () => {
    const db = fakeDb({
      countsByLabelSet: { engineering: "6", sales: "8" },
      scores: [{ question_id: "q1", question_text: "Q", construct: null, n: 6, average: "3.0" }],
    });

    const report = await new ResponseRepository(db).getProtectedReportForTenant(tenantId, cycleId, 5, teamScope({}));
    expect(report.protected).toBe(false);
  });

  it("suppresses a subtree with no team labels at all (an empty org chart), without erroring", async () => {
    const db = fakeDb({ countsByLabelSet: { sales: "8" } });
    const report = await new ResponseRepository(db).getProtectedReportForTenant(
      tenantId,
      cycleId,
      5,
      teamScope({ teamLabels: [], siblingSubtrees: [{ managerId: "manager-a", teamLabels: [] }, { managerId: "manager-b", teamLabels: ["sales"] }] }),
    );
    expect(report).toEqual({ protected: true, n: 0, rows: [] });
  });
});
