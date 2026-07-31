import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "fs";

describe("single safe invitation path", () => {
  it("removes old mock email routes", () => {
    expect(existsSync("src/app/api/emails/invites/route.ts")).toBe(false);
    expect(existsSync("src/app/api/emails/reminders/route.ts")).toBe(false);
    expect(existsSync("src/lib/emailService.ts")).toBe(false);
  });

  it("points server operations at invite outbox routes", () => {
    const panel = readFileSync("src/components/ServerOpsPanel.tsx", "utf8");
    expect(panel).toContain("/api/invites/outbox");
    expect(panel).toContain("/api/invites/queue");
    expect(panel).not.toContain("/api/emails/invites");
    expect(panel).not.toContain("/api/emails/reminders");
  });
});
