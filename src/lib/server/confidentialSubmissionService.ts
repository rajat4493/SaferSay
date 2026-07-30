import { Pool } from "pg";
import { hashServerToken } from "@/lib/serverStore";
import { IdentityRepository } from "./repositories/identityRepository";
import { ResponseRepository } from "./repositories/responseRepository";
import { ResponseAnswerInput } from "./repositories/types";

export async function submitWithSeveredRepositories(params: {
  db: Pool;
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

  return params.db.query("begin").then(async () => {
    try {
      const submission = await responseRepository.submitAnswers({
        tenantId: participant.tenant_id,
        cycleId: participant.cycle_id,
        spentTokenHash: tokenHash,
        answers: params.answers,
      });
      await identityRepository.markTokenSpent(tokenHash);
      await params.db.query("commit");
      return submission;
    } catch (error) {
      await params.db.query("rollback");
      throw error;
    }
  });
}
