import { describe, expect, it } from "vitest";
import { RespondentFacingError, submitWithSeveredRepositories } from "./confidentialSubmissionService";
import type { Queryable } from "@/lib/server/db/tenantPool";

// Regression test for a real bug found in live testing: tokens are minted
// at cycle-creation time (draft), well before "Send invites" -- so without
// this check, a still-draft survey (0 "Active surveys", invites never
// sent) could accumulate real submissions and even unlock its aggregate
// report.
function fakeDb(overrides: { tokenStatus?: string; cycleStatus?: string | null }): Queryable {
  const tokenStatus = overrides.tokenStatus ?? "issued";
  const cycleStatus = overrides.cycleStatus === undefined ? "open" : overrides.cycleStatus;
  return {
    query: (async (sql: string) => {
      if (sql.includes("from identity.survey_participants")) {
        return { rows: [{ tenant_id: "tenant-1", cycle_id: "cycle-1", token_status: tokenStatus, team: null }] };
      }
      if (sql.includes("from responses.survey_cycles")) {
        return cycleStatus === null ? { rows: [] } : { rows: [{ id: "cycle-1", name: "Test", status: cycleStatus, min_group_size: 5, created_at: "" }] };
      }
      throw new Error(`Unexpected query in test: ${sql}`);
    }) as Queryable["query"],
  };
}

describe("submitWithSeveredRepositories status guard", () => {
  it("rejects a submission against a still-draft cycle, even with a validly-issued token", async () => {
    const db = fakeDb({ cycleStatus: "draft" });
    await expect(submitWithSeveredRepositories({ db, rawToken: "raw-token", answers: [] })).rejects.toThrow(
      "This survey isn't accepting responses right now.",
    );
  });

  it("rejects a submission against a closed cycle", async () => {
    const db = fakeDb({ cycleStatus: "closed" });
    await expect(submitWithSeveredRepositories({ db, rawToken: "raw-token", answers: [] })).rejects.toThrow(
      "This survey isn't accepting responses right now.",
    );
  });

  it("rejects when the cycle can't be found at all", async () => {
    const db = fakeDb({ cycleStatus: null });
    await expect(submitWithSeveredRepositories({ db, rawToken: "raw-token", answers: [] })).rejects.toThrow(
      "This survey isn't accepting responses right now.",
    );
  });
});

// Regression test for a real bug found in live testing: a double-click (or
// any near-simultaneous double submission of the same token) can pass the
// "token is issued" check twice before either request marks it spent, so
// the second insert into responses.submissions hits its unique constraint
// on spent_token_hash. That used to surface as a raw Postgres error
// ("duplicate key value violates unique constraint ...") to an anonymous
// respondent instead of the same friendly "already completed" message the
// non-race case gets.
function fakeDbWithSpentTokenRace(): Queryable {
  let insertAttempts = 0;
  return {
    query: (async (sql: string) => {
      if (sql.includes("from identity.survey_participants")) {
        return { rows: [{ tenant_id: "tenant-1", cycle_id: "cycle-1", token_status: "issued", team: null }] };
      }
      if (sql.includes("from responses.survey_cycles")) {
        return { rows: [{ id: "cycle-1", name: "Test", status: "open", min_group_size: 5, created_at: "" }] };
      }
      if (sql.includes("insert into responses.submissions")) {
        insertAttempts++;
        if (insertAttempts === 1) return { rows: [] };
        const error = new Error('duplicate key value violates unique constraint "submissions_spent_token_hash_key"') as Error & {
          code?: string;
          constraint?: string;
        };
        error.code = "23505";
        error.constraint = "submissions_spent_token_hash_key";
        throw error;
      }
      if (sql.includes("insert into responses.answers")) {
        return { rows: [] };
      }
      if (sql.includes("update identity.survey_participants")) {
        return { rows: [], rowCount: 1 };
      }
      throw new Error(`Unexpected query in test: ${sql}`);
    }) as Queryable["query"],
  };
}

describe("submitWithSeveredRepositories spent-token race", () => {
  it("translates a unique-constraint race into the same friendly 'already completed' message, not the raw DB error", async () => {
    const db = fakeDbWithSpentTokenRace();
    await submitWithSeveredRepositories({ db, rawToken: "raw-token", answers: [] });

    let caught: unknown;
    try {
      await submitWithSeveredRepositories({ db, rawToken: "raw-token", answers: [] });
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(RespondentFacingError);
    expect((caught as Error).message).toBe("You've already completed this survey.");
  });
});
