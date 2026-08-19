import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import { ResponseRepository } from "./responseRepository";
import type { Queryable } from "@/lib/server/db/tenantPool";

function fakeDb(): { db: Queryable; queries: Array<{ sql: string; params: unknown[] }> } {
  const queries: Array<{ sql: string; params: unknown[] }> = [];
  const db: Queryable = {
    query: (async (sql: string, params: unknown[] = []) => {
      queries.push({ sql, params });
      if (sql.includes("select id, construct, text, question_type")) {
        return { rows: [{ id: "q1", construct: "Recognition", text: "I feel recognized for my work.", question_type: "scale" }] };
      }
      if (sql.includes("insert into responses.question_bank")) {
        return { rows: [{ id: "q2", construct: params[2], text: params[3], question_type: params[4] }] };
      }
      return { rows: [], rowCount: 1 };
    }) as Queryable["query"],
  };
  return { db, queries };
}

describe("question bank repository", () => {
  it("listQuestionBank excludes archived questions", async () => {
    const { db, queries } = fakeDb();
    const result = await new ResponseRepository(db).listQuestionBank("tenant-1");
    expect(queries[0].sql).toContain("archived_at is null");
    expect(result).toEqual([{ id: "q1", construct: "Recognition", text: "I feel recognized for my work.", questionType: "scale" }]);
  });

  it("addQuestionToBank scopes the insert to the tenant and returns the created row", async () => {
    const { db } = fakeDb();
    const result = await new ResponseRepository(db).addQuestionToBank("tenant-1", { construct: "Trust", text: "I trust leadership.", questionType: "scale" });
    expect(result.id).toBe("q2");
    expect(result.text).toBe("I trust leadership.");
  });

  it("archiveQuestionFromBank sets archived_at rather than deleting the row", async () => {
    const { db, queries } = fakeDb();
    await new ResponseRepository(db).archiveQuestionFromBank("tenant-1", "q1");
    expect(queries[0].sql).toContain("set archived_at = now()");
    expect(queries[0].sql).not.toContain("delete");
  });

  it("archiveQuestionFromBank throws when no row matched (wrong tenant or already archived)", async () => {
    const db: Queryable = { query: (async (_sql: string) => ({ rows: [], rowCount: 0 })) as Queryable["query"] };
    await expect(new ResponseRepository(db).archiveQuestionFromBank("tenant-1", "missing")).rejects.toThrow();
  });
});

describe("question_bank migration", () => {
  const migration = readFileSync("db/migrations/0024_question_bank.sql", "utf8");

  it("enables RLS with a tenant-isolation policy, same pattern as other tenant-scoped tables", () => {
    expect(migration).toContain("alter table responses.question_bank enable row level security");
    expect(migration).toContain("create policy tenant_isolation on responses.question_bank");
    expect(migration).toContain("current_setting('app.current_tenant_id', true)::uuid");
  });

  it("grants full CRUD to the restricted app role -- unlike responses.answers, question text is not raw response content", () => {
    expect(migration).toContain("grant select, insert, update, delete on responses.question_bank to safersay_app");
  });
});
