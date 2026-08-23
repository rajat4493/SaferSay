import { NextRequest, NextResponse } from "next/server";
import { getDatabasePool } from "@/lib/server/db/pool";
import { getTenantPool, withTenantContext } from "@/lib/server/db/tenantPool";
import { submitWithSeveredRepositories } from "@/lib/server/confidentialSubmissionService";
import { IdentityRepository } from "@/lib/server/repositories/identityRepository";
import { submitServerResponse } from "@/lib/serverStore";
import { hashServerToken } from "@/lib/server/tokenHashing";
import { checkRateLimit, getClientIp } from "@/lib/server/rateLimit";
import type { ResponseAnswerInput } from "@/lib/server/repositories/types";

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as {
    token: string;
    answers: ResponseAnswerInput[];
  };
  if (!body.token || !Array.isArray(body.answers)) {
    return NextResponse.json({ ok: false, error: "Survey token and answers are required." }, { status: 400 });
  }

  // Guards against token-guessing, not against a single legitimate
  // respondent -- a real submission is a one-time action per person, so a
  // generous per-IP ceiling here only ever bites automated attempts.
  const { allowed } = await checkRateLimit(`submit:${getClientIp(request)}`, 30, 60);
  if (!allowed) {
    return NextResponse.json({ ok: false, error: "Too many attempts. Try again in a minute." }, { status: 429 });
  }

  const adminPool = getDatabasePool();
  if (adminPool) {
    try {
      const tenantPool = getTenantPool();
      if (!tenantPool) {
        // No restricted role configured -- fall back to the privileged
        // pool, same as before, still wrapped in a real transaction (the
        // previous pool.query("begin"/"commit") pattern didn't actually
        // hold one connection across both statements).
        const client = await adminPool.connect();
        try {
          await client.query("BEGIN");
          const submission = await submitWithSeveredRepositories({ db: client, rawToken: body.token, answers: body.answers });
          await client.query("COMMIT");
          return NextResponse.json({ ok: true, submissionId: submission.submissionId });
        } catch (error) {
          await client.query("ROLLBACK").catch(() => undefined);
          throw error;
        } finally {
          client.release();
        }
      }

      const tokenHash = hashServerToken(body.token);
      const participant = await new IdentityRepository(adminPool).findIssuedToken(tokenHash);
      if (!participant) throw new Error("This link isn't valid.");

      const submission = await withTenantContext(tenantPool, participant.tenant_id, (client) =>
        submitWithSeveredRepositories({ db: client, rawToken: body.token, answers: body.answers }),
      );
      return NextResponse.json({ ok: true, submissionId: submission.submissionId });
    } catch (error) {
      return NextResponse.json(
        { ok: false, error: error instanceof Error ? error.message : "Response could not be submitted." },
        { status: 400 },
      );
    }
  }

  const submission = await submitServerResponse(
    body.token,
    body.answers
      .filter((answer): answer is { questionId: string; numberValue: number } => typeof answer.numberValue === "number")
      .map((answer) => ({ questionId: answer.questionId, numberValue: answer.numberValue })),
  );
  return NextResponse.json({ ok: true, submissionId: submission.id });
}
