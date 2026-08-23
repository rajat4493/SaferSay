import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";

// Regression test for a real bug found in live testing: the dev/test-mode
// queue-and-optionally-dispatch panel (/api/invites/queue) is a
// structurally separate duplicate of /api/invites/send's queueing logic,
// and never called openCycle() at all -- not even under the old
// delivery.sent > 0 condition. So the only working path in an environment
// where real email delivery is restricted (e.g. an unverified Resend
// sandbox domain) could queue and dispatch every invite and still leave
// the survey stuck in Draft forever, since nothing ever opened the cycle.
describe("both invite-sending routes open the cycle on a genuine send/queue action", () => {
  it("/api/invites/send opens on queued > 0, not delivery.sent > 0", () => {
    const route = readFileSync("src/app/api/invites/send/route.ts", "utf8");
    expect(route).toContain('deliveryType === "invite" && queued > 0');
    expect(route).toContain("openCycle(tenant.id, cycleId)");
  });

  it("/api/invites/queue opens the cycle too -- both on a bare queue and on queue+dispatch", () => {
    const route = readFileSync("src/app/api/invites/queue/route.ts", "utf8");
    const openCycleCallCount = route.split("openCycle(tenant.id, cycleId)").length - 1;
    expect(openCycleCallCount).toBeGreaterThanOrEqual(2);
  });

  it("both routes catch unexpected exceptions and return JSON instead of a bare 500", () => {
    // Regression test for the generic "Request failed." toast: response.json()
    // failing to parse a non-JSON error page was the client-visible symptom
    // of an uncaught server exception (most likely the Resend SDK throwing
    // for a rejected recipient, now also caught in resendDelivery.ts itself).
    for (const path of ["src/app/api/invites/send/route.ts", "src/app/api/invites/queue/route.ts"]) {
      const route = readFileSync(path, "utf8");
      expect(route).toContain("} catch (error) {");
      expect(route).toContain("status: 500");
    }
  });
});

describe("resendDelivery catches a thrown Resend SDK error per-recipient", () => {
  const source = readFileSync("src/lib/server/resendDelivery.ts", "utf8");

  it("wraps the Resend send call in try/catch, matching the SMTP branch's existing pattern", () => {
    const sendIndex = source.indexOf("resend.emails.send(");
    const tryIndex = source.lastIndexOf("try {", sendIndex);
    expect(tryIndex).toBeGreaterThan(-1);
    expect(sendIndex - tryIndex).toBeLessThan(200);
  });
});
