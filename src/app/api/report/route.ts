import { NextResponse, type NextRequest } from "next/server";
import { getSessionContext, isPlatformOwnerImpersonating } from "@/lib/server/authSession";
import { getDatabasePool } from "@/lib/server/db/pool";
import { getTenantPool, withTenantContext, type Queryable } from "@/lib/server/db/tenantPool";
import { IdentityRepository } from "@/lib/server/repositories/identityRepository";
import { ResponseRepository } from "@/lib/server/repositories/responseRepository";
import type { ReportScope, UserRole } from "@/lib/server/repositories/types";
import { getProtectedServerReport } from "@/lib/serverStore";
import { canViewComments, canViewSurveyResults } from "@/lib/permissions";

/**
 * Resolves a People Leader's fixed report scope server-side -- never from
 * a client-supplied param. Siblings are every direct report of the root
 * manager's own parent (including the root itself), each resolved to
 * their own subtree's team labels, matching ReportScope's "team" variant
 * doc comment. Returns null when the user has no assigned subtree yet (a
 * people_leader with no rootEmployeeId sees nothing, never org-wide).
 */
async function resolvePeopleLeaderScope(identity: IdentityRepository, tenantId: string, rootEmployeeId: string | null): Promise<ReportScope | null> {
  if (!rootEmployeeId) return null;
  const parentId = await identity.getEmployeeManagerId(tenantId, rootEmployeeId);
  const siblingIds = await identity.getSiblingManagerIds(tenantId, parentId);
  const siblingSubtrees = await Promise.all(
    siblingIds.map(async (managerId) => ({ managerId, teamLabels: await identity.getSubtreeTeamLabels(tenantId, managerId) })),
  );
  const own = siblingSubtrees.find((entry) => entry.managerId === rootEmployeeId);
  return { type: "team", rootManagerId: rootEmployeeId, teamLabels: own?.teamLabels ?? [], siblingSubtrees };
}

/**
 * Reads a specific cycle's report when ?cycleId= is given (the
 * survey-object flow always passes it), otherwise falls back to the
 * tenant's latest cycle -- same optional-cycleId convention as
 * /api/invites/outbox and /api/invites/queue.
 */
async function loadReportForCycle(
  db: Queryable,
  repo: ResponseRepository,
  tenantId: string,
  cycleId: string | null,
  tenantName?: string,
  department?: string | null,
  forcedScope?: ReportScope | null,
  role?: UserRole,
) {
  // forcedScope (People Leader) overrides the department param entirely --
  // never let a client-supplied ?department= widen a scoped role's view.
  const scope: ReportScope | undefined = forcedScope ? forcedScope : department ? { type: "department", department } : undefined;

  // The no-cycleId "latest cycle" convenience path honors scope too --
  // e.g. the Overview dashboard's department picker calls /api/report
  // without a cycleId (it doesn't know the latest cycle's id upfront) and
  // still expects department scoping to apply, same as when a cycleId is
  // given explicitly.
  const result = !cycleId
    ? await repo.getLatestProtectedReportForTenant(tenantId, scope, tenantName)
    : await (async () => {
        const cycle = await repo.getCycleForTenant(tenantId, cycleId, tenantName);
        // A cycle id is an access boundary. A missing/cross-tenant cycle
        // must not masquerade as a real survey that is merely below the
        // anonymity threshold: doing so leaves a confusing locked shell at
        // another tenant's URL. The report remains structurally empty, but
        // callers get an explicit signal to render a not-found state.
        if (!cycle) return { notFound: true as const, cycle: null, report: { protected: true as const, n: 0, rows: [] } };
        return {
          cycle: { id: cycle.id, name: cycle.name, minGroupSize: cycle.minGroupSize },
          // A small segment is suppressed, never silently widened through a
          // manager/team roll-up. Showing a related group instead leaks a
          // count-derived clue and breaks the promise the picker implies.
          report: scope ? await repo.getProtectedReportForTenant(tenantId, cycle.id, cycle.minGroupSize, scope) : await repo.getProtectedReportForTenant(tenantId, cycle.id, cycle.minGroupSize),
        };
      })();

  // Comments have no subtree scope (only org and department -- see
  // getProtectedOpenTextReport's doc comment) and eNPS has no scope at all
  // yet -- rather than risk leaking beyond a People Leader's subtree,
  // both stay empty/protected for a forced (people_leader) scope, never
  // an org-wide fallback.
  const textAnswers = result.cycle && !forcedScope && role && canViewComments(role)
    ? await repo.getProtectedOpenTextReport(tenantId, result.cycle.id, result.cycle.minGroupSize, department ?? undefined)
    : { protected: true as const, n: 0, rows: [] };

  const enps = result.cycle && !forcedScope
    ? await repo.getProtectedEnpsReport(tenantId, result.cycle.id, result.cycle.minGroupSize)
    : { protected: true as const, n: 0, rows: [] };

  return { ...result, textAnswers, enps };
}

