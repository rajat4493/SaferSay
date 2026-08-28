import { NextResponse } from "next/server";
import { getSessionContext, isPlatformOwnerImpersonating } from "@/lib/server/authSession";
import { withTenantScopedDb } from "@/lib/server/db/tenantPool";
import { IdentityRepository } from "@/lib/server/repositories/identityRepository";
import { ResponseRepository } from "@/lib/server/repositories/responseRepository";
import type { CommitmentRollupItem } from "@/lib/server/repositories/types";

/**
 * Org-wide commitment status across every cycle -- visibility the
 * workspace owner opted into for themselves (action_mode ===
 * "tracked_with_rollup"), never a mechanism for watching anyone else's
 * team. customer_admin only, matching the same "one accountable role
 * sees the whole org" pattern already used for broad API keys.
 *
 * Purely identity-schema data (statement/status/dates) joined client-side
 * (in this route, not SQL) to cycle names from the responses schema --
 * identity.cycle_commitments deliberately has no FK into
 * responses.survey_cycles, so this does two separate reads and merges by
 * id, never a cross-schema join.
 */
export async function GET() {
  const session = await getSessionContext();
  if (!session) return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  if (isPlatformOwnerImpersonating(session)) {
    return NextResponse.json({ ok: false, error: "Platform owners cannot view tenant commitments." }, { status: 403 });
  }
  if (session.role !== "customer_admin") {
    return NextResponse.json({ ok: false, error: "Only the workspace owner can view the commitment rollup." }, { status: 403 });
  }

  const { commitments, actionMode, cycleNames } = await withTenantScopedDb(session.tenant.id, async (db) => {
    const identity = new IdentityRepository(db);
    const responses = new ResponseRepository(db);
    // Sequential, not Promise.all -- may run on a single tenant-scoped
    // connection, same reasoning as the note in /api/invites/send.
    const settings = await identity.getTenantSelfSettings(session.tenant.id);
    const allCommitments = await identity.listAllCommitments(session.tenant.id);
    const cycles = await responses.listCyclesForTenant(session.tenant.id);
    const names = new Map(cycles.map((cycle) => [cycle.id, cycle.name]));
    return { commitments: allCommitments, actionMode: settings.actionMode, cycleNames: names };
  });

  if (actionMode !== "tracked_with_rollup") {
    return NextResponse.json({ ok: false, error: "Turn on the commitment rollup in Settings first.", rollupDisabled: true }, { status: 400 });
  }

  const today = new Date().toISOString().slice(0, 10);
  const rollup: CommitmentRollupItem[] = commitments.map((commitment) => ({
    ...commitment,
    cycleName: cycleNames.get(commitment.cycleId) ?? "Unknown survey",
    stale: commitment.status !== "completed" && commitment.targetDate < today,
  }));

  return NextResponse.json({ ok: true, commitments: rollup });
}
