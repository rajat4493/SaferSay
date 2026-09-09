import "server-only";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { getRuntimeMode } from "@/lib/runtimeConfig";
import { isDisposableEmailDomain } from "@/lib/disposableEmailDomains";
import { devAuthCookieName, isDevAuthAllowed } from "@/lib/server/devAuth";
import { getDatabasePool } from "@/lib/server/db/pool";
import { checkRateLimit, getClientIp } from "@/lib/server/rateLimit";
import { IdentityRepository } from "@/lib/server/repositories/identityRepository";
import type { UserRecord, UserRole } from "@/lib/server/repositories/types";
import { localTenant, resolveTenantContext } from "@/lib/server/tenant";
import { createClient } from "@/utils/supabase/server";

/**
 * Thrown by resolveUserRecord's brand-new-tenant branch to block a
 * self-serve signup before any tenant/user row is created -- never for an
 * existing user or an invited teammate, since both return earlier. Caught
 * by getSessionContext, which redirects to the login page with a reason
 * the UI can explain (see LoginError.tsx) rather than silently creating
 * (or silently refusing to create) a workspace.
 */
export class SignupBlockedError extends Error {
  constructor(public readonly reason: "disposable_email" | "signup_rate_limited") {
    super(`Signup blocked: ${reason}`);
  }
}

export type SessionContext = {
  userId: string;
  email: string;
  name: string | null;
  role: UserRole;
  tenant: { id: string; name: string; slug: string };
  isSuperAdmin: boolean;
  homeTenantId: string;
  // Only meaningful for role === "people_leader" -- see UserRecord's doc
  // comment. null for every other role, and null (never a stale value)
  // for a people_leader who hasn't been assigned a subtree yet.
  peopleLeaderRootEmployeeId: string | null;
};

export const superAdminTenantCookieName = "safersay_super_admin_tenant";

const localDevContext: SessionContext = {
  userId: "local-dev",
  email: "dev@localhost",
  name: "Local dev",
  role: "customer_admin",
  tenant: localTenant,
  isSuperAdmin: false,
  homeTenantId: localTenant.id,
  peopleLeaderRootEmployeeId: null,
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
    return { userId: authId, email: authEmail, name: null, role: "customer_admin", tenant, isSuperAdmin: false, homeTenantId: tenant.id, peopleLeaderRootEmployeeId: null };
  }

  const repo = new IdentityRepository(db);
  let record: UserRecord;
  try {
    record = await resolveUserRecord(repo, authId, authEmail, authMetadata, authProvider);
  } catch (error) {
    if (error instanceof SignupBlockedError) {
      // No tenant/user row was created -- the Supabase auth session cookie
      // exists, but this app never provisioned an account for it, so
      // every future request re-runs this same check and redirects again
      // until the visitor signs in with a different, allowed email.
      redirect(`/login?error=${error.reason}`);
    }
    throw error;
  }

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
  return {
    userId: record.id,
    email: record.email,
    name: record.name,
    role: record.role,
    tenant,
    isSuperAdmin,
    homeTenantId: homeTenant.id,
    peopleLeaderRootEmployeeId: record.peopleLeaderRootEmployeeId,
  };
}

// Exported for direct testing (authSignupGate.test.ts) -- getSessionContext
// remains the only real caller in application code.
export async function resolveUserRecord(
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

  const pendingTeamInvite = await repo.findPendingInviteByEmail(email);
  if (pendingTeamInvite) {
    const displayName = typeof metadata?.full_name === "string" ? (metadata.full_name as string) : null;
    const user = await repo.createUser({
      tenantId: pendingTeamInvite.tenantId,
      authProvider,
      providerSubject,
      email,
      name: displayName,
      role: pendingTeamInvite.role,
    });
    await repo.markPendingInviteAccepted(pendingTeamInvite.id);
    await repo.emitOnboardingEvent(pendingTeamInvite.tenantId, user.id, "signup");
    return user;
  }

  // The self-serve gate: only reachable here, on the "nobody has ever seen
  // this email" path -- an existing user, an invited teammate, or the
  // non-production dev-login bypass never hits this branch (dev-bypass
  // uses authProvider "dev-bypass", never gated, since it's disabled
  // outright in production -- see devAuth.ts).
  if (authProvider === "supabase") {
    if (isDisposableEmailDomain(email)) {
      throw new SignupBlockedError("disposable_email");
    }
    // Stricter than the general per-IP OAuth-callback rate limit (20 per
    // 10 minutes, guarding against credential-stuffing/brute-force login
    // attempts) -- this one only counts brand-new-workspace creation, so
    // it can afford to be tight without ever affecting a returning user's
    // ordinary sign-in.
    const ip = getClientIp((await headers()));
    const { allowed } = await checkRateLimit(`new-tenant:${ip}`, 3, 86400);
    if (!allowed) {
      throw new SignupBlockedError("signup_rate_limited");
    }
  }

  const displayName = typeof metadata?.full_name === "string" ? (metadata.full_name as string) : null;
  const tenant = await repo.createTenant(`${displayName ?? email}'s workspace`);
  const user = await repo.createUser({
    tenantId: tenant.id,
    authProvider,
    providerSubject,
    email,
    name: displayName,
    role: "customer_admin",
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
