import type { Queryable } from "@/lib/server/db/tenantPool";
import { hashServerToken } from "@/lib/server/tokenHashing";
import { IdentityRepository } from "@/lib/server/repositories/identityRepository";
import { ResponseRepository } from "@/lib/server/repositories/responseRepository";

export async function getRespondentSurveySession(params: { db: Queryable; rawToken: string }) {
  const tokenHash = hashServerToken(params.rawToken);
  const identity = new IdentityRepository(params.db);
  const participant = await identity.findIssuedTokenForRespondentSession(tokenHash);
  if (!participant) return null;

  return new ResponseRepository(params.db).getRespondentSurveySession(participant.cycle_id);
}
