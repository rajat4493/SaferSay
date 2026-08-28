import { NextResponse, type NextRequest } from "next/server";
import { getSessionContext, isPlatformOwnerImpersonating } from "@/lib/server/authSession";
import { getDatabasePool } from "@/lib/server/db/pool";
import { getTenantPool, withTenantContext } from "@/lib/server/db/tenantPool";
import { IdentityRepository } from "@/lib/server/repositories/identityRepository";
import { ResponseRepository } from "@/lib/server/repositories/responseRepository";
import type { ProtectedReport } from "@/lib/server/repositories/types";
import { generateInsights, isAIInsightsConfigured } from "@/lib/server/aiInsights";
import { buildDeterministicInsights, buildInsightsPayload, isEligibleForInsights } from "@/lib/server/aiInsightsContract";
import { hasAIInsightsEntitlement } from "@/lib/billingCatalog";

/**
 * AI interpretation layer (coherence-directive addition). Reuses the exact
 * same report-loading path as /api/report -- never queries responses.*
 * directly -- then hands only the already-unlocked, k-enforced numbers to
 * aiInsights.ts. See docs/COHERENCE_PLAN.md / the AI insights build note
 * for the full data-contract rationale.
 */
type InsightsReportLoad = {
  cycle: { id: string; name: string; minGroupSize: number } | null;
  report: ProtectedReport;
};

async function loadReportForCycle(repo: ResponseRepository, tenantId: string, cycleId: string | null): Promise<InsightsReportLoad> {
  if (!cycleId) {
    const latest = await repo.getLatestProtectedReportForTenant(tenantId);
    return { cycle: latest.cycle, report: latest.report as ProtectedReport };
  }

  const cycle = await repo.getCycleForTenant(tenantId, cycleId);
  if (!cycle) {
    const protectedReport: ProtectedReport = { protected: true, n: 0, rows: [] };
    return { cycle: null, report: protectedReport };
  }

  return {
    cycle: { id: cycle.id, name: cycle.name, minGroupSize: cycle.minGroupSize },
    report: await repo.getProtectedReportForTenant(tenantId, cycle.id, cycle.minGroupSize),
  };
}

export async function GET(request: NextRequest) {
  const session = await getSessionContext();
  if (!session) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }
  if (isPlatformOwnerImpersonating(session)) {
    // Same hard rule as /api/report: the platform operator never has a
    // path to response content, and that extends to a third-party model
    // call built on top of it.
    return NextResponse.json({ ok: false, error: "Platform owners cannot view tenant response content." }, { status: 403 });
  }
  const cycleId = request.nextUrl.searchParams.get("cycleId");
  const { tenant } = session;

  const tenantPool = getTenantPool();
  const loaded = tenantPool
    ? await withTenantContext(tenantPool, tenant.id, async (client) => {
        const responseRepo = new ResponseRepository(client);
        const identityRepo = new IdentityRepository(client);
        // Sequential, not Promise.all: this may run on a single
        // tenant-scoped connection (see the note in /api/invites/send).
        const { cycle, report } = await loadReportForCycle(responseRepo, tenant.id, cycleId);
        const settings = await identityRepo.getTenantSelfSettings(tenant.id);
        return { cycle, report, features: settings.features, billingTerms: settings.billingTerms };
      })
    : await (async () => {
        const adminPool = getDatabasePool();
        if (!adminPool) throw new Error("DATABASE_URL is required.");
        const responseRepo = new ResponseRepository(adminPool);
        const identityRepo = new IdentityRepository(adminPool);
        const { cycle, report } = await loadReportForCycle(responseRepo, tenant.id, cycleId);
        const settings = await identityRepo.getTenantSelfSettings(tenant.id);
        return { cycle, report, features: settings.features, billingTerms: settings.billingTerms };
      })();

  if (!isEligibleForInsights(loaded.report)) {
    return NextResponse.json({ ok: false, error: "Not enough data yet.", insufficientData: true }, { status: 400 });
  }

  // Recognizing what a report says and recommending something to try is
  // the core "we recognize and recommend, you decide" promise -- it never
  // sits behind a paywall. The deterministic tier (a rules-based read of
  // this cycle's already-unlocked, k-enforced numbers, no model call) is
  // always available. Paid survey credits only unlock the AI-generated
  // upgrade -- better writing/synthesis of the same real numbers, not
  // access to recognition itself.
  const entitled = hasAIInsightsEntitlement(loaded.features, loaded.billingTerms);
  const payload = buildInsightsPayload(loaded.report, loaded.cycle?.minGroupSize ?? 5);

  if (!entitled || !isAIInsightsConfigured()) {
    return NextResponse.json({
      ok: true,
      source: "deterministic",
      insights: buildDeterministicInsights(payload),
      aiUpgradeAvailable: !entitled,
    });
  }

  try {
    const insights = await generateInsights(payload);
    return NextResponse.json({ ok: true, source: "ai", insights, aiUpgradeAvailable: false });
  } catch {
    // Never log payload or model-response content -- zero-retention terms
    // apply. Only the generic failure reaches the log.
    console.error("AI insights generation failed.");
    // A paying tenant still gets a real, correct answer -- the AI call
    // failing shouldn't mean "nothing," it means "the free tier," same as
    // an unentitled tenant sees by default.
    return NextResponse.json({ ok: true, source: "deterministic", insights: buildDeterministicInsights(payload), aiUpgradeAvailable: false, aiTemporarilyUnavailable: true });
  }
}
