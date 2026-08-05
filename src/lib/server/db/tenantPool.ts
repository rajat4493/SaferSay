import { Pool, type PoolClient } from "pg";
import { getDatabasePool } from "@/lib/server/db/pool";

/** What both Pool and PoolClient expose that repositories actually use. */
export type Queryable = Pick<Pool, "query">;

let pool: Pool | null = null;

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
 * The single call site pattern for tenant-scoped database access: uses the
 * RLS-enforced restricted role when DATABASE_URL_APP is configured, falling
 * back to the privileged pool (today's behavior, application-code
 * filtering only) when it isn't -- so this is safe to roll out
 * incrementally without breaking environments that haven't set the new
 * role up yet.
 */
export async function withTenantScopedDb<T>(tenantId: string, run: (db: Queryable) => Promise<T>): Promise<T> {
  const tenantPool = getTenantPool();
  if (tenantPool) {
    return withTenantContext(tenantPool, tenantId, run);
  }
  const adminPool = getDatabasePool();
  if (!adminPool) throw new Error("DATABASE_URL is required.");
  return run(adminPool);
}
