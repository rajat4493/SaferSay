import { describe, expect, it } from "vitest";
import { submitWithSeveredRepositories } from "./confidentialSubmissionService";
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
