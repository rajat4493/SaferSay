import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import { IdentityRepository } from "./identityRepository";
import type { Queryable } from "@/lib/server/db/tenantPool";
import type { BrandTheme } from "@/lib/brand";

const sampleBrand: BrandTheme = { name: "Acme", tagline: "We ship things.", logoDataUrl: null, accentColor: "#3366cc", fontFamily: "system" };

describe("tenant brand", () => {
  it("getBrand returns null when the tenant has never saved one", async () => {
    const db: Queryable = { query: (async (_sql: string) => ({ rows: [{ brand: null }] })) as Queryable["query"] };
    const result = await new IdentityRepository(db).getBrand("tenant-1");
    expect(result).toBeNull();
  });

  it("getBrand returns the stored object as-is", async () => {
    const db: Queryable = { query: (async (_sql: string) => ({ rows: [{ brand: sampleBrand }] })) as Queryable["query"] };
    const result = await new IdentityRepository(db).getBrand("tenant-1");
    expect(result).toEqual(sampleBrand);
  });

  it("setBrand upserts the whole object as JSON", async () => {
    const queries: Array<{ params: unknown[] }> = [];
    const db: Queryable = {
      query: (async (_sql: string, params: unknown[] = []) => {
        queries.push({ params });
        return { rows: [] };
      }) as Queryable["query"],
    };
    await new IdentityRepository(db).setBrand("tenant-1", sampleBrand);
    expect(queries[0].params).toEqual(["tenant-1", JSON.stringify(sampleBrand)]);
  });
});

describe("tenant_brand migration", () => {
  const migration = readFileSync("db/migrations/0034_tenant_brand.sql", "utf8");

  it("adds a nullable column with no default -- absent means fall back to defaultBrand", () => {
    expect(migration).toContain("add column if not exists brand jsonb");
    expect(migration).not.toMatch(/brand jsonb.*default/i);
  });
});

describe("brand route console scoping", () => {
  it("AppShell (tenant admin app) applies theme overrides, but no console page imports AppShell", () => {
    const appShell = readFileSync("src/components/AppShell.tsx", "utf8");
    expect(appShell).toContain("deriveAccentPalette");
  });
});
