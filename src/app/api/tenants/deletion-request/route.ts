import { NextResponse } from "next/server";
import { getSessionContext } from "@/lib/server/authSession";
import { withTenantScopedDb } from "@/lib/server/db/tenantPool";
import { IdentityRepository } from "@/lib/server/repositories/identityRepository";
import { logDeletionRequested } from "@/lib/server/auditLog";
import { canModifySettings } from "@/lib/permissions";

/**
 * Logs an account-deletion request -- the audit trail an RFP/procurement
 * reviewer expects ("can we see when a customer asked for their data to
 * be deleted"). Deliberately does NOT execute deletion: that stays a
 * manual, super-admin-confirmed action (see the destructive-action
 * safety rules this app follows generally) -- irreversible, cross-schema
 * data removal is not something a single authenticated POST should be
 * able to trigger.
 */
export async function POST() {
  const session = await getSessionContext();
  if (!session) return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  if (!canModifySettings(session.role)) {
    return NextResponse.json({ ok: false, error: "You don't have permission to request account deletion." }, { status: 403 });
  }

  await withTenantScopedDb(session.tenant.id, (db) =>
    new IdentityRepository(db).addSupportNote(session.tenant.id, session.email, "Customer requested account deletion via Settings."),
  );
  await logDeletionRequested(session.tenant.id, session.role, session.email);

  return NextResponse.json({ ok: true });
}
