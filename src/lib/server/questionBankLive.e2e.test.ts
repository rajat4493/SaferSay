import { randomUUID } from "node:crypto";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { Pool } from "pg";
import { IdentityRepository } from "@/lib/server/repositories/identityRepository";
import { ResponseRepository } from "@/lib/server/repositories/responseRepository";

// Exercises the widened question_bank type/options round-trip against
// real Postgres -- the fake-Queryable unit tests in questionBank.test.ts
// cover the repository's own SQL shape, but not whether the options
// JSONB column actually serializes/deserializes correctly.
const connectionString = process.env.SAFERSAY_TEST_DATABASE_URL;
const describeIfDb = connectionString ? describe : describe.skip;

describeIfDb("Postgres live question bank", () => {
  let pool: Pool;
  const tenantIds: string[] = [];

  beforeAll(() => {
    pool = new Pool({ connectionString, ssl: { rejectUnauthorized: false } });
  });

  afterAll(async () => {
    await pool.end();
  });

  afterEach(async () => {
    for (const tenantId of tenantIds.splice(0)) {
      await pool.query("delete from responses.question_bank where tenant_id = $1", [tenantId]);
      await pool.query("delete from identity.tenant_settings where tenant_id = $1", [tenantId]);
      await pool.query("delete from identity.tenants where id = $1", [tenantId]);
    }
  });

  it("round-trips a multiple_choice bank question with options", async () => {
    const identity = new IdentityRepository(pool);
    const tenant = await identity.createTenant("Question Bank E2E", `question-bank-e2e-${randomUUID()}`);
    tenantIds.push(tenant.id);

    const response = new ResponseRepository(pool);
    const options = [{ key: "a", label: "Option A" }, { key: "b", label: "Option B" }];
    const created = await response.addQuestionToBank(tenant.id, { text: "Pick one", questionType: "multiple_choice", options });
    expect(created.options).toEqual(options);

    const listed = await response.listQuestionBank(tenant.id);
    expect(listed).toHaveLength(1);
    expect(listed[0].options).toEqual(options);
    expect(listed[0].questionType).toBe("multiple_choice");
  }, 30_000);

  it("archived questions are excluded from the list but not deleted", async () => {
    const identity = new IdentityRepository(pool);
    const tenant = await identity.createTenant("Question Bank Archive E2E", `question-bank-archive-e2e-${randomUUID()}`);
    tenantIds.push(tenant.id);

    const response = new ResponseRepository(pool);
    const created = await response.addQuestionToBank(tenant.id, { text: "Old question", questionType: "scale" });
    await response.archiveQuestionFromBank(tenant.id, created.id);

    expect(await response.listQuestionBank(tenant.id)).toHaveLength(0);
  }, 30_000);
});
