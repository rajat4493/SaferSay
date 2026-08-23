import type { Queryable } from "@/lib/server/db/tenantPool";
import { hashServerToken } from "@/lib/server/tokenHashing";
import { IdentityRepository } from "./repositories/identityRepository";
import { ResponseRepository } from "./repositories/responseRepository";
import { ResponseAnswerInput } from "./repositories/types";

/**
 * Caller is responsible for wrapping this in a transaction (a single
 * checked-out client, not a bare Pool -- see withTenantContext) so the
 * submission insert and token-spend update are atomic together.
 */
export async function submitWithSeveredRepositories(params: {
  db: Queryable;
  rawToken: string;
  answers: ResponseAnswerInput[];
}) {
  const tokenHash = hashServerToken(params.rawToken);
  const identityRepository = new IdentityRepository(params.db);
  const responseRepository = new ResponseRepository(params.db);
  const participant = await identityRepository.findIssuedToken(tokenHash);

  // Distinct, plain-language reasons -- "you already answered this" and
  // "this link doesn't work" are different situations for a respondent,
  // not the same generic failure.
  if (!participant) throw new Error("This link isn't valid.");
  if (participant.token_status === "spent") throw new Error("You've already completed this survey.");
  if (participant.token_status !== "issued") throw new Error("This invite is no longer active.");

  // Tokens are minted at cycle-creation time (surveyCycleService.ts), well
  // before "Send invites" -- so an issued token is otherwise submittable
  // the moment a draft cycle exists, including via the developer/test-mode
  // send panel. Without this check, a still-draft survey (never sent, no
  // "Active surveys" count) could accumulate real submissions and even
  // unlock its aggregate report -- a genuine status/data-consistency bug
  // found in live testing, not a hypothetical.
  const cycle = await responseRepository.getCycleForTenant(participant.tenant_id, participant.cycle_id);
  if (!cycle || cycle.status !== "open") throw new Error("This survey isn't accepting responses right now.");

  const submission = await responseRepository.submitAnswers({
    tenantId: participant.tenant_id,
    cycleId: participant.cycle_id,
    spentTokenHash: tokenHash,
    answers: params.answers,
    // Snapshotted at invite-issuance time (identityRepository.issueTokens),
    // not looked up live here -- see 0020_participant_team_snapshot.sql.
    segmentTeam: participant.team,
  });
  await identityRepository.markTokenSpent(tokenHash);
  return submission;
}
