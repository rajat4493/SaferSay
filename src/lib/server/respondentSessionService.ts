import type { Queryable } from "@/lib/server/db/tenantPool";
import { hashServerToken } from "@/lib/server/tokenHashing";
import { IdentityRepository } from "@/lib/server/repositories/identityRepository";
import { ResponseRepository } from "@/lib/server/repositories/responseRepository";
import type { ShowIfCondition } from "@/lib/server/repositories/types";
import { defaultBrand } from "@/lib/brand";

/**
 * Option-B branching evaluation: gated only on structural facts snapshotted
 * at invite time (never a prior answer -- see plan history: "Design
 * thinking: survey branching vs. the k-anonymity engine"). A question with
 * no show_if is always shown.
 */
export function matchesShowIf(condition: ShowIfCondition | null, participant: { team: string | null; location: string | null }): boolean {
  if (!condition) return true;
  const actual = condition.attribute === "team" ? participant.team : participant.location;
  const equal = actual !== null && actual === condition.value;
  return condition.op === "eq" ? equal : !equal;
}

export async function getRespondentSurveySession(params: { db: Queryable; rawToken: string }) {
  const tokenHash = hashServerToken(params.rawToken);
  const identity = new IdentityRepository(params.db);
  const participant = await identity.findIssuedTokenForRespondentSession(tokenHash);
  if (!participant) return null;

  const session = await new ResponseRepository(params.db).getRespondentSurveySession(participant.cycle_id);
  if (!session) return null;

  // Respondents never sign in, so BrandProvider's session-gated fetch
  // can't reach them -- the tenant's brand rides along on the one
  // request the taker page already makes, instead of a second endpoint.
  const brand = (await identity.getBrand(participant.tenant_id)) ?? defaultBrand;

  return { ...session, brand, questions: session.questions.filter((question) => matchesShowIf(question.showIf, participant)) };
}
