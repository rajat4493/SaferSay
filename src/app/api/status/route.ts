import { NextResponse } from "next/server";
import { getDatabasePool } from "@/lib/server/db/pool";

/**
 * Public, unauthenticated, deliberately minimal -- unlike
 * /api/internal/db-health (which exposes schema/column names for
 * severance verification and is secret-gated), this reports only
 * up/down booleans. Safe to point a public /status page or an external
 * uptime monitor at.
 */
export async function GET() {
  const startedAt = Date.now();
  const pool = getDatabasePool();
  let databaseOk = false;
  if (pool) {
    try {
      await pool.query("select 1");
      databaseOk = true;
    } catch {
      databaseOk = false;
    }
  }

  return NextResponse.json({
    ok: databaseOk,
    app: "up",
    database: databaseOk ? "up" : "down",
    checkedAt: new Date().toISOString(),
    responseTimeMs: Date.now() - startedAt,
  });
}
