import { getDatabasePool } from "@/lib/server/db/pool";

/**
 * DB-backed fixed-window rate limiter -- deliberately not in-memory,
 * since serverless invocations don't share memory reliably (see
 * 0028_rate_limits.sql). Fails OPEN (returns allowed: true) if the
 * database is unreachable, rather than taking the whole route down --
 * matches this app's general posture of degrading gracefully outside
 * the confidentiality-critical paths.
 *
 * `key` should already include the route/purpose, e.g. `submit:${tokenHash}`
 * or `devlogin:${ip}` -- callers pick the identity to bucket on.
 */
export async function checkRateLimit(key: string, limit: number, windowSeconds: number): Promise<{ allowed: boolean; count: number }> {
  const pool = getDatabasePool();
  if (!pool) return { allowed: true, count: 0 };

  try {
    const result = await pool.query<{ count: number }>(
      `insert into identity.rate_limits (bucket_key, count, window_start)
       values ($1, 1, now())
       on conflict (bucket_key) do update set
         count = case when identity.rate_limits.window_start < now() - ($2 || ' seconds')::interval
                   then 1
                   else identity.rate_limits.count + 1
                 end,
         window_start = case when identity.rate_limits.window_start < now() - ($2 || ' seconds')::interval
                   then now()
                   else identity.rate_limits.window_start
                 end
       returning count`,
      [key, windowSeconds],
    );
    const count = result.rows[0]?.count ?? 0;
    return { allowed: count <= limit, count };
  } catch {
    return { allowed: true, count: 0 };
  }
}

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}
