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
 * doc comment. If the assigned subtree is below the cycle's k threshold,
 * the immediate parent scope is the only permitted fallback. Neither scope
 * is ever supplied by the client.
 */
type PeopleLeaderScope = Extract<ReportScope, { type: "team" }>;
type PeopleLeaderScopes = { own: PeopleLeaderScope; parent: PeopleLeaderScope | null };

async function resolveTeamScope(identity: IdentityRepository, tenantId: string, rootManagerId: string): Promise<PeopleLeaderScope> {
  const parentId = await identity.getEmployeeManagerId(tenantId, rootManagerId);
  const siblingIds = await identity.getSiblingManagerIds(tenantId, parentId);
  const siblingSubtrees = await Promise.all(
    siblingIds.map(async (managerId) => ({ managerId, teamLabels: await identity.getSubtreeTeamLabels(tenantId, managerId) })),
  );
  const own = siblingSubtrees.find((entry) => entry.managerId === rootManagerId);
  return { type: "team", rootManagerId, teamLabels: own?.teamLabels ?? [], siblingSubtrees };
}

async function resolvePeopleLeaderScope(identity: IdentityRepository, tenantId: string, rootEmployeeId: string | null): Promise<PeopleLeaderScopes | null> {
  if (!rootEmployeeId) return null;
  const parentId = await identity.getEmployeeManagerId(tenantId, rootEmployeeId);
  return {
    own: await resolveTeamScope(identity, tenantId, rootEmployeeId),
    parent: parentId ? await resolveTeamScope(identity, tenantId, parentId) : null,
  };
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
  peopleLeaderScopes?: PeopleLeaderScopes | null,
  role?: UserRole,
) {
  const cycle = cycleId ? await repo.getCycleForTenant(tenantId, cycleId, tenantName) : await repo.getLatestCycleForTenant(tenantId, tenantName);
  if (!cycle) {
    return {
      ...(cycleId ? { notFound: true as const } : {}),
      cycle: null,
      report: { protected: true as const, n: 0, rows: [] },
      textAnswers: { protected: true as const, n: 0, rows: [] },
      enps: { protected: true as const, n: 0, rows: [] },
      peopleLeaderRolledUp: false,
    };
  }
  const minGroupSize = "minGroupSize" in cycle ? cycle.minGroupSize : cycle.min_group_size;

  // A People Leader's server-resolved scope overrides the department param.
  // Never let a client-supplied query parameter widen this role's view.
  let scope: ReportScope | undefined = department ? { type: "department", department } : undefined;
  let peopleLeaderRolledUp = false;
  if (peopleLeaderScopes) {
    // This number remains inside the API. A protected child is indistinguish-
    // able to the client from an empty child; it merely receives its parent
    // aggregate when the child itself is below the configured k floor.
    const ownResponses = await repo.countSubmissionsForTeamLabels(tenantId, cycle.id, peopleLeaderScopes.own.teamLabels);
    if (ownResponses < minGroupSize && peopleLeaderScopes.parent) {
      scope = peopleLeaderScopes.parent;
      peopleLeaderRolledUp = true;
    } else {
      scope = peopleLeaderScopes.own;
    }
  }

  const result = {
    cycle: { id: cycle.id, name: cycle.name, minGroupSize },
    report: scope ? await repo.getProtectedReportForTenant(tenantId, cycle.id, minGroupSize, scope) : await repo.getProtectedReportForTenant(tenantId, cycle.id, minGroupSize),
  };

  // Comments have no subtree scope (only org and department -- see
  // getProtectedOpenTextReport's doc comment) and eNPS has no scope at all
  // yet -- rather than risk leaking beyond a People Leader's selected scope,
  // both stay empty/protected for a forced (people_leader) scope, never
  // an org-wide fallback.
  const textAnswers = !peopleLeaderScopes && role && canViewComments(role)
    ? await repo.getProtectedOpenTextReport(tenantId, result.cycle.id, result.cycle.minGroupSize, department ?? undefined)
    : { protected: true as const, n: 0, rows: [] };

  const enps = !peopleLeaderScopes
    ? await repo.getProtectedEnpsReport(tenantId, result.cycle.id, result.cycle.minGroupSize)
    : { protected: true as const, n: 0, rows: [] };

  return { ...result, textAnswers, enps, peopleLeaderRolledUp };
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
      const peopleLeaderScopes = session.role === "people_leader" ? await resolvePeopleLeaderScope(identity, tenant.id, session.peopleLeaderRootEmployeeId) : null;
      const report = await loadReportForCycle(client, new ResponseRepository(client), tenant.id, cycleId, tenant.name, department, peopleLeaderScopes, session.role);
      const effectiveTeams = peopleLeaderScopes
        ? (report.peopleLeaderRolledUp ? peopleLeaderScopes.parent?.teamLabels ?? peopleLeaderScopes.own.teamLabels : peopleLeaderScopes.own.teamLabels)
        : undefined;
      const eligibleCount = effectiveTeams ? await identity.countActiveEmployeesByTeams(tenant.id, effectiveTeams) : undefined;
      return { ...report, eligibleCount };
    });
    return NextResponse.json({ ok: true, tenant, ...result });
  }
  const adminPool = getDatabasePool();
  if (adminPool) {
    const identity = new IdentityRepository(adminPool);
    const peopleLeaderScopes = session.role === "people_leader" ? await resolvePeopleLeaderScope(identity, tenant.id, session.peopleLeaderRootEmployeeId) : null;
    const report = await loadReportForCycle(adminPool, new ResponseRepository(adminPool), tenant.id, cycleId, tenant.name, department, peopleLeaderScopes, session.role);
    const effectiveTeams = peopleLeaderScopes
      ? (report.peopleLeaderRolledUp ? peopleLeaderScopes.parent?.teamLabels ?? peopleLeaderScopes.own.teamLabels : peopleLeaderScopes.own.teamLabels)
      : undefined;
    const eligibleCount = effectiveTeams ? await identity.countActiveEmployeesByTeams(tenant.id, effectiveTeams) : undefined;
    return NextResponse.json({ ok: true, tenant, ...report, eligibleCount });
  }
  return NextResponse.json({ ok: true, cycle: null, report: await getProtectedServerReport() });
}
