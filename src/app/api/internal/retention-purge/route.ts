import { NextResponse, type NextRequest } from "next/server";
import { getDatabasePool } from "@/lib/server/db/pool";
import { purgeExpiredCycleDataForAllTenants } from "@/lib/server/dataRetentionService";
import { logDataRetentionPurged } from "@/lib/server/auditLog";

/**
 * Deletes expired survey response/participation data across every tenant,
 * per each tenant's identity.tenant_settings.retention_months. Intended to be
 * invoked on a schedule (see vercel.json's cron entry). Vercel Cron always
 * issues a GET request, authenticated with `Authorization: Bearer
 * $CRON_SECRET` -- exported as GET for that, and as POST too for manual
 * non-Vercel invocation.
 *
 * Unlike /api/internal/db-health, this does NOT fall through to "open" when
 * no secret is configured -- that route is read-only, this one deletes
 * real customer data, so a missing secret must fail closed, not silently
 * skip auth.
 */
async function handlePurge(request: NextRequest) {
  const secret = process.env.RETENTION_PURGE_SECRET ?? process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ ok: false, error: "Retention purge is not configured." }, { status: 503 });
  }
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  const pool = getDatabasePool();
  if (!pool) {
    return NextResponse.json({ ok: false, error: "DATABASE_URL is not configured." }, { status: 503 });
  }

  const results = await purgeExpiredCycleDataForAllTenants(pool);

  for (const result of results) {
    // Guard on real deletions, not cyclesPurged -- an already-emptied
    // cycle keeps matching the "past retention" query forever (its rows
    // are gone, not the cycle itself), so cyclesPurged alone would log a
    // no-op "purge ran" entry on every single run after the first.
    if (result.submissionsDeleted > 0 || result.participantsDeleted > 0) {
      await logDataRetentionPurged(result.tenantId, result.retentionMonths, result.cyclesPurged, result.submissionsDeleted).catch((error) => {
        console.error(`Audit log for data_retention_purged (${result.tenantId}) failed:`, error);
      });
    }
  }

  return NextResponse.json({
    ok: true,
    tenantsChecked: results.length,
    tenantsPurged: results.filter((r) => r.cyclesPurged > 0).length,
    totalSubmissionsDeleted: results.reduce((sum, r) => sum + r.submissionsDeleted, 0),
  });
}

export const GET = handlePurge;
export const POST = handlePurge;
