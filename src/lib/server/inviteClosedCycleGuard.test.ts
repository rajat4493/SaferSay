import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";

describe("closed-cycle guard on invite prepare/queue routes", () => {
  const outbox = readFileSync("src/app/api/invites/outbox/route.ts", "utf8");
  const queue = readFileSync("src/app/api/invites/queue/route.ts", "utf8");

  it("outbox route checks cycle status before preparing invites/reminders", () => {
    const statusCheckIndex = outbox.indexOf('cycle?.status === "closed"');
    const prepareIndex = outbox.indexOf("prepareInviteOutbox(");
    expect(statusCheckIndex).toBeGreaterThan(-1);
    expect(statusCheckIndex).toBeLessThan(prepareIndex);
    expect(outbox).toContain("This survey is closed");
  });

  it("queue route checks cycle status before queuing or sending", () => {
    const statusCheckIndex = queue.indexOf('cycle?.status === "closed"');
    const queueIndex = queue.indexOf("markOutboxQueued(");
    expect(statusCheckIndex).toBeGreaterThan(-1);
    expect(statusCheckIndex).toBeLessThan(queueIndex);
    expect(queue).toContain("This survey is closed");
  });

  it("both routes reject the closed case with a 400, not a silent no-op", () => {
    expect(outbox).toMatch(/result === "closed"[\s\S]{0,120}status: 400/);
    expect(queue).toMatch(/result === "closed"[\s\S]{0,200}status: 400/);
  });
});
