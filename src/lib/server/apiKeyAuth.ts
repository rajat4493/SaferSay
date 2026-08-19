import { getDatabasePool } from "@/lib/server/db/pool";
import { IdentityRepository } from "@/lib/server/repositories/identityRepository";

/**
 * Resolves an `Authorization: Bearer ssk_...` header to a tenant id, for
 * non-interactive integrations (PowerBI/Tableau/ChatGPT -- see
 * /api/report/export). Runs on the privileged pool because the tenant
 * isn't known yet -- this lookup is what establishes it, same reasoning
 * as respondent-token resolution (findIssuedToken).
 */
export async function resolveTenantFromApiKey(request: Request): Promise<string | null> {
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return null;
  const rawKey = header.slice("Bearer ".length).trim();
  if (!rawKey.startsWith("ssk_")) return null;

  const adminPool = getDatabasePool();
  if (!adminPool) return null;

  const result = await new IdentityRepository(adminPool).findTenantForApiKey(rawKey);
  return result?.tenantId ?? null;
}
