import { getDatabasePool } from "@/lib/server/db/pool";
import { IdentityRepository } from "@/lib/server/repositories/identityRepository";
import type { TenantRecord } from "@/lib/server/repositories/types";

export const localTenant: TenantRecord = {
  id: "00000000-0000-4000-8000-000000000010",
  name: "SaferSay Demo Company",
  slug: "safersay-demo-company",
};

export type TenantContext = {
  tenant: TenantRecord;
  source: "env" | "local-fallback";
};

/**
 * System-level tenant resolver for contexts with no authenticated session
 * (local dev without Supabase configured). Never trust client input here —
 * authenticated routes should resolve tenant from the session via
 * `getSessionContext` in `@/lib/server/authSession` instead.
 */
export async function resolveTenantContext(): Promise<TenantContext> {
  const db = getDatabasePool();
  if (!db) return { tenant: localTenant, source: "local-fallback" };

  const repo = new IdentityRepository(db);
  const defaultTenantId = process.env.DEFAULT_TENANT_ID;
  if (defaultTenantId) {
    const tenant = await repo.findTenantById(defaultTenantId);
    if (!tenant) throw new Error("DEFAULT_TENANT_ID does not match an active tenant.");
    return { tenant, source: "env" };
  }

  const tenant = await repo.getOrCreateTenant("SaferSay Demo Company", "safersay-demo-company");
  return { tenant, source: "local-fallback" };
}
