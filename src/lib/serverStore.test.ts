import { describe, expect, it } from "vitest";
import {
  getInviteTargets,
  getProtectedServerReport,
  launchPaidCycle,
  markCyclePaid,
  seedServerEmployees,
  submitServerResponse,
} from "./serverStore";

describe("server-side confidential spine", () => {
  it("issues server-side tokens, spends them once, and protects reports below threshold", async () => {
    await seedServerEmployees();
    await markCyclePaid();
    await launchPaidCycle();

    const targets = await getInviteTargets();
    expect(targets).toHaveLength(31);

    await submitServerResponse(targets[0].token, [{ questionId: "q_role", numberValue: 4 }]);
    await expect(
      submitServerResponse(targets[0].token, [{ questionId: "q_role", numberValue: 4 }]),
    ).rejects.toThrow(/already completed/);

    const protectedReport = await getProtectedServerReport();
    expect(protectedReport).toEqual({ protected: true, n: 1, rows: [] });
  });

  it("renders aggregate reports when the threshold is met", async () => {
    await seedServerEmployees();
    await markCyclePaid();
    await launchPaidCycle();

    const targets = await getInviteTargets();
    for (const target of targets.slice(0, 5)) {
      await submitServerResponse(target.token, [{ questionId: "q_role", numberValue: 4 }]);
    }

    const report = await getProtectedServerReport();
    expect(report.protected).toBe(false);
    expect(report.n).toBe(5);
    expect(report.rows).toEqual([{ questionId: "q_role", average: 4, n: 5 }]);
  });
});
