import { describe, expect, it } from "vitest";
import { existsSync } from "fs";

describe("single safe invitation path", () => {
  it("removes old mock email routes", () => {
    expect(existsSync("src/app/api/emails/invites/route.ts")).toBe(false);
    expect(existsSync("src/app/api/emails/reminders/route.ts")).toBe(false);
    expect(existsSync("src/lib/emailService.ts")).toBe(false);
  });

  // ServerOpsPanel.tsx (a never-rendered dev demo panel that called
  // /api/cycles/seed and /api/cycles/launch with no runtime-mode gate --
  // a real production write path) was removed for GA, along with the
  // routes it called. Nothing points at /api/emails/* any more; the real
  // invitation path is /api/invites/outbox and /api/invites/queue,
  // exercised directly by src/app/api/invites/*.test.ts.
  it("removes the unrendered dev ops panel and the demo routes it called", () => {
    expect(existsSync("src/components/ServerOpsPanel.tsx")).toBe(false);
    expect(existsSync("src/app/api/cycles/seed/route.ts")).toBe(false);
    expect(existsSync("src/app/api/cycles/launch/route.ts")).toBe(false);
    expect(existsSync("src/app/api/cycles/pay/route.ts")).toBe(false);
  });
});
