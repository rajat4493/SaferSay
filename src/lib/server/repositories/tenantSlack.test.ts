import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import { IdentityRepository } from "./identityRepository";
import { encryptSecret, decryptSecret } from "@/lib/server/secretCrypto";
import type { Queryable } from "@/lib/server/db/tenantPool";

describe("tenant Slack webhook", () => {
  it("getSlackWebhookUrl returns null when nothing is stored", async () => {
    const db: Queryable = {
      query: (async (_sql: string) => ({ rows: [{ slack_webhook_url_encrypted: null }] })) as Queryable["query"],
    };
    const result = await new IdentityRepository(db).getSlackWebhookUrl("tenant-1");
    expect(result).toBeNull();
  });

  it("getSlackWebhookUrl decrypts the stored URL", async () => {
    const encrypted = encryptSecret("https://hooks.slack.com/services/T00/B00/xyz");
    const db: Queryable = {
      query: (async (_sql: string) => ({ rows: [{ slack_webhook_url_encrypted: encrypted }] })) as Queryable["query"],
    };
    const result = await new IdentityRepository(db).getSlackWebhookUrl("tenant-1");
    expect(result).toBe("https://hooks.slack.com/services/T00/B00/xyz");
  });

  it("setSlackWebhookUrl encrypts the URL before it ever reaches a query parameter", async () => {
    const queries: Array<{ params: unknown[] }> = [];
    const db: Queryable = {
      query: (async (_sql: string, params: unknown[] = []) => {
        queries.push({ params });
        return { rows: [] };
      }) as Queryable["query"],
    };
    await new IdentityRepository(db).setSlackWebhookUrl("tenant-1", "https://hooks.slack.com/services/T00/B00/xyz");
    expect(queries[0].params).not.toContain("https://hooks.slack.com/services/T00/B00/xyz");
  });

  it("setSlackWebhookUrl(null) clears the column", async () => {
    const queries: Array<{ params: unknown[] }> = [];
    const db: Queryable = {
      query: (async (_sql: string, params: unknown[] = []) => {
        queries.push({ params });
        return { rows: [] };
      }) as Queryable["query"],
    };
    await new IdentityRepository(db).setSlackWebhookUrl("tenant-1", null);
    expect(queries[0].params).toEqual(["tenant-1", null]);
  });

  it("decryptSecret round-trips what encryptSecret produced (sanity check shared with SMTP)", () => {
    expect(decryptSecret(encryptSecret("https://hooks.slack.com/services/x"))).toBe("https://hooks.slack.com/services/x");
  });
});

describe("tenant_slack_webhook migration", () => {
  const migration = readFileSync("db/migrations/0032_tenant_slack_webhook.sql", "utf8");

  it("adds a nullable column with no default -- absent means Slack isn't connected", () => {
    expect(migration).toContain("add column if not exists slack_webhook_url_encrypted text");
    expect(migration).not.toMatch(/slack_webhook_url_encrypted text.*default/i);
  });
});

describe("Slack webhook URL validation", () => {
  // Shared by both /api/tenants/settings and /api/tenants/integrations --
  // see tenantConfigValidation.ts's doc comment on why this lives in one
  // place instead of being copy-pasted per route.
  const source = readFileSync("src/lib/server/tenantConfigValidation.ts", "utf8");

  it("only accepts a real hooks.slack.com URL, not an arbitrary host (SSRF guard)", () => {
    expect(source).toContain('url.hostname === "hooks.slack.com"');
    expect(source).toContain('url.protocol === "https:"');
  });

  it("both tenant-settings and tenant-integrations routes use the shared validator", () => {
    const settingsSource = readFileSync("src/app/api/tenants/settings/route.ts", "utf8");
    const integrationsSource = readFileSync("src/app/api/tenants/integrations/route.ts", "utf8");
    expect(settingsSource).toContain("isSlackWebhookUrl");
    expect(integrationsSource).toContain("isSlackWebhookUrl");
  });
});

describe("Slack post route", () => {
  const source = readFileSync("src/app/api/slack/post/route.ts", "utf8");

  it("rate-limits before posting", () => {
    expect(source).toContain("checkRateLimit(");
  });

  it("never accepts a caller-supplied webhook URL -- always looks up the tenant's stored one", () => {
    expect(source).toContain("getSlackWebhookUrl(session.tenant.id)");
    expect(source).not.toContain("body.webhookUrl");
    expect(source).not.toContain("body.url");
  });
});
