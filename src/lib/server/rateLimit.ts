import type { NextRequest } from "next/server";
import { getDatabasePool } from "@/lib/server/db/pool";

/**
 * Fixed-window rate limiter backed by Postgres (identity.rate_limit_hits),
 * because Vercel serverless functions don't share memory across
 * invocations -- an in-process counter would reset on every cold start
 * and wouldn't be shared across concurrent instances either. Meant for
 * public, unauthenticated, token-gated routes (respondent session/
 * submit/SOS) where the caller has no session to key on, only an IP.
 *
 * Fails OPEN, not closed: if the database is unreachable, requests are
 * allowed through rather than the whole respondent flow going down
 * because the rate limiter's own dependency hiccuped.
 */
export async function checkRateLimit(params: {
  request: NextRequest;
  routeKey: string;
  limit: number;
  windowSeconds: number;
}): Promise<{ allowed: true } | { allowed: false; retryAfterSeconds: number }> {
  const pool = getDatabasePool();
  if (!pool) return { allowed: true };

  const ip = getClientIp(params.request);
  const windowMs = params.windowSeconds * 1000;
  const windowStart = new Date(Math.floor(Date.now() / windowMs) * windowMs);
  const bucketKey = `${params.routeKey}:${ip}`;

  try {
    const result = await pool.query<{ hit_count: number }>(
      `insert into identity.rate_limit_hits (bucket_key, window_start, hit_count)
       values ($1, $2, 1)
       on conflict (bucket_key, window_start)
       do update set hit_count = identity.rate_limit_hits.hit_count + 1
       returning hit_count`,
      [bucketKey, windowStart.toISOString()],
    );
    const count = result.rows[0]?.hit_count ?? 1;

    // Opportunistic cleanup, no dedicated cron needed for a table this
    // cheap to prune: ~1-in-200 requests sweeps windows old enough that
    // nothing could still be reading them.
    if (Math.random() < 0.005) {
      const staleBefore = new Date(Date.now() - windowMs * 4).toISOString();
      pool.query(`delete from identity.rate_limit_hits where window_start < $1`, [staleBefore]).catch(() => {});
    }

    if (count > params.limit) {
      const retryAfterSeconds = Math.ceil((windowStart.getTime() + windowMs - Date.now()) / 1000);
      return { allowed: false, retryAfterSeconds: Math.max(retryAfterSeconds, 1) };
    }
    return { allowed: true };
  } catch (error) {
    console.error(`Rate limit check failed for ${params.routeKey}, allowing request:`, error);
    return { allowed: true };
  }
}

function getClientIp(request: NextRequest): string {
  // Vercel sets x-forwarded-for; take the first (client) hop -- later
  // hops are Vercel's own edge infra, not attacker-controlled, but the
  // first entry is exactly as trustworthy as the platform's proxy is.
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0].trim();
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  return "unknown";
}
