import { describe, expect, it } from "vitest";
import { IdentityRepository } from "./identityRepository";
import type { Queryable } from "@/lib/server/db/tenantPool";

/**
 * A "reminder" email is only truthful for someone who actually received the
 * original invite -- otherwise it's their first-ever contact, titled
 * "SaferSay survey reminder" (see resendDelivery.ts's buildInviteMessage,
 * which doesn't distinguish "reminding" from "never sent"). Found while
 * auditing the product: prepareReminderOutbox used to target every
 * token_status='issued' participant regardless of whether their invite ever
 * actually delivered.
 */
describe("prepareReminderOutbox reminder-eligibility gate", () => {
  it("requires an existing sent invite row before preparing a reminder", async () => {
    const queries: Array<{ sql: string; params: unknown[] }> = [];
    const db: Queryable = {
      query: (async (sql: string, params: unknown[]) => {
        queries.push({ sql, params });
        return { rowCount: 0, rows: [] };
      }) as Queryable["query"],
    };

    await new IdentityRepository(db).prepareReminderOutbox("tenant-1", "cycle-1");

    const insertCall = queries[1]; // reset runs first, then the insert
    expect(insertCall.sql).toContain("insert into identity.invite_outbox");
    expect(insertCall.sql).toContain("delivery_type = 'invite' and sent.delivery_status = 'sent'");
  });

  it("resetFailedOutbox also requires a sent invite when retrying a failed reminder", async () => {
    const queries: Array<{ sql: string; params: unknown[] }> = [];
    const db: Queryable = {
      query: (async (sql: string, params: unknown[]) => {
        queries.push({ sql, params });
        return { rowCount: 0, rows: [] };
      }) as Queryable["query"],
    };

    await new IdentityRepository(db).prepareReminderOutbox("tenant-1", "cycle-1");

    const resetCall = queries[0];
    expect(resetCall.params).toEqual(["tenant-1", "cycle-1", "reminder"]);
    expect(resetCall.sql).toContain("delivery_type = 'invite' and sent.delivery_status = 'sent'");
  });

  it("does not apply the sent-invite gate to invite preparation itself (no circular requirement)", async () => {
    const queries: Array<{ sql: string; params: unknown[] }> = [];
    const db: Queryable = {
      query: (async (sql: string, params: unknown[]) => {
        queries.push({ sql, params });
        return { rowCount: 0, rows: [] };
      }) as Queryable["query"],
    };

    await new IdentityRepository(db).prepareInviteOutbox("tenant-1", "cycle-1");

    const insertCall = queries[1];
    expect(insertCall.sql).not.toContain("delivery_status = 'sent'");
  });
});
