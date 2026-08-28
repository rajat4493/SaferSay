import { NextResponse, type NextRequest } from "next/server";
import { getSessionContext } from "@/lib/server/authSession";
import { withTenantScopedDb } from "@/lib/server/db/tenantPool";
import { IdentityRepository } from "@/lib/server/repositories/identityRepository";
import { canManageIntegrations } from "@/lib/permissions";
import { isValidSsoDomain } from "@/lib/server/tenantConfigValidation";
import { registerSamlProvider, updateSamlProvider, deregisterSamlProvider } from "@/lib/server/supabaseManagementApi";
import { logSsoConnected, logSsoDisconnected } from "@/lib/server/auditLog";

/**
 * Enterprise SSO (SAML) for staff roles only -- customer_admin,
 * survey_creator, auditor, people_leader, integration_admin,
 * compliance_reviewer. Survey respondents never authenticate through
 * Supabase at all (see src/app/s/[token]/page.tsx's separate, tokenised
 * flow), so nothing here is reachable from -- or relevant to -- the
 * survey-taking surface.
 */

export async function GET() {
  const session = await getSessionContext();
  if (!session) return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  if (!canManageIntegrations(session.role)) return NextResponse.json({ ok: false, error: "You don't have permission to view integrations." }, { status: 403 });

  const config = await withTenantScopedDb(session.tenant.id, (db) => new IdentityRepository(db).getTenantSsoConfig(session.tenant.id));
  return NextResponse.json({ ok: true, sso: config });
}

export async function PUT(request: NextRequest) {
  const session = await getSessionContext();
  if (!session) return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  if (!canManageIntegrations(session.role)) return NextResponse.json({ ok: false, error: "You don't have permission to manage integrations." }, { status: 403 });

  const body = (await request.json().catch(() => ({}))) as { domain?: string; metadataUrl?: string; metadataXml?: string };
  const domain = body.domain?.trim().toLowerCase();
  const metadataUrl = body.metadataUrl?.trim() || null;
  const metadataXml = body.metadataXml?.trim() || null;
  if (!domain || !isValidSsoDomain(domain)) {
    return NextResponse.json({ ok: false, error: "Enter a valid company domain, e.g. acme.com." }, { status: 400 });
  }
  if (!metadataUrl && !metadataXml) {
    return NextResponse.json({ ok: false, error: "Provide your identity provider's metadata URL or metadata XML." }, { status: 400 });
  }

  const config = await withTenantScopedDb(session.tenant.id, (db) => new IdentityRepository(db).getTenantSsoConfig(session.tenant.id));

  let providerId: string;
  try {
    if (config.providerId) {
      await updateSamlProvider(config.providerId, { domain, metadataUrl, metadataXml });
      providerId = config.providerId;
    } else {
      const result = await registerSamlProvider({ domain, metadataUrl, metadataXml });
      providerId = result.providerId;
    }
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Couldn't register SSO with the identity platform." }, { status: 502 });
  }

  const updated = await withTenantScopedDb(session.tenant.id, async (db) => {
    const repo = new IdentityRepository(db);
    await repo.setTenantSsoConfig(session.tenant.id, { domain, metadataUrl, metadataXml, providerId, enabled: true });
    return repo.getTenantSsoConfig(session.tenant.id);
  });
  await logSsoConnected(session.tenant.id, session.role, session.email, domain);

  return NextResponse.json({ ok: true, sso: updated });
}

export async function DELETE() {
  const session = await getSessionContext();
  if (!session) return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  if (!canManageIntegrations(session.role)) return NextResponse.json({ ok: false, error: "You don't have permission to manage integrations." }, { status: 403 });

  const config = await withTenantScopedDb(session.tenant.id, (db) => new IdentityRepository(db).getTenantSsoConfig(session.tenant.id));
  if (config.providerId) {
    try {
      await deregisterSamlProvider(config.providerId);
    } catch {
      // Best-effort: still clear the tenant's local record even if
      // Supabase is unreachable, so the admin isn't stuck. A stale
      // provider registration on Supabase's side is a cleanup item for
      // the platform operator, not something that leaves this tenant's
      // own settings inconsistent.
    }
  }
  await withTenantScopedDb(session.tenant.id, (db) => new IdentityRepository(db).clearTenantSsoConfig(session.tenant.id));
  await logSsoDisconnected(session.tenant.id, session.role, session.email);

  return NextResponse.json({ ok: true });
}
