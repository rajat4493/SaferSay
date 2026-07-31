import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";

describe("invite outbox foundation", () => {
  it("stores outbox state in identity schema only", () => {
    const migration = readFileSync("db/migrations/0004_invite_outbox.sql", "utf8");
    expect(migration).toContain("identity.invite_outbox");
    expect(migration).not.toContain("responses.");
    expect(migration).toContain("enable row level security");
  });

  it("keeps invite repository methods away from response answers/submissions", () => {
    const repo = readFileSync("src/lib/server/repositories/identityRepository.ts", "utf8");
    expect(repo).toContain("prepareInviteOutbox");
    expect(repo).toContain("prepareReminderOutbox");
    expect(repo).toContain("identity.invite_outbox");
    expect(repo).not.toContain("responses.submissions");
    expect(repo).not.toContain("responses.answers");
  });

  it("protects invite APIs with admin access", () => {
    const outboxRoute = readFileSync("src/app/api/invites/outbox/route.ts", "utf8");
    const queueRoute = readFileSync("src/app/api/invites/queue/route.ts", "utf8");
    expect(outboxRoute).toContain("hasAdminApiAccess");
    expect(queueRoute).toContain("hasAdminApiAccess");
    expect(outboxRoute).toContain("Unauthorized invite outbox access.");
    expect(queueRoute).toContain("Unauthorized invite queue access.");
  });

  it("sends Resend delivery only from queued identity outbox rows", () => {
    const queueRoute = readFileSync("src/app/api/invites/queue/route.ts", "utf8");
    const delivery = readFileSync("src/lib/server/resendDelivery.ts", "utf8");
    expect(queueRoute).toContain("getQueuedOutboxDeliveries");
    expect(queueRoute).toContain("sendQueuedInviteDeliveries");
    expect(queueRoute).toContain("markOutboxSent");
    expect(delivery).toContain("onboarding@resend.dev");
    expect(delivery).not.toContain("responses.answers");
    expect(delivery).not.toContain("responses.submissions");
  });
});
