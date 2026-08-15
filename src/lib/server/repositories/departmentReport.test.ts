import { describe, expect, it } from "vitest";
import { ResponseRepository } from "./responseRepository";
import type { Queryable } from "@/lib/server/db/tenantPool";

/** Routes on a distinguishing SQL substring, same pattern as cycleTrend.test.ts. */
function fakeDb(handlers: { counts: unknown[]; scores?: unknown[]; distinctDepartments?: unknown[] }): Queryable {
  return {
    query: (async (sql: string) => {
      if (sql.includes("group by segment_team")) return { rows: handlers.counts };
      if (sql.includes("report_question_scores_by_department")) return { rows: handlers.scores ?? [] };
      if (sql.includes("select distinct segment_team")) return { rows: handlers.distinctDepartments ?? [] };
      throw new Error(`Unexpected query in test: ${sql}`);
    }) as Queryable["query"],
  };
}

const tenantId = "tenant-1";
const cycleId = "cycle-1";

describe("department-scoped protected report", () => {
  it("returns real rows for a department at or above min_group_size with no differencing risk", async () => {
    const db = fakeDb({
      counts: [
        { segment_team: "engineering", n: "6" },
        { segment_team: "sales", n: "8" },
      ],
      scores: [{ question_id: "q1", question_text: "How supported do you feel?", n: 6, average: "4.1" }],
    });

    const report = await new ResponseRepository(db).getProtectedReportForTenant(tenantId, cycleId, 5, {
      type: "department",
      department: "engineering",
    });

    expect(report).toEqual({
      protected: false,
      n: 6,
      rows: [{ questionId: "q1", label: "How supported do you feel?", n: 6, average: 4.1 }],
    });
  });

  it("suppresses a department below min_group_size, without revealing its real n", async () => {
    const db = fakeDb({
      counts: [
        { segment_team: "engineering", n: "6" },
        { segment_team: "sales", n: "8" },
        { segment_team: "support", n: "2" },
      ],
    });

    const report = await new ResponseRepository(db).getProtectedReportForTenant(tenantId, cycleId, 5, {
      type: "department",
      department: "support",
    });

    expect(report).toEqual({ protected: true, n: 0, rows: [] });
  });

  it("complementary suppression: bundles a second department when only one would be the lone suppressed remainder", async () => {
    // Only "support" is naturally below threshold. Releasing both
    // "engineering" and "sales" alongside the org total would let a viewer
    // reconstruct "support"'s exact average by subtraction -- so the
    // smallest-n releasable department ("engineering") must also be
    // suppressed, leaving two departments' worth of data ambiguous.
    const db = fakeDb({
      counts: [
        { segment_team: "engineering", n: "6" },
        { segment_team: "sales", n: "20" },
        { segment_team: "support", n: "2" },
      ],
    });
    const repo = new ResponseRepository(db);

    const engineeringReport = await repo.getProtectedReportForTenant(tenantId, cycleId, 5, {
      type: "department",
      department: "engineering",
    });
    expect(engineeringReport).toEqual({ protected: true, n: 0, rows: [] });

    const salesReport = await repo.getProtectedReportForTenant(tenantId, cycleId, 5, {
      type: "department",
      department: "sales",
    });
    expect(salesReport.protected).toBe(false);
  });

  it("does not apply complementary suppression when no department is naturally below threshold", async () => {
    const db = fakeDb({
      counts: [
        { segment_team: "engineering", n: "6" },
        { segment_team: "sales", n: "8" },
      ],
      scores: [{ question_id: "q1", question_text: "Q", n: 6, average: "3.0" }],
    });

    const report = await new ResponseRepository(db).getProtectedReportForTenant(tenantId, cycleId, 5, {
      type: "department",
      department: "engineering",
    });
    expect(report.protected).toBe(false);
  });

  it("does not apply complementary suppression when two or more departments are already bundled below threshold", async () => {
    const db = fakeDb({
      counts: [
        { segment_team: "engineering", n: "6" },
        { segment_team: "sales", n: "2" },
        { segment_team: "support", n: "1" },
      ],
      scores: [{ question_id: "q1", question_text: "Q", n: 6, average: "3.0" }],
    });

    const report = await new ResponseRepository(db).getProtectedReportForTenant(tenantId, cycleId, 5, {
      type: "department",
      department: "engineering",
    });
    expect(report.protected).toBe(false);
  });

  it("suppresses (does not error on) an unrecognized department name, same as below-threshold", async () => {
    const db = fakeDb({ counts: [{ segment_team: "engineering", n: "6" }] });
    const report = await new ResponseRepository(db).getProtectedReportForTenant(tenantId, cycleId, 5, {
      type: "department",
      department: "not-a-real-department",
    });
    expect(report).toEqual({ protected: true, n: 0, rows: [] });
  });

  it("still throws for team scope (manager_email is not implemented)", async () => {
    const db = fakeDb({ counts: [] });
    await expect(
      new ResponseRepository(db).getProtectedReportForTenant(tenantId, cycleId, 5, { type: "team", managerEmail: "m@x.com" }),
    ).rejects.toThrow(/not implemented/i);
  });
});

describe("listDepartmentsForCycle", () => {
  it("returns department labels only, alphabetically, never counts", async () => {
    const db = fakeDb({
      counts: [],
      distinctDepartments: [{ segment_team: "engineering" }, { segment_team: "sales" }],
    });
    const departments = await new ResponseRepository(db).listDepartmentsForCycle(tenantId, cycleId);
    expect(departments).toEqual(["engineering", "sales"]);
  });
});
