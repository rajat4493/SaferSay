import type { Queryable } from "@/lib/server/db/tenantPool";
import { IdentityRepository } from "@/lib/server/repositories/identityRepository";
import { ResponseRepository } from "@/lib/server/repositories/responseRepository";
import { computeGroupReleasability } from "@/lib/server/groupSuppression";
import type { ProtectedReport } from "@/lib/server/repositories/types";

/**
 * A team's report, rolled up to a wider manager subtree (then wider
 * still, then finally company-wide) when the team alone is too small to
 * clear min_group_size. One mechanism serves both flat orgs (no
 * manager_id data -> IdentityRepository.getTeamOwner returns null on the
 * first attempt -> falls straight to org-wide) and real pyramids (climbs
 * level by level) -- see plan history for the full design reasoning.
 *
 * Deliberately a standalone service, not a method on either repository:
 * it composes identity.employees org-chart reads (IdentityRepository)
 * with responses.* aggregate reads (ResponseRepository), and neither
 * repository is allowed to reach into the other's schema directly (see
 * reportApi.test.ts/reportTrendApi.test.ts's source-string guards) --
 * same reasoning as respondentSessionService.ts composing the two for
 * the taker session path.
 */
export async function getManagerRollupReport(
  db: Queryable,
  tenantId: string,
  cycleId: string,
  minGroupSize: number,
  requestedTeam: string,
): Promise<ProtectedReport> {
  const identity = new IdentityRepository(db);
  const response = new ResponseRepository(db);

  const directReleasability = await response.getDepartmentReleasability(tenantId, cycleId, minGroupSize);
  const directEntry = directReleasability.get(requestedTeam);
  if (directEntry?.releasable) {
    const report = await response.getMultiTeamProtectedReport(tenantId, cycleId, minGroupSize, [requestedTeam], directEntry.n);
    return report.protected ? report : { ...report, rolledUpTo: null };
  }

  const teamCounts = await response.getTeamCounts(tenantId, cycleId);

  let managerId = await identity.getTeamOwner(tenantId, requestedTeam);
  // Capped at 20 climbs as a defensive bound against a cyclic manager_id
  // chain, which the FK/import logic shouldn't ever produce but this
  // must not hang on.
  for (let climb = 0; managerId && climb < 20; climb += 1) {
    const parentManagerId = await identity.getEmployeeManagerId(tenantId, managerId);
    const siblingIds = await identity.getSiblingManagerIds(tenantId, parentManagerId);
    const siblingGroups = await Promise.all(
      siblingIds.map(async (id) => {
        const teams = await identity.getSubtreeTeamLabels(tenantId, id);
        return { id, teams, n: teams.reduce((sum, team) => sum + (teamCounts.get(team) ?? 0), 0) };
      }),
    );

    const releasability = computeGroupReleasability(
      siblingGroups.map((group) => ({ id: group.id, n: group.n })),
      minGroupSize,
    );
    const entry = releasability.get(managerId);

    if (entry?.releasable) {
      const teams = siblingGroups.find((group) => group.id === managerId)!.teams;
      const report = await response.getMultiTeamProtectedReport(tenantId, cycleId, minGroupSize, teams, entry.n);
      if (report.protected) return report;
      const managerLabel = await identity.getEmployeeLabel(tenantId, managerId);
      return { ...report, rolledUpTo: { label: `${managerLabel}'s team (including reports)`, teamsIncluded: teams } };
    }

    managerId = parentManagerId;
  }

  // Reached the root (or no owner could be determined at all -- a flat
  // org) without clearing the threshold at any manager level: fall back
  // to the existing, already-suppression-safe whole-cycle org report.
  const orgReport = await response.getProtectedReportForTenant(tenantId, cycleId, minGroupSize);
  if (orgReport.protected) return orgReport;
  return { ...orgReport, rolledUpTo: { label: "the whole company", teamsIncluded: Array.from(teamCounts.keys()) } };
}
