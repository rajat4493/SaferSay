import { NextResponse, type NextRequest } from "next/server";
import { getSessionContext, isPlatformOwnerImpersonating } from "@/lib/server/authSession";
import { getDatabasePool } from "@/lib/server/db/pool";
import { getTenantPool, withTenantContext, type Queryable } from "@/lib/server/db/tenantPool";
import { ResponseRepository } from "@/lib/server/repositories/responseRepository";
import { resolveTenantFromApiKey } from "@/lib/server/apiKeyAuth";
import { canViewSurveyResults } from "@/lib/permissions";

/**
 * Read-only report export for external tools (PowerBI/Tableau, a
 * ChatGPT connector -- see /api/integrations/chatgpt-actions). Accepts
 * EITHER the normal session cookie (admin downloading from the UI) OR an
 * `Authorization: Bearer ssk_...` tenant API key (non-interactive pull).
 * Reuses the exact same k-anonymity-gated repository methods as
 * /api/report -- an export can never see anything the in-app report
 * couldn't, protected rows stay protected here too.
 */
async function resolveTenantId(request: NextRequest): Promise<{ tenantId: string; isSession: boolean } | null> {
  const apiKeyTenantId = await resolveTenantFromApiKey(request);
  if (apiKeyTenantId) return { tenantId: apiKeyTenantId, isSession: false };

  const session = await getSessionContext();
  if (!session) return null;
  if (!canViewSurveyResults(session.role)) return null;
  if (isPlatformOwnerImpersonating(session)) return null;
  return { tenantId: session.tenant.id, isSession: true };
}

function toCsv(rows: Array<{ label?: string; n: number; average: number | null }>) {
  const header = ["Question", "Responses", "Average"];
  const lines = [header, ...rows.map((row) => [row.label ?? "", String(row.n), row.average?.toFixed(2) ?? ""])];
  return lines.map((line) => line.map((cell) => `"${cell.replaceAll('"', '""')}"`).join(",")).join("\n");
}

export async function GET(request: NextRequest) {
  const resolved = await resolveTenantId(request);
  if (!resolved) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  const cycleId = request.nextUrl.searchParams.get("cycleId");
  const format = request.nextUrl.searchParams.get("format") === "json" ? "json" : "csv";

  const run = async (db: Queryable) => {
    const repo = new ResponseRepository(db);
    if (cycleId) {
      const cycle = await repo.getCycleForTenant(resolved.tenantId, cycleId);
      if (!cycle) return { cycle: null, report: { protected: true as const, n: 0, rows: [] } };
      return { cycle, report: await repo.getProtectedReportForTenant(resolved.tenantId, cycle.id, cycle.minGroupSize) };
    }
    return repo.getLatestProtectedReportForTenant(resolved.tenantId);
  };

  const tenantPool = getTenantPool();
  const result = tenantPool
    ? await withTenantContext(tenantPool, resolved.tenantId, (client) => run(client))
    : await (async () => {
        const adminPool = getDatabasePool();
        if (!adminPool) throw new Error("No database configured.");
        return run(adminPool);
      })();

  if (format === "json") {
    return NextResponse.json({ ok: true, cycle: result.cycle, report: result.report });
  }

  const rows = result.report.protected ? [] : result.report.rows;
  const csv = toCsv(rows);
  return new NextResponse(csv, {
    status: 200,
    headers: {
      "content-type": "text/csv",
      "content-disposition": `attachment; filename="${result.cycle?.name ?? "safersay-report"}.csv"`,
    },
  });
}
