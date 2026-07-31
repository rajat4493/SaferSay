import type { NextRequest } from "next/server";
import { getDatabasePool } from "@/lib/server/db/pool";
import { IdentityRepository } from "@/lib/server/repositories/identityRepository";
import type { TenantRecord } from "@/lib/server/repositories/types";

const localTenant: TenantRecord = {
  id: "00000000-0000-4000-8000-000000000010",
  name: "SaferSay Demo Company",
  slug: "safersay-demo-company",
};

export type TenantContext = {
  tenant: TenantRecord;
  source: "header" | "env" | "local-fallback";
};

export async function resolveTenantContext(request?: NextRequest): Promise<TenantContext> {
  const db = getDatabasePool();
  if (!db) return { tenant: localTenant, source: "local-fallback" };

  const repo = new IdentityRepository(db);
  const headerTenantId = request?.headers.get("x-safersay-tenant-id");
  if (headerTenantId) {
    const tenant = await repo.findTenantById(headerTenantId);
    if (!tenant) throw new Error("Tenant header does not match an active tenant.");
    return { tenant, source: "header" };
  }

  const defaultTenantId = process.env.DEFAULT_TENANT_ID;
  if (defaultTenantId) {
    const tenant = await repo.findTenantById(defaultTenantId);
    if (!tenant) throw new Error("DEFAULT_TENANT_ID does not match an active tenant.");
    return { tenant, source: "env" };
  }

  const tenant = await repo.getOrCreateTenant("SaferSay Demo Company", "safersay-demo-company");
  return { tenant, source: "local-fallback" };
}
