import { NextResponse, type NextRequest } from "next/server";
import { execFile } from "child_process";
import { promisify } from "util";
import { getSessionContext } from "@/lib/server/authSession";
import { getDatabasePool } from "@/lib/server/db/pool";
import { IdentityRepository } from "@/lib/server/repositories/identityRepository";

const execFileAsync = promisify(execFile);

async function requireOwner() {
  const session = await getSessionContext();
  if (!session) return { error: NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 }) };
  if (!session.isSuperAdmin) return { error: NextResponse.json({ ok: false, error: "Not a super admin." }, { status: 403 }) };
  const db = getDatabasePool();
  if (!db) return { error: NextResponse.json({ ok: false, error: "DATABASE_URL is required." }, { status: 503 }) };
  return { session, repo: new IdentityRepository(db) };
}

/**
 * Points a tenant at a dedicated database -- the "our data isn't
 * co-mingled" compliance option (see 0027_tenant_dedicated_db.sql). This
 * is a manual, super-admin-triggered, enterprise-tier action, not
 * self-serve: the caller supplies a connection string to an already-
 * created, empty Postgres database (provisioning the actual instance is
 * an infra/ops step outside this app). This route runs the full
 * migration set against it, then records the connection string.
 *
 * v1 limitation, deliberately not hidden: this runs synchronously inside
 * the request instead of as a background job, so it can time out on a
 * slow migration run -- acceptable for a rare, manually-triggered,
 * enterprise-only action for now, but flagged here for whoever revisits
 * this before it's offered more broadly.
 */
export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const gate = await requireOwner();
  if ("error" in gate) return gate.error;
  const { id } = await context.params;

  const body = (await request.json().catch(() => ({}))) as { connectionString?: string };
  const connectionString = body.connectionString?.trim();
  if (!connectionString) {
    return NextResponse.json({ ok: false, error: "A connection string to an empty target database is required." }, { status: 400 });
  }

  const existing = await gate.repo.getTenantDetail(id);
  if (!existing) return NextResponse.json({ ok: false, error: "Tenant not found." }, { status: 404 });

  try {
    await execFileAsync("node", ["scripts/run-migrations.mjs", connectionString], { timeout: 120_000 });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: `Migration run failed: ${error instanceof Error ? error.message : "unknown error"}` },
      { status: 502 },
    );
  }

  await gate.repo.setDedicatedDatabaseUrl(id, connectionString);
  await gate.repo.addSupportNote(id, gate.session.email, "Moved to a dedicated database.");

  return NextResponse.json({ ok: true });
}

/** Moves the tenant back onto the shared database. */
export async function DELETE(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const gate = await requireOwner();
  if ("error" in gate) return gate.error;
  const { id } = await context.params;

  await gate.repo.setDedicatedDatabaseUrl(id, null);
  await gate.repo.addSupportNote(id, gate.session.email, "Moved back to the shared database.");

  return NextResponse.json({ ok: true });
}
