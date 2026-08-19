import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import { IdentityRepository } from "./identityRepository";
import { encryptSecret, decryptSecret } from "@/lib/server/secretCrypto";
import type { Queryable } from "@/lib/server/db/tenantPool";

describe("secretCrypto", () => {
  it("round-trips a secret", () => {
    expect(decryptSecret(encryptSecret("super-secret-password"))).toBe("super-secret-password");
  });

  it("never stores the plaintext in the encrypted payload", () => {
    expect(encryptSecret("super-secret-password")).not.toContain("super-secret-password");
  });
});

describe("tenant SMTP config", () => {
  it("getSmtpConfig returns null when any required field is missing (falls back to global Resend)", async () => {
    const db: Queryable = {
      query: (async (_sql: string) => ({
        rows: [{ smtp_host: "smtp.example.com", smtp_port: null, smtp_username: "u", smtp_password_encrypted: "x", smtp_from_email: "a@b.com" }],
      })) as Queryable["query"],
    };
    const result = await new IdentityRepository(db).getSmtpConfig("tenant-1");
    expect(result).toBeNull();
  });

  it("getSmtpConfig decrypts the stored password", async () => {
    const encrypted = encryptSecret("hunter2");
    const db: Queryable = {
      query: (async (_sql: string) => ({
        rows: [{ smtp_host: "smtp.example.com", smtp_port: 587, smtp_username: "u", smtp_password_encrypted: encrypted, smtp_from_email: "a@b.com" }],
      })) as Queryable["query"],
    };
    const result = await new IdentityRepository(db).getSmtpConfig("tenant-1");
    expect(result?.password).toBe("hunter2");
  });

  it("setSmtpConfig(null) clears every column, no partial residue left behind", async () => {
    const queries: Array<{ params: unknown[] }> = [];
    const db: Queryable = {
      query: (async (_sql: string, params: unknown[] = []) => {
        queries.push({ params });
        return { rows: [] };
      }) as Queryable["query"],
    };
    await new IdentityRepository(db).setSmtpConfig("tenant-1", null);
    expect(queries[0].params).toEqual(["tenant-1", null, null, null, null, null]);
  });

  it("setSmtpConfig encrypts the password before it ever reaches a query parameter", async () => {
    const queries: Array<{ params: unknown[] }> = [];
    const db: Queryable = {
      query: (async (_sql: string, params: unknown[] = []) => {
        queries.push({ params });
        return { rows: [] };
      }) as Queryable["query"],
    };
    await new IdentityRepository(db).setSmtpConfig("tenant-1", { host: "smtp.example.com", port: 587, username: "u", password: "hunter2", fromEmail: "a@b.com" });
    expect(queries[0].params).not.toContain("hunter2");
  });
});

describe("tenant_smtp migration", () => {
  const migration = readFileSync("db/migrations/0026_tenant_smtp.sql", "utf8");

  it("adds nullable columns with no default -- absent means fall back to the global Resend sender", () => {
    expect(migration).toContain("add column if not exists smtp_host text");
    expect(migration).not.toMatch(/smtp_host text.*default/i);
  });

  it("stores the password encrypted, not plaintext", () => {
    expect(migration).toContain("smtp_password_encrypted");
  });
});

describe("resendDelivery SMTP branch", () => {
  const source = readFileSync("src/lib/server/resendDelivery.ts", "utf8");

  it("branches to tenant SMTP before falling back to the global Resend config", () => {
    const branchIndex = source.indexOf("if (smtpConfig)");
    const resendConfigIndex = source.indexOf("const config = getResendConfig();");
    expect(branchIndex).toBeGreaterThan(-1);
    expect(branchIndex).toBeLessThan(resendConfigIndex);
  });
});
