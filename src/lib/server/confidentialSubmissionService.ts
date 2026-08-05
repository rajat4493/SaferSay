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

  if (!participant || participant.token_status !== "issued") {
    throw new Error("Token is invalid or already spent.");
  }

  const submission = await responseRepository.submitAnswers({
    tenantId: participant.tenant_id,
    cycleId: participant.cycle_id,
    spentTokenHash: tokenHash,
    answers: params.answers,
  });
  await identityRepository.markTokenSpent(tokenHash);
  return submission;
}
