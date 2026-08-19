import { Pool, type PoolClient } from "pg";
import { getDatabasePool } from "@/lib/server/db/pool";
import { decryptSecret } from "@/lib/server/secretCrypto";

/** What both Pool and PoolClient expose that repositories actually use. */
export type Queryable = Pick<Pool, "query">;

let pool: Pool | null = null;
const dedicatedPools = new Map<string, Pool>();

/**
 * The restricted, non-superuser `safersay_app` role's connection pool --
 * RLS policies (db/migrations/0011_rls_tenant_isolation.sql) actually apply
 * to this role, unlike the privileged DATABASE_URL connection used for
 * Company/Owner-console operations and auth bootstrap. See
 * docs/strategy/SAFERSAY_CONFIDENTIALITY.md §1.2.
 *
 * Falls back to null when DATABASE_URL_APP isn't configured, so this is
 * additive -- routes that haven't been migrated to withTenantContext yet
 * keep working exactly as before on the existing pool.
 */
export function getTenantPool() {
  if (!process.env.DATABASE_URL_APP) return null;
  pool ??= new Pool({
    connectionString: process.env.DATABASE_URL_APP,
    ssl: process.env.DATABASE_URL_APP.includes("supabase.com") ? { rejectUnauthorized: false } : undefined,
  });
  return pool;
}

/**
 * Runs `callback` inside a transaction with `app.current_tenant_id` set via
 * set_config(..., true) -- transaction-local, so it can never leak onto a
 * different request that reuses this pooled connection afterward. Every
 * RLS policy on a tenant-scoped table keys off this setting.
 */
export async function withTenantContext<T>(
  tenantPool: Pool,
  tenantId: string,
  callback: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await tenantPool.connect();
  try {
    await client.query("BEGIN");
    await client.query("select set_config('app.current_tenant_id', $1, true)", [tenantId]);
    const result = await callback(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Resolves the pool a given tenant should actually use: their own
 * dedicated database if `identity.tenants.database_url_encrypted` is set
 * (see 0027_tenant_dedicated_db.sql), otherwise the shared restricted
 * pool from getTenantPool(). One extra control-plane query per call --
 * deliberately not cached across requests in v1, so a dedicated-DB
 * provisioning change takes effect immediately rather than waiting out a
 * stale cache. The resulting Pool *is* cached (keyed by connection
 * string), so this never opens a fresh TCP connection per request.
 */
async function getPoolForTenant(tenantId: string): Promise<Pool | null> {
  const controlPlane = getDatabasePool();
  if (controlPlane) {
    const result = await controlPlane.query<{ database_url_encrypted: string | null }>(
      "select database_url_encrypted from identity.tenants where id = $1",
      [tenantId],
    );
    const encrypted = result.rows[0]?.database_url_encrypted;
    if (encrypted) {
      const connectionString = decryptSecret(encrypted);
      let dedicated = dedicatedPools.get(connectionString);
      if (!dedicated) {
        dedicated = new Pool({
          connectionString,
          ssl: connectionString.includes("supabase.com") ? { rejectUnauthorized: false } : undefined,
        });
        dedicatedPools.set(connectionString, dedicated);
      }
      return dedicated;
    }
  }
  return getTenantPool();
}

/**
 * The single call site pattern for tenant-scoped database access: routes
 * to the tenant's dedicated database if they have one, otherwise the
 * RLS-enforced shared restricted role, otherwise the privileged pool
 * (today's behavior, application-code filtering only) -- so this is safe
 * to roll out incrementally without breaking environments that haven't
 * set DATABASE_URL_APP or any dedicated databases up yet.
 */
export async function withTenantScopedDb<T>(tenantId: string, run: (db: Queryable) => Promise<T>): Promise<T> {
  const tenantPool = await getPoolForTenant(tenantId);
  if (tenantPool) {
    return withTenantContext(tenantPool, tenantId, run);
  }
  const adminPool = getDatabasePool();
  if (!adminPool) throw new Error("DATABASE_URL is required.");
  return run(adminPool);
}
