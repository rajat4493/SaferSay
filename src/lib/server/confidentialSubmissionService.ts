import type { Queryable } from "@/lib/server/db/tenantPool";
import { hashServerToken } from "@/lib/server/tokenHashing";
import { IdentityRepository } from "./repositories/identityRepository";
import { ResponseRepository } from "./repositories/responseRepository";
import { ResponseAnswerInput } from "./repositories/types";

/**
 * Thrown only for messages that are safe and intended to reach an anonymous
 * respondent verbatim. The API route surfaces `error.message` to the client
 * ONLY when it's this type -- any other thrown error (a raw driver/SQL
 * error, a programming mistake, anything else) gets a generic fallback
 * instead. Without this distinction, an unexpected error's raw text
 * (e.g. a Postgres constraint name) can leak straight to the respondent at
 * the single most anonymity-sensitive moment in the product -- which is
 * exactly what happened with the race condition below before this existed.
 */
export class RespondentFacingError extends Error {}

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
  if (!participant) throw new RespondentFacingError("This link isn't valid.");
  if (participant.token_status === "spent") throw new RespondentFacingError("You've already completed this survey.");
  if (participant.token_status !== "issued") throw new RespondentFacingError("This invite is no longer active.");

  // Tokens are minted at cycle-creation time (surveyCycleService.ts), well
  // before "Send invites" -- so an issued token is otherwise submittable
  // the moment a draft cycle exists, including via the developer/test-mode
  // send panel. Without this check, a still-draft survey (never sent, no
  // "Active surveys" count) could accumulate real submissions and even
  // unlock its aggregate report -- a genuine status/data-consistency bug
  // found in live testing, not a hypothetical.
  const cycle = await responseRepository.getCycleForTenant(participant.tenant_id, participant.cycle_id);
  if (!cycle || cycle.status !== "open") throw new RespondentFacingError("This survey isn't accepting responses right now.");

  try {
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
  } catch (error) {
    // The token_status check above and this insert aren't atomic against a
    // second concurrent submission of the same token (e.g. a double-click
    // before the button visibly disables) -- both requests can read
    // "issued" before either has marked it spent, so the second one hits
    // responses.submissions' unique constraint on spent_token_hash instead
    // of the friendly check above. Found live: a respondent saw the raw
    // Postgres "duplicate key value violates unique constraint ..." text
    // instead of a completion message. Recognize that one specific race
    // and give it the same friendly message the normal already-spent path
    // uses; anything else is a genuinely unexpected error and is left to
    // propagate (the route wraps it in a generic fallback, never raw text).
    const pgError = error as { code?: string; constraint?: string };
    const isSpentTokenRace = pgError?.code === "23505" && pgError?.constraint === "submissions_spent_token_hash_key";
    // markTokenSpent (identityRepository.ts) throws this same plain-text
    // message itself if its own update affects zero rows -- a second
    // manifestation of the identical race (token already flipped to spent
    // by the time this request's update runs), just caught one step later.
    // Route both through the same RespondentFacingError path.
    const isAlreadySpentRace = error instanceof Error && error.message === "You've already completed this survey.";
    if (isSpentTokenRace || isAlreadySpentRace) {
      throw new RespondentFacingError("You've already completed this survey.");
    }
    throw error;
  }
}
