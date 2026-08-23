import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";

describe("invites/send opens the cycle on a genuine send attempt, not on email delivery succeeding", () => {
  const route = readFileSync("src/app/api/invites/send/route.ts", "utf8");

  it("gates openCycle on queued > 0, not delivery.sent > 0", () => {
    // Regression test for a real bug found in live testing: an email
    // provider's sandbox-mode restriction (Resend rejecting every
    // recipient but the developer's own verified address) made
    // delivery.sent always 0, which permanently stranded every survey in
    // draft -- valid, working invite links existed, but nothing ever
    // flipped the cycle open because that used to require at least one
    // email to actually succeed. A respondent's link works independently
    // of whether the notification email reached them.
    expect(route).toContain('deliveryType === "invite" && queued > 0');
    expect(route).not.toContain('deliveryType === "invite" && delivery.sent > 0');
  });

  it("still reports delivery failures to the caller so they're actionable, even though they no longer block the cycle from opening", () => {
    expect(route).toContain("ok: result.delivery.failed === 0");
    expect(route).toContain("delivery.errors");
  });
});
