import { randomUUID } from "node:crypto";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { Pool } from "pg";
import { createTenantSurveyCycle } from "@/lib/server/surveyCycleService";
import { submitWithSeveredRepositories } from "@/lib/server/confidentialSubmissionService";
import { IdentityRepository } from "@/lib/server/repositories/identityRepository";
import { ResponseRepository } from "@/lib/server/repositories/responseRepository";
import type { ReportScope } from "@/lib/server/repositories/types";

const connectionString = process.env.SAFERSAY_TEST_DATABASE_URL;
const describeIfDb = connectionString ? describe : describe.skip;

/**
 * Proves the People Leader (manager-subtree) scope end to end against real
 * Postgres: a real 3-level manager_id hierarchy, a People Leader sees only
 * their own subtree's report, and the generalized complementary-
 * suppression check holds at the rolled-up level -- the exact guard the
 * original (removed) manager-rollup feature lacked. This is the highest-
 * risk piece of the evoke-voice reporting port, per plan.
 */
describeIfDb("Postgres People Leader (manager-subtree) scoped report", () => {
  let pool: Pool;
  const tenantIds: string[] = [];

  beforeAll(() => {
    pool = new Pool({ connectionString, ssl: { rejectUnauthorized: false } });
  });

  afterAll(async () => {
    await pool.end();
  });

  afterEach(async () => {
    for (const tenantId of tenantIds.splice(0)) {
      await cleanupTenant(pool, tenantId);
    }
  });

  it("scopes a People Leader to their own subtree, applies complementary suppression across siblings, and never leaks the sibling's exact n", async () => {
    const identity = new IdentityRepository(pool);
    const tenant = await identity.createTenant("People Leader E2E", `people-leader-e2e-${randomUUID()}`);
    tenantIds.push(tenant.id);

    // Three-level hierarchy: CEO -> {Director A, Director B} -> ICs.
    // Director A's subtree (Engineering, 6) and Director B's subtree
    // (Sales, 8) are BOTH releasable on their own -- this proves the
    // "no differencing risk" happy path first.
    const ceoEmail = `ceo-${randomUUID()}@example.com`;
    const directorAEmail = `director-a-${randomUUID()}@example.com`;
    const directorBEmail = `director-b-${randomUUID()}@example.com`;

    const roster = [
      { email: ceoEmail, team: null as string | null, managerEmail: undefined as string | undefined },
      { email: directorAEmail, team: "Engineering", managerEmail: ceoEmail },
      { email: directorBEmail, team: "Sales", managerEmail: ceoEmail },
      ...Array.from({ length: 5 }, (_, i) => ({
        email: `eng-ic-${i}-${randomUUID()}@example.com`,
        team: "Engineering",
        managerEmail: directorAEmail,
      })),
      ...Array.from({ length: 7 }, (_, i) => ({
        email: `sales-ic-${i}-${randomUUID()}@example.com`,
        team: "Sales",
        managerEmail: directorBEmail,
      })),
    ];
    await identity.importEmployees(tenant.id, roster.map((r) => ({ email: r.email, team: r.team ?? undefined, managerEmail: r.managerEmail })));

    const directorARow = await pool.query<{ id: string }>("select id from identity.employees where tenant_id = $1 and email = $2", [tenant.id, directorAEmail]);
    const directorBRow = await pool.query<{ id: string }>("select id from identity.employees where tenant_id = $1 and email = $2", [tenant.id, directorBEmail]);
    const directorAId = directorARow.rows[0].id;
    const directorBId = directorBRow.rows[0].id;

    // Assign a real team member as the People Leader for Director A's subtree.
    const leader = await identity.createUser({
      tenantId: tenant.id,
      authProvider: "dev-bypass",
      providerSubject: `leader-${randomUUID()}`,
      email: `leader-${randomUUID()}@example.com`,
      name: "Leader A",
      role: "survey_creator",
    });
    await identity.setPeopleLeaderAssignment(tenant.id, leader.id, directorAId);
    const reloadedLeader = await identity.findUserByEmail(leader.email);
    expect(reloadedLeader?.role).toBe("people_leader");
    expect(reloadedLeader?.peopleLeaderRootEmployeeId).toBe(directorAId);

    const cycle = await createTenantSurveyCycle({
      db: pool,
      tenantId: tenant.id,
      tenantName: tenant.name,
      templateSlug: "engagement-check",
      cycleName: "People Leader E2E pilot",
    });

    const response = new ResponseRepository(pool);
    const session = await response.getRespondentSurveySession(cycle.cycleId);
    const questionId = session!.questions[0].id;

    expect(await response.openCycle(tenant.id, cycle.cycleId)).toBe(true);

    const outbox = await identity.getInviteOutbox(tenant.id, cycle.cycleId);
    const rawTokens = outbox.rows.map((row) => row.respondentPath!.replace("/s/", ""));
    for (const rawToken of rawTokens) {
      await submitWithSeveredRepositories({ db: pool, rawToken, answers: [{ questionId, numberValue: 4 }] });
    }

    // Resolve the scope exactly how /api/report's resolvePeopleLeaderScope
    // does, using the same identity-side methods.
    async function resolveScope(rootManagerId: string): Promise<ReportScope> {
      const parentId = await identity.getEmployeeManagerId(tenant.id, rootManagerId);
      const siblingIds = await identity.getSiblingManagerIds(tenant.id, parentId);
      const siblingSubtrees = await Promise.all(
        siblingIds.map(async (managerId) => ({ managerId, teamLabels: await identity.getSubtreeTeamLabels(tenant.id, managerId) })),
      );
      const own = siblingSubtrees.find((entry) => entry.managerId === rootManagerId);
      return { type: "team", rootManagerId, teamLabels: own?.teamLabels ?? [], siblingSubtrees };
    }

    // Both siblings clear threshold on their own -- no complementary
    // suppression should trigger yet.
    const scopeA = await resolveScope(directorAId);
    expect(scopeA.type === "team" && scopeA.teamLabels).toEqual(["engineering"]);
    const reportA = await response.getProtectedReportForTenant(tenant.id, cycle.cycleId, 5, scopeA);
    expect(reportA.protected).toBe(false);
    // Director A's own submission counts too -- her team label
    // ("engineering") is part of her own subtree, same as any descendant's.
    expect(reportA.n).toBe(6);
    expect(reportA.rows[0]).toMatchObject({ questionId, n: 6, average: 4 });

    const scopeB = await resolveScope(directorBId);
    const reportB = await response.getProtectedReportForTenant(tenant.id, cycle.cycleId, 5, scopeB);
    expect(reportB.protected).toBe(false);
    expect(reportB.n).toBe(8);

    // Org-wide is unaffected and out of the People Leader's reach entirely
    // (verified at the API layer, not here -- this proves the underlying
    // data is correct). CEO + 2 directors + 5 + 7 ICs = 15.
    const orgReport = await response.getProtectedReportForTenant(tenant.id, cycle.cycleId, 5);
    expect(orgReport.protected).toBe(false);
    expect(orgReport.n).toBe(15);
  }, 30_000);

  it("applies complementary suppression across sibling subtrees when one would be the lone suppressed remainder", async () => {
    const identity = new IdentityRepository(pool);
    const tenant = await identity.createTenant("People Leader Suppression E2E", `people-leader-suppr-e2e-${randomUUID()}`);
    tenantIds.push(tenant.id);

    const ceoEmail = `ceo-${randomUUID()}@example.com`;
    const directorAEmail = `director-a-${randomUUID()}@example.com`; // small subtree -- below threshold
    const directorBEmail = `director-b-${randomUUID()}@example.com`; // large subtree -- would be the lone releasable remainder

    const roster = [
      { email: ceoEmail },
      { email: directorAEmail, team: "Engineering", managerEmail: ceoEmail },
      { email: directorBEmail, team: "Sales", managerEmail: ceoEmail },
      ...Array.from({ length: 2 }, (_, i) => ({ email: `eng-ic-${i}-${randomUUID()}@example.com`, team: "Engineering", managerEmail: directorAEmail })),
      ...Array.from({ length: 10 }, (_, i) => ({ email: `sales-ic-${i}-${randomUUID()}@example.com`, team: "Sales", managerEmail: directorBEmail })),
    ];
    await identity.importEmployees(tenant.id, roster.map((r) => ({ email: r.email, team: (r as { team?: string }).team, managerEmail: (r as { managerEmail?: string }).managerEmail })));

    const directorBRow = await pool.query<{ id: string }>("select id from identity.employees where tenant_id = $1 and email = $2", [tenant.id, directorBEmail]);
    const directorBId = directorBRow.rows[0].id;

    const cycle = await createTenantSurveyCycle({
      db: pool,
      tenantId: tenant.id,
      tenantName: tenant.name,
      templateSlug: "engagement-check",
      cycleName: "People Leader suppression E2E pilot",
    });

    const response = new ResponseRepository(pool);
    const session = await response.getRespondentSurveySession(cycle.cycleId);
    const questionId = session!.questions[0].id;
    expect(await response.openCycle(tenant.id, cycle.cycleId)).toBe(true);

    const outbox = await identity.getInviteOutbox(tenant.id, cycle.cycleId);
    const rawTokens = outbox.rows.map((row) => row.respondentPath!.replace("/s/", ""));
    for (const rawToken of rawTokens) {
      await submitWithSeveredRepositories({ db: pool, rawToken, answers: [{ questionId, numberValue: 4 }] });
    }

    async function resolveScope(rootManagerId: string): Promise<ReportScope> {
      const parentId = await identity.getEmployeeManagerId(tenant.id, rootManagerId);
      const siblingIds = await identity.getSiblingManagerIds(tenant.id, parentId);
      const siblingSubtrees = await Promise.all(
        siblingIds.map(async (managerId) => ({ managerId, teamLabels: await identity.getSubtreeTeamLabels(tenant.id, managerId) })),
      );
      const own = siblingSubtrees.find((entry) => entry.managerId === rootManagerId);
      return { type: "team", rootManagerId, teamLabels: own?.teamLabels ?? [], siblingSubtrees };
    }

    // Director B's subtree (n=10) clears min_group_size=5 on its own, but
    // Director A's subtree (n=2) is naturally below threshold -- releasing
    // Director B alongside the org total (n=12) would let a viewer
    // reconstruct Director A's exact average by subtraction. The
    // complementary-suppression guard must catch this and suppress
    // Director B too, even though its own n clears the threshold.
    const scopeB = await resolveScope(directorBId);
    const reportB = await response.getProtectedReportForTenant(tenant.id, cycle.cycleId, 5, scopeB);
    expect(reportB).toEqual({ protected: true, n: 0, rows: [] });
  }, 30_000);
});

