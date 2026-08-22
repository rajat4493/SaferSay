import { beforeEach, describe, expect, it } from "vitest";
import {
  getDefaultCycle,
  getInviteTargets,
  getProtectedServerReport,
  launchPaidCycle,
  markCyclePaid,
  seedServerEmployees,
  submitServerResponse,
} from "@/lib/serverStore";

/**
 * Proves the product spine end to end through the real service functions
 * (not string-content assertions): admin seeds employees and issues
 * tokens -> cycle is paid and launched -> respondents redeem their
 * one-time tokens -> report stays protected below k=5 and unlocks once
 * the threshold is met -> a spent token cannot be reused.
 *
 * This exercises the DATABASE_URL-less fallback path (serverStore.ts),
 * which mirrors the same flow the Postgres-backed repositories implement.
 * It does not verify the Postgres-specific SQL itself — that requires a
 * real Supabase connection, which isn't available in this environment.
 */
describe("live survey cycle (product spine)", () => {
  const cycleId = getDefaultCycle().id;

  beforeEach(async () => {
    await seedServerEmployees();
  });

  it("runs create -> invite -> submit -> threshold-gated report end to end", async () => {
    const paid = await markCyclePaid(cycleId);
    expect(paid.paymentStatus).toBe("paid");

    const launched = await launchPaidCycle(cycleId);
    expect(launched.status).toBe("open");

    const targets = await getInviteTargets(cycleId);
    expect(targets.length).toBeGreaterThan(5);

    const belowThreshold = await getProtectedServerReport(cycleId);
    expect(belowThreshold.protected).toBe(true);
    expect(belowThreshold.n).toBe(0);
    expect(belowThreshold.rows).toEqual([]);

    for (const target of targets.slice(0, 4)) {
      await submitServerResponse(target.token, [{ questionId: "q1", numberValue: 4 }]);
    }
    const stillProtected = await getProtectedServerReport(cycleId);
    expect(stillProtected.protected).toBe(true);
    expect(stillProtected.n).toBe(4);

    await submitServerResponse(targets[4].token, [{ questionId: "q1", numberValue: 2 }]);

    const unlocked = await getProtectedServerReport(cycleId);
    expect(unlocked.protected).toBe(false);
    expect(unlocked.n).toBe(5);
    expect(unlocked.rows).toEqual([{ questionId: "q1", average: 3.6, n: 5 }]);
  });

  it("rejects a token that has already been spent", async () => {
    const [target] = await getInviteTargets(cycleId);
    await submitServerResponse(target.token, [{ questionId: "q1", numberValue: 3 }]);

    await expect(submitServerResponse(target.token, [{ questionId: "q1", numberValue: 5 }])).rejects.toThrow(
      "You've already completed this survey.",
    );
  });

  it("rejects an unknown token", async () => {
    await expect(submitServerResponse("not-a-real-token", [{ questionId: "q1", numberValue: 3 }])).rejects.toThrow(
      "This link isn't valid.",
    );
  });
});
