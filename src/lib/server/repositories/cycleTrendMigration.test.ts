import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";

describe("cross-cycle trend migration", () => {
  const migration = readFileSync("db/migrations/0019_cross_cycle_comparison.sql", "utf8");

  it("aggregates per cycle's own min_group_size, not a single global threshold", () => {
    expect(migration).toContain("report_question_trend");
    expect(migration).toContain("count(*) >= c.min_group_size");
    expect(migration).toContain("count(*) < c.min_group_size as protected");
  });

  it("scopes to the requesting tenant and grants the restricted app role execute access only", () => {
    expect(migration).toContain("c.tenant_id = target_tenant_id");
    expect(migration).toContain("security definer");
    expect(migration).toContain("grant execute on function responses.report_question_trend(uuid, uuid[]) to safersay_app");
    expect(migration).not.toMatch(/grant\s+select.*on\s+responses\.answers/i);
  });
});