export async function GET(request: NextRequest) {
  const session = await getSessionContext();
  if (!session) {
    return NextResponse.json({ ok: false, error: "Unauthorized report access." }, { status: 401 });
  }
  if (!canViewSurveyResults(session.role)) return NextResponse.json({ ok: false, error: "You don't have permission to view reports." }, { status: 403 });

  if (isPlatformOwnerImpersonating(session)) {
    // Hard architectural rule: the platform operator never has a path to
    // response content, threshold or not -- "even the vendor can't read
    // this" is the product's core claim. "Enter workspace" is for tenant
    // metadata/ops support only, never reports.
    return NextResponse.json(
      { ok: false, error: "Platform owners cannot view tenant response content." },
      { status: 403 },
    );
  }

  // An unassigned People Leader must never fall back to an org-wide (or
  // any other) report -- block outright rather than let a missing scope
  // silently resolve to "no scope" downstream.
  if (session.role === "people_leader" && !session.peopleLeaderRootEmployeeId) {
    return NextResponse.json({ ok: true, tenant: session.tenant, cycle: null, report: { protected: true, n: 0, rows: [] } });
  }

  const cycleId = request.nextUrl.searchParams.get("cycleId");
  // A People Leader's scope is resolved server-side from their own
  // assignment, never from this query param -- see resolvePeopleLeaderScope.
  const department = session.role === "people_leader" ? null : request.nextUrl.searchParams.get("department");
  const tenantPool = getTenantPool();
  const { tenant } = session;
  if (tenantPool) {
    const result = await withTenantContext(tenantPool, tenant.id, async (client) => {
      const identity = new IdentityRepository(client);
      const forcedScope = session.role === "people_leader" ? await resolvePeopleLeaderScope(identity, tenant.id, session.peopleLeaderRootEmployeeId) : null;
      const report = await loadReportForCycle(client, new ResponseRepository(client), tenant.id, cycleId, tenant.name, department, forcedScope, session.role);
      // A People Leader's Response Rate needs their own subtree's
      // headcount, not the whole tenant's -- see countActiveEmployeesByTeams.
      const eligibleCount =
        forcedScope?.type === "team" ? await identity.countActiveEmployeesByTeams(tenant.id, forcedScope.teamLabels) : undefined;
      return { ...report, eligibleCount };
    });
    return NextResponse.json({ ok: true, tenant, ...result });
  }
  const adminPool = getDatabasePool();
  if (adminPool) {
    const identity = new IdentityRepository(adminPool);
    const forcedScope = session.role === "people_leader" ? await resolvePeopleLeaderScope(identity, tenant.id, session.peopleLeaderRootEmployeeId) : null;
    const report = await loadReportForCycle(adminPool, new ResponseRepository(adminPool), tenant.id, cycleId, tenant.name, department, forcedScope, session.role);
    const eligibleCount = forcedScope?.type === "team" ? await identity.countActiveEmployeesByTeams(tenant.id, forcedScope.teamLabels) : undefined;
    return NextResponse.json({ ok: true, tenant, ...report, eligibleCount });
  }
  return NextResponse.json({ ok: true, cycle: null, report: await getProtectedServerReport() });
}
