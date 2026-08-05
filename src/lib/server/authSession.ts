import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getRuntimeMode } from "@/lib/runtimeConfig";
import { devAuthCookieName, isDevAuthAllowed } from "@/lib/server/devAuth";
import { getDatabasePool } from "@/lib/server/db/pool";
import { IdentityRepository } from "@/lib/server/repositories/identityRepository";
import type { UserRecord, UserRole } from "@/lib/server/repositories/types";
import { localTenant, resolveTenantContext } from "@/lib/server/tenant";
import { createClient } from "@/utils/supabase/server";

export type SessionContext = {
  userId: string;
  email: string;
  name: string | null;
  role: UserRole;
  tenant: { id: string; name: string; slug: string };
  isSuperAdmin: boolean;
  homeTenantId: string;
};

export const superAdminTenantCookieName = "safersay_super_admin_tenant";

const localDevContext: SessionContext = {
  userId: "local-dev",
  email: "dev@localhost",
  name: "Local dev",
  role: "owner",
  tenant: localTenant,
  isSuperAdmin: false,
  homeTenantId: localTenant.id,
};

function hasSupabaseConfig() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
}

/**
 * The Super Admin switch is scoped to tenant/ops management only — it never
 * exempts anything from the k>=5 protected-report threshold or any other
 * severance rule. A super admin viewing another tenant sees exactly what
 * that tenant's own owner/admin would see, nothing more, and every switch
 * is logged (see IdentityRepository.logSuperAdminAccess).
 */
export function isSuperAdminEmail(email: string) {
  const allowlist = (process.env.SUPER_ADMIN_EMAILS ?? "")
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
  return allowlist.includes(email.toLowerCase());
}

/**
 * Resolves the current request's authenticated user and their tenant/role,
 * provisioning a new tenant on first sign-in when no invite exists yet.
 * Returns null when unauthenticated. Falls back to a local dev identity
 * only when Supabase isn't configured and the app isn't running in
 * production mode, so local development stays zero-config.
 */
export async function getSessionContext(): Promise<SessionContext | null> {
  const cookieStore = await cookies();
  const devEmail = isDevAuthAllowed() ? cookieStore.get(devAuthCookieName)?.value : undefined;

  if (!hasSupabaseConfig() && !devEmail) {
    return getRuntimeMode() === "production" ? null : localDevContext;
  }

  let authId: string;
  let authEmail: string;
  let authMetadata: Record<string, unknown> | undefined;
  let authProvider: "supabase" | "dev-bypass";

  if (devEmail) {
    authId = devEmail;
    authEmail = devEmail;
    authMetadata = undefined;
    authProvider = "dev-bypass";
  } else {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    const authUser = data.user;
    if (!authUser?.email) return null;
    authId = authUser.id;
    authEmail = authUser.email;
    authMetadata = authUser.user_metadata;
    authProvider = "supabase";
  }

  const db = getDatabasePool();
  if (!db) {
    const { tenant } = await resolveTenantContext();
    return { userId: authId, email: authEmail, name: null, role: "owner", tenant, isSuperAdmin: false, homeTenantId: tenant.id };
  }

  const repo = new IdentityRepository(db);
  const record = await resolveUserRecord(repo, authId, authEmail, authMetadata, authProvider);

  const homeTenant = await repo.findTenantById(record.tenantId);
  if (!homeTenant) return null;

  const isSuperAdmin = isSuperAdminEmail(authEmail);
  let tenant = homeTenant;

  if (isSuperAdmin) {
    const overrideTenantId = cookieStore.get(superAdminTenantCookieName)?.value;
    if (overrideTenantId && overrideTenantId !== homeTenant.id) {
      const overrideTenant = await repo.findTenantById(overrideTenantId);
      if (overrideTenant) tenant = overrideTenant;
    }
  }

  // userId must be identity.users.id (a real row in this DB), not the raw
  // auth-provider subject -- callers insert it into uuid columns
  // (onboarding_events.user_id, super_admin_access_log.super_admin_user_id).
  // For real Supabase logins authId happens to already be a valid UUID, but
  // it doesn't correspond to a users row and the dev-bypass authId is an
  // email, not a UUID at all -- record.id is the only value that's actually
  // correct for both.
  return { userId: record.id, email: record.email, name: record.name, role: record.role, tenant, isSuperAdmin, homeTenantId: homeTenant.id };
}

async function resolveUserRecord(
  repo: IdentityRepository,
  providerSubject: string,
  email: string,
  metadata: Record<string, unknown> | undefined,
  authProvider: "supabase" | "dev-bypass" = "supabase",
): Promise<UserRecord> {
  const existing = await repo.findUserByAuthSubject(authProvider, providerSubject);
  if (existing) return existing;

  const invited = await repo.findUserByEmail(email);
  if (invited) {
    // Only the real Supabase flow is allowed to claim/relink an identity
    // row -- a dev-bypass login must never overwrite a real user's linked
    // Google/Microsoft auth_provider/provider_subject, or their real OAuth
    // sign-in would stop resolving to this account afterward.
    if (authProvider === "supabase") {
      await repo.linkAuthSubject(invited.id, authProvider, providerSubject);
      return { ...invited, authProvider, providerSubject };
    }
    return invited;
  }

  const displayName = typeof metadata?.full_name === "string" ? (metadata.full_name as string) : null;
  const tenant = await repo.createTenant(`${displayName ?? email}'s workspace`);
  const user = await repo.createUser({
    tenantId: tenant.id,
    authProvider,
    providerSubject,
    email,
    name: displayName,
    role: "owner",
  });
  await repo.emitOnboardingEvent(tenant.id, user.id, "signup");
  return user;
}

export async function requireSessionContext(nextPath: string): Promise<SessionContext> {
  const context = await getSessionContext();
  if (context) return context;
  redirect(`/login?next=${encodeURIComponent(nextPath)}`);
}

/**
 * True when the platform owner is currently acting inside a tenant that
 * isn't their own. Single source of truth for this check -- routes that
 * must never expose response content to the Company/Owner layer (see
 * docs/strategy/SAFERSAY_FINAL_ARCHITECTURE.md §2.2) should gate on this,
 * not re-derive it inline, so the rule can't drift out of sync.
 */
export function isPlatformOwnerImpersonating(session: SessionContext): boolean {
  return session.isSuperAdmin && session.tenant.id !== session.homeTenantId;
}