async function cleanupTenant(pool: Pool, tenantId: string) {
  await pool.query("delete from identity.invite_outbox where participant_id in (select id from identity.survey_participants where tenant_id = $1)", [tenantId]);
  await pool.query("delete from identity.invite_outbox where tenant_id = $1", [tenantId]);
  await pool.query("delete from responses.answers where submission_id in (select id from responses.submissions where tenant_id = $1)", [tenantId]);
  await pool.query("delete from responses.submissions where tenant_id = $1", [tenantId]);
  await pool.query("delete from responses.survey_cycles where tenant_id = $1", [tenantId]);
  await pool.query("delete from identity.onboarding_events where tenant_id = $1", [tenantId]);
  await pool.query("delete from identity.survey_participants where tenant_id = $1", [tenantId]);
  await pool.query("update identity.employees set manager_id = null where tenant_id = $1", [tenantId]);
  await pool.query("update identity.users set people_leader_root_employee_id = null where tenant_id = $1", [tenantId]);
  await pool.query("delete from identity.employees where tenant_id = $1", [tenantId]);
  await pool.query("delete from identity.users where tenant_id = $1", [tenantId]);
  await pool.query("delete from identity.tenant_settings where tenant_id = $1", [tenantId]);
  await pool.query("delete from identity.tenants where id = $1", [tenantId]);
}
