import { randomBytes, randomUUID } from "crypto";
import type { Queryable } from "@/lib/server/db/tenantPool";
import { hashServerToken } from "@/lib/server/tokenHashing";
import { decryptSecret, encryptSecret } from "@/lib/server/secretCrypto";
import {
  AuditLogRecord,
  CycleAction,
  EmployeeImportRecord,
  EmployeeRecord,
  InviteOutboxRow,
  InviteOutboxSummary,
  IssuedParticipantToken,
  OnboardingEventKey,
  PendingInviteRecord,
  PilotIdentitySummary,
  PlatformAttentionItem,
  PlatformOverview,
  PlatformUsageHealth,
  QueuedInviteDelivery,
  TeamMember,
  TeamRole,
  TenantDetail,
  TenantDirectoryEntry,
  TenantPlanTier,
  TenantRecord,
  TenantSelfSettings,
  TenantSupportNote,
  UserRecord,
  UserRole,
} from "./types";

/**
 * Canonicalizes a free-text team value so "Engineering", "engineering ",
 * and "Engineering  " land in the same anonymity group instead of
 * fragmenting it three ways. This is the stored/grouped form; callers
 * needing a display string should title-case it themselves (see
 * titleCaseTeam in src/lib/textFormat.ts) -- grouping must stay on this
 * canonical form everywhere it's compared (import, token issuance,
 * submission segment, department picker).
 */
export function normalizeTeamLabel(value: string | null | undefined): string | null {
  const collapsed = value?.trim().replace(/\s+/g, " ").toLowerCase();
  return collapsed ? collapsed : null;
}

export class IdentityRepository {
  constructor(private readonly db: Queryable) {}

  async findUserByAuthSubject(authProvider: string, providerSubject: string): Promise<UserRecord | null> {
    const result = await this.db.query<UserRow>(
      `select id, tenant_id, auth_provider, provider_subject, email, name, role
       from identity.users
       where auth_provider = $1 and provider_subject = $2`,
      [authProvider, providerSubject],
    );
    return result.rows[0] ? mapUserRow(result.rows[0]) : null;
  }

  async findUserByEmail(email: string): Promise<UserRecord | null> {
    const result = await this.db.query<UserRow>(
      `select id, tenant_id, auth_provider, provider_subject, email, name, role
       from identity.users
       where email = $1`,
      [email],
    );
    return result.rows[0] ? mapUserRow(result.rows[0]) : null;
  }

  async createUser(input: {
    tenantId: string;
    authProvider: string;
    providerSubject: string;
    email: string;
    name: string | null;
    role: UserRole;
  }): Promise<UserRecord> {
    const id = randomUUID();
    const result = await this.db.query<UserRow>(
      `insert into identity.users (id, tenant_id, auth_provider, provider_subject, email, name, role)
       values ($1, $2, $3, $4, $5, $6, $7)
       returning id, tenant_id, auth_provider, provider_subject, email, name, role`,
      [id, input.tenantId, input.authProvider, input.providerSubject, input.email, input.name, input.role],
    );
    return mapUserRow(result.rows[0]);
  }

  async linkAuthSubject(userId: string, authProvider: string, providerSubject: string) {
    await this.db.query(
      `update identity.users set auth_provider = $2, provider_subject = $3 where id = $1`,
      [userId, authProvider, providerSubject],
    );
  }

  /** Self-service display name -- tenant_id scoped so a user can only ever rename their own row. */
  async updateUserName(userId: string, tenantId: string, name: string): Promise<boolean> {
    const result = await this.db.query(`update identity.users set name = $3 where id = $1 and tenant_id = $2`, [userId, tenantId, name]);
    return (result.rowCount ?? 0) > 0;
  }

  async emitOnboardingEvent(tenantId: string, userId: string, eventKey: OnboardingEventKey) {
    await this.db.query(
      `insert into identity.onboarding_events (tenant_id, user_id, event_key)
       values ($1, $2, $3)
       on conflict (tenant_id, event_key) do nothing`,
      [tenantId, userId, eventKey],
    );
  }

  /**
   * A tenant's configured confidentiality threshold. Guarded by a hard
   * floor of 3 -- never overridable below that, since that's the point
   * where "confidential survey" stops meaning anything (see
   * docs/strategy/SAFERSAY_FINAL_ARCHITECTURE.md §3). Clamped to a safe
   * band (3-10) even if a bad value somehow got into the settings row.
   */
  async getMinGroupSize(tenantId: string): Promise<number> {
    const result = await this.db.query<{ default_min_group_size: number }>(
      "select default_min_group_size from identity.tenant_settings where tenant_id = $1",
      [tenantId],
    );
    const configured = result.rows[0]?.default_min_group_size ?? 5;
    return Math.min(10, Math.max(3, configured));
  }

  /** Operator-action audit trail for this tenant only -- never respondent data (see auditLog.ts's hard rule). */
  async getAuditLogs(tenantId: string, limit = 100): Promise<AuditLogRecord[]> {
    const result = await this.db.query<{
      id: string;
      actor_role: string;
      actor_id: string;
      action: string;
      target_type: string | null;
      target_id: string | null;
      safe_counts: Record<string, number> | null;
      details: string | null;
      created_at: string;
    }>(
      `select id, actor_role, actor_id, action, target_type, target_id, safe_counts, details, created_at
       from identity.audit_logs
       where tenant_id = $1
       order by created_at desc
       limit $2`,
      [tenantId, Math.min(500, Math.max(1, limit))],
    );
    return result.rows.map((row) => ({
      id: row.id,
      actorRole: row.actor_role,
      actorId: row.actor_id,
      action: row.action,
      targetType: row.target_type,
      targetId: row.target_id,
      safeCounts: row.safe_counts,
      details: row.details,
      createdAt: row.created_at,
    }));
  }

  /** Whether this tenant has completed the guided first-run sequence. */
  async getFirstRunState(tenantId: string): Promise<boolean> {
    const result = await this.db.query<{ completed: boolean }>(
      `select (first_run_completed_at is not null) as completed
       from identity.tenant_settings where tenant_id = $1`,
      [tenantId],
    );
    return result.rows[0]?.completed ?? false;
  }

  /**
   * Idempotent: coalesce keeps the first completion timestamp on repeat
   * calls rather than bumping it forward every time an invite goes out.
   */
  async markFirstRunCompleted(tenantId: string) {
    await this.db.query(
      `insert into identity.tenant_settings (tenant_id, first_run_completed_at)
       values ($1, now())
       on conflict (tenant_id) do update
       set first_run_completed_at = coalesce(identity.tenant_settings.first_run_completed_at, excluded.first_run_completed_at)`,
      [tenantId],
    );
  }

  async findPendingInviteByEmail(email: string): Promise<PendingInviteRecord | null> {
    const result = await this.db.query<{
      id: string;
      tenant_id: string;
      email: string;
      role: TeamRole;
      invited_by_email: string;
      created_at: string;
    }>(
      `select id, tenant_id, email, role, invited_by_email, created_at
       from identity.pending_invites
       where lower(email) = lower($1) and accepted_at is null
       limit 1`,
      [email],
    );
    const row = result.rows[0];
    if (!row) return null;
    return { id: row.id, tenantId: row.tenant_id, email: row.email, role: row.role, invitedByEmail: row.invited_by_email, createdAt: row.created_at };
  }

  async markPendingInviteAccepted(id: string) {
    await this.db.query(`update identity.pending_invites set accepted_at = now() where id = $1`, [id]);
  }

  async createPendingInvite(tenantId: string, email: string, role: TeamRole, invitedByEmail: string): Promise<PendingInviteRecord> {
    const id = randomUUID();
    const result = await this.db.query<{
      id: string;
      tenant_id: string;
      email: string;
      role: TeamRole;
      invited_by_email: string;
      created_at: string;
    }>(
      `insert into identity.pending_invites (id, tenant_id, email, role, invited_by_email)
       values ($1, $2, $3, $4, $5)
       on conflict (tenant_id, email) do update
       set role = excluded.role, invited_by_email = excluded.invited_by_email, created_at = now()
       returning id, tenant_id, email, role, invited_by_email, created_at`,
      [id, tenantId, email, role, invitedByEmail],
    );
    const row = result.rows[0];
    return { id: row.id, tenantId: row.tenant_id, email: row.email, role: row.role, invitedByEmail: row.invited_by_email, createdAt: row.created_at };
  }

  /** Active teammates (real identity.users rows) plus anyone invited but not yet signed in. */
  async listTeam(tenantId: string): Promise<TeamMember[]> {
    const usersResult = await this.db.query<{ id: string; email: string; name: string | null; role: UserRole; created_at: string }>(
      `select id, email, name, role, created_at from identity.users where tenant_id = $1 order by created_at asc`,
      [tenantId],
    );
    const invitesResult = await this.db.query<{ id: string; email: string; role: TeamRole; created_at: string }>(
      `select id, email, role, created_at from identity.pending_invites where tenant_id = $1 and accepted_at is null order by created_at asc`,
      [tenantId],
    );
    const active: TeamMember[] = usersResult.rows.map((row) => ({
      id: row.id,
      email: row.email,
      name: row.name,
      role: row.role,
      status: "active",
      createdAt: row.created_at,
    }));
    const pending: TeamMember[] = invitesResult.rows.map((row) => ({
      id: row.id,
      email: row.email,
      name: null,
      role: row.role,
      status: "pending",
      createdAt: row.created_at,
    }));
    return [...active, ...pending];
  }

  /**
   * Removing a teammate means either canceling a not-yet-accepted invite
   * or revoking a real account -- `id` could be either, so try the invite
   * first (cheap, and pending invites vastly outnumber the alternative in
   * the common "invited the wrong email" case) and fall back to the user
   * row. Nothing else in the schema has a foreign key to identity.users,
   * so a hard delete here is safe.
   */
  async removeTeamMember(tenantId: string, id: string): Promise<boolean> {
    const inviteResult = await this.db.query(`delete from identity.pending_invites where id = $1 and tenant_id = $2`, [id, tenantId]);
    if ((inviteResult.rowCount ?? 0) > 0) return true;

    const userResult = await this.db.query(`delete from identity.users where id = $1 and tenant_id = $2`, [id, tenantId]);
    return (userResult.rowCount ?? 0) > 0;
  }

  async listTenants(): Promise<TenantRecord[]> {
    const result = await this.db.query<{ id: string; name: string; slug: string }>(
      "select id, name, slug from identity.tenants order by name asc",
    );
    return result.rows;
  }

  /**
   * Paginated + optionally name-filtered -- the unpaginated version loaded
   * every tenant with per-row subqueries and left the console to filter
   * client-side, which doesn't hold up past a couple hundred tenants.
   * `count(*) over()` gets the filtered total in the same round trip
   * instead of a second query.
   */
  async listTenantsWithStats(params: { search?: string; limit?: number; offset?: number } = {}): Promise<{
    tenants: TenantDirectoryEntry[];
    total: number;
  }> {
    const limit = Math.min(Math.max(params.limit ?? 50, 1), 200);
    const offset = Math.max(params.offset ?? 0, 0);
    const search = params.search?.trim();

    const result = await this.db.query<{
      id: string;
      name: string;
      slug: string;
      created_at: string;
      plan_tier: TenantPlanTier;
      employee_count: string;
      latest_cycle_name: string | null;
      latest_cycle_status: string | null;
      last_activity_at: string | null;
      total_count: string;
    }>(
      `select
         t.id,
         t.name,
         t.slug,
         t.created_at::text as created_at,
         coalesce(ts.plan_tier, 'standard') as plan_tier,
         (select count(*) from identity.employees e where e.tenant_id = t.id and e.employment_status = 'active')::text as employee_count,
         (select c.name from responses.survey_cycles c where c.tenant_id = t.id order by c.created_at desc limit 1) as latest_cycle_name,
         (select c.status from responses.survey_cycles c where c.tenant_id = t.id order by c.created_at desc limit 1) as latest_cycle_status,
         greatest(
           t.updated_at,
           coalesce((select max(oe.occurred_at) from identity.onboarding_events oe where oe.tenant_id = t.id), t.updated_at)
         )::text as last_activity_at,
         count(*) over()::text as total_count
       from identity.tenants t
       left join identity.tenant_settings ts on ts.tenant_id = t.id
       ${search ? "where t.name ilike $3" : ""}
       order by last_activity_at desc nulls last
       limit $1 offset $2`,
      search ? [limit, offset, `%${search}%`] : [limit, offset],
    );
    return {
      tenants: result.rows.map((row) => ({
        id: row.id,
        name: row.name,
        slug: row.slug,
        createdAt: row.created_at,
        planTier: row.plan_tier,
        employeeCount: Number(row.employee_count),
        latestCycleName: row.latest_cycle_name,
        latestCycleStatus: row.latest_cycle_status,
        lastActivityAt: row.last_activity_at,
      })),
      total: Number(result.rows[0]?.total_count ?? 0),
    };
  }

  async getTenantDetail(tenantId: string): Promise<TenantDetail | null> {
    const tenantResult = await this.db.query<{
      id: string;
      name: string;
      slug: string;
      created_at: string;
      data_residency_region: string;
      plan_tier: TenantPlanTier;
      features: Record<string, boolean>;
      min_group_size: number;
    }>(
      `select
         t.id, t.name, t.slug, t.created_at::text as created_at,
         coalesce(ts.data_residency_region, 'EU') as data_residency_region,
         coalesce(ts.plan_tier, 'standard') as plan_tier,
         coalesce(ts.features, '{}'::jsonb) as features,
         coalesce(ts.default_min_group_size, 5) as min_group_size
       from identity.tenants t
       left join identity.tenant_settings ts on ts.tenant_id = t.id
       where t.id = $1`,
      [tenantId],
    );
    const tenant = tenantResult.rows[0];
    if (!tenant) return null;

    const contactResult = await this.db.query<{ email: string }>(
      `select email from identity.users where tenant_id = $1 and role = 'customer_admin' order by created_at asc limit 1`,
      [tenantId],
    );

    const employeeCount = await this.countActiveEmployees(tenantId);

    const cycleResult = await this.db.query<{
      id: string;
      name: string;
      status: string;
    }>(
      `select id, name, status from responses.survey_cycles where tenant_id = $1 order by created_at desc limit 1`,
      [tenantId],
    );
    const cycle = cycleResult.rows[0];

    let latestCycle: TenantDetail["latestCycle"] = null;
    if (cycle) {
      const countsResult = await this.db.query<{ participants: string; responded: string }>(
        `select
           count(*)::text as participants,
           count(*) filter (where token_status = 'spent')::text as responded
         from identity.survey_participants
         where tenant_id = $1 and cycle_id = $2`,
        [tenantId, cycle.id],
      );
      const counts = countsResult.rows[0];
      const participantCount = Number(counts?.participants ?? 0);
      const respondedCount = Number(counts?.responded ?? 0);
      latestCycle = {
        id: cycle.id,
        name: cycle.name,
        status: cycle.status,
        participantCount,
        respondedCount,
        completionRate: participantCount > 0 ? respondedCount / participantCount : 0,
      };
    }

    const notesResult = await this.db.query<{ id: string; author_email: string; note: string; created_at: string }>(
      `select id, author_email, note, created_at::text as created_at
       from identity.tenant_support_notes
       where tenant_id = $1
       order by created_at desc
       limit 25`,
      [tenantId],
    );

    const membersResult = await this.db.query<{ email: string; role: UserRole; created_at: string }>(
      `select email, role, created_at::text as created_at
       from identity.users
       where tenant_id = $1
       order by created_at asc`,
      [tenantId],
    );

    return {
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      createdAt: tenant.created_at,
      primaryContactEmail: contactResult.rows[0]?.email ?? null,
      dataResidencyRegion: tenant.data_residency_region,
      planTier: tenant.plan_tier,
      features: tenant.features ?? {},
      minGroupSize: tenant.min_group_size,
      employeeCount,
      latestCycle,
      supportNotes: notesResult.rows.map((row) => ({
        id: row.id,
        authorEmail: row.author_email,
        note: row.note,
        createdAt: row.created_at,
      })),
      members: membersResult.rows.map((row) => ({ email: row.email, role: row.role, joinedAt: row.created_at })),
    };
  }

  async updateTenantPlan(tenantId: string, planTier: TenantPlanTier, features: Record<string, boolean>) {
    await this.db.query(
      `insert into identity.tenant_settings (tenant_id, plan_tier, features)
       values ($1, $2, $3::jsonb)
       on conflict (tenant_id) do update set plan_tier = excluded.plan_tier, features = excluded.features, updated_at = now()`,
      [tenantId, planTier, JSON.stringify(features)],
    );
  }

  async setMinGroupSize(tenantId: string, value: number) {
    const clamped = Math.min(10, Math.max(3, Math.round(value)));
    await this.db.query(
      `insert into identity.tenant_settings (tenant_id, default_min_group_size)
       values ($1, $2)
       on conflict (tenant_id) do update set default_min_group_size = excluded.default_min_group_size, updated_at = now()`,
      [tenantId, clamped],
    );
    return clamped;
  }

  /**
   * Lean, dedicated lookup for the respondent-facing (unauthenticated,
   * token-only) SOS availability check -- deliberately not routed through
   * getTenantSelfSettings, which is the admin-session settings page's
   * broader read. Null means the SOS button must not render at all; there
   * is no fallback contact.
   */
  async getSafetyContactEmail(tenantId: string): Promise<string | null> {
    const result = await this.db.query<{ safety_contact_email: string | null }>(
      `select safety_contact_email from identity.tenant_settings where tenant_id = $1`,
      [tenantId],
    );
    return result.rows[0]?.safety_contact_email ?? null;
  }

  async setSafetyContactEmail(tenantId: string, email: string | null) {
    await this.db.query(
      `insert into identity.tenant_settings (tenant_id, safety_contact_email)
       values ($1, $2)
       on conflict (tenant_id) do update set safety_contact_email = excluded.safety_contact_email, updated_at = now()`,
      [tenantId, email],
    );
  }

  /**
   * Tenant-configured outbound SMTP, or null if the tenant hasn't set one
   * (meaning: use the global Resend config, exactly today's behavior --
   * see resendDelivery.ts). smtp_password is decrypted here so the caller
   * gets a ready-to-use config; it is never returned by any API route,
   * only used server-side to actually send mail.
   */
  async getSmtpConfig(tenantId: string): Promise<{
    host: string;
    port: number;
    username: string;
    password: string;
    fromEmail: string;
  } | null> {
    const result = await this.db.query<{
      smtp_host: string | null;
      smtp_port: number | null;
      smtp_username: string | null;
      smtp_password_encrypted: string | null;
      smtp_from_email: string | null;
    }>(
      `select smtp_host, smtp_port, smtp_username, smtp_password_encrypted, smtp_from_email
       from identity.tenant_settings where tenant_id = $1`,
      [tenantId],
    );
    const row = result.rows[0];
    if (!row?.smtp_host || !row.smtp_port || !row.smtp_username || !row.smtp_password_encrypted || !row.smtp_from_email) return null;
    return {
      host: row.smtp_host,
      port: row.smtp_port,
      username: row.smtp_username,
      password: decryptSecret(row.smtp_password_encrypted),
      fromEmail: row.smtp_from_email,
    };
  }

  /** Pass null to clear the tenant's SMTP config and fall back to the global Resend sender. */
  async setSmtpConfig(
    tenantId: string,
    config: { host: string; port: number; username: string; password: string; fromEmail: string } | null,
  ) {
    await this.db.query(
      `insert into identity.tenant_settings (tenant_id, smtp_host, smtp_port, smtp_username, smtp_password_encrypted, smtp_from_email)
       values ($1, $2, $3, $4, $5, $6)
       on conflict (tenant_id) do update set
         smtp_host = excluded.smtp_host,
         smtp_port = excluded.smtp_port,
         smtp_username = excluded.smtp_username,
         smtp_password_encrypted = excluded.smtp_password_encrypted,
         smtp_from_email = excluded.smtp_from_email,
         updated_at = now()`,
      [
        tenantId,
        config?.host ?? null,
        config?.port ?? null,
        config?.username ?? null,
        config ? encryptSecret(config.password) : null,
        config?.fromEmail ?? null,
      ],
    );
  }

  /**
   * The one deliberate, auditable, grep-able place identity is read for a
   * survey token outside the normal severed flow -- do NOT widen
   * findIssuedToken/findIssuedTokenForRespondentSession for this; those
   * must stay identity-blind for the anonymous-submission path. Used only
   * by the SOS route, only after consent has been explicitly given.
   */
  async findParticipantIdentityForSos(tokenHash: string) {
    const result = await this.db.query<{
      tenant_id: string;
      cycle_id: string;
      employee_id: string;
      employee_email: string;
      employee_name: string | null;
    }>(
      `select p.tenant_id, p.cycle_id, p.employee_id, e.email as employee_email, e.name as employee_name
       from identity.survey_participants p
       join identity.employees e on e.id = p.employee_id
       where p.token_hash = $1`,
      [tokenHash],
    );
    return result.rows[0] ?? null;
  }

  async createSosReport(params: {
    tenantId: string;
    cycleId: string | null;
    employeeId: string;
    message: string;
    routedToEmail: string;
  }) {
    const id = randomUUID();
    await this.db.query(
      `insert into identity.sos_reports (id, tenant_id, cycle_id, employee_id, message, consent_ack, routed_to_email)
       values ($1, $2, $3, $4, $5, true, $6)`,
      [id, params.tenantId, params.cycleId, params.employeeId, params.message, params.routedToEmail],
    );
    return { id };
  }

  async markSosReportEmailStatus(id: string, status: "sent" | "failed") {
    await this.db.query(`update identity.sos_reports set email_status = $2 where id = $1`, [id, status]);
  }

  async addSupportNote(tenantId: string, authorEmail: string, note: string) {
    await this.db.query(
      `insert into identity.tenant_support_notes (id, tenant_id, author_email, note)
       values ($1, $2, $3, $4)`,
      [randomUUID(), tenantId, authorEmail, note],
    );
  }

  async getPlatformOverview(): Promise<PlatformOverview> {
    const summaryResult = await this.db.query<{
      active_tenants: string;
      live_surveys: string;
      total_employees: string;
      inactive_tenants: string;
    }>(
      `select
         (select count(*) from identity.tenants)::text as active_tenants,
         (select count(*) from responses.survey_cycles where status = 'open')::text as live_surveys,
         (select count(*) from identity.employees where employment_status = 'active')::text as total_employees,
         (select count(*) from identity.tenants t
            where greatest(t.updated_at, coalesce((select max(oe.occurred_at) from identity.onboarding_events oe where oe.tenant_id = t.id), t.updated_at))
              < now() - interval '30 days')::text as inactive_tenants`,
    );
    const summary = summaryResult.rows[0];

    const growthResult = await this.db.query<{ week_start: string; cumulative_tenants: string }>(
      `with weeks as (
         select date_trunc('week', gs)::date as week_start
         from generate_series(now() - interval '7 weeks', now(), interval '1 week') gs
       )
       select
         w.week_start::text as week_start,
         (select count(*) from identity.tenants t where t.created_at < w.week_start + interval '1 week')::text as cumulative_tenants
       from weeks w
       order by w.week_start asc`,
    );

    const attention: PlatformAttentionItem[] = [];
    const noEmployees = await this.db.query<{ id: string; name: string }>(
      `select t.id, t.name from identity.tenants t
       where not exists (select 1 from identity.employees e where e.tenant_id = t.id and e.employment_status = 'active')`,
    );
    for (const row of noEmployees.rows) {
      attention.push({ tenantId: row.id, tenantName: row.name, kind: "no_employees", detail: "No employees uploaded yet." });
    }

    const stalledDrafts = await this.db.query<{ id: string; name: string; cycle_name: string }>(
      `select t.id, t.name, c.name as cycle_name
       from responses.survey_cycles c
       join identity.tenants t on t.id = c.tenant_id
       where c.status = 'draft' and c.created_at < now() - interval '7 days'`,
    );
    for (const row of stalledDrafts.rows) {
      attention.push({ tenantId: row.id, tenantName: row.name, kind: "stalled_draft", detail: `"${row.cycle_name}" has been a draft for over a week.` });
    }

    const deliveryFailures = await this.db.query<{ id: string; name: string; failed_count: string }>(
      `select t.id, t.name, count(*)::text as failed_count
       from identity.invite_outbox o
       join identity.tenants t on t.id = o.tenant_id
       where o.delivery_status = 'failed'
       group by t.id, t.name`,
    );
    for (const row of deliveryFailures.rows) {
      attention.push({
        tenantId: row.id,
        tenantName: row.name,
        kind: "delivery_failures",
        detail: `${row.failed_count} invite${row.failed_count === "1" ? "" : "s"} failed to deliver.`,
      });
    }

    const activityResult = await this.db.query<{
      tenant_id: string;
      tenant_name: string;
      event_key: OnboardingEventKey;
      occurred_at: string;
    }>(
      `select oe.tenant_id, t.name as tenant_name, oe.event_key, oe.occurred_at::text as occurred_at
       from identity.onboarding_events oe
       join identity.tenants t on t.id = oe.tenant_id
       order by oe.occurred_at desc
       limit 20`,
    );

    return {
      activeTenantCount: Number(summary?.active_tenants ?? 0),
      liveSurveyCount: Number(summary?.live_surveys ?? 0),
      totalEmployeeCount: Number(summary?.total_employees ?? 0),
      inactiveTenantCount: Number(summary?.inactive_tenants ?? 0),
      tenantGrowth: growthResult.rows.map((row) => ({
        weekStart: row.week_start,
        cumulativeTenants: Number(row.cumulative_tenants),
      })),
      attention,
      recentActivity: activityResult.rows.map((row) => ({
        tenantId: row.tenant_id,
        tenantName: row.tenant_name,
        eventKey: row.event_key,
        occurredAt: row.occurred_at,
      })),
    };
  }

  async getPlatformUsageHealth(): Promise<PlatformUsageHealth> {
    const result = await this.db.query<{
      total_surveys: string;
      total_responses: string;
      invites_sent: string;
      invites_pending: string;
      invites_failed: string;
    }>(
      `select
         (select count(*) from responses.survey_cycles)::text as total_surveys,
         (select count(*) from identity.survey_participants where token_status = 'spent')::text as total_responses,
         (select count(*) from identity.invite_outbox where delivery_status = 'sent')::text as invites_sent,
         (select count(*) from identity.invite_outbox where delivery_status in ('pending', 'queued'))::text as invites_pending,
         (select count(*) from identity.invite_outbox where delivery_status = 'failed')::text as invites_failed`,
    );
    const row = result.rows[0];
    return {
      totalSurveysCreated: Number(row?.total_surveys ?? 0),
      totalResponsesSubmitted: Number(row?.total_responses ?? 0),
      invitesSent: Number(row?.invites_sent ?? 0),
      invitesPending: Number(row?.invites_pending ?? 0),
      invitesFailed: Number(row?.invites_failed ?? 0),
      databaseHealthy: true,
    };
  }

  async getTenantSelfSettings(tenantId: string): Promise<TenantSelfSettings> {
    const result = await this.db.query<{
      default_min_group_size: number;
      data_residency_region: string;
      plan_tier: TenantPlanTier;
      features: Record<string, boolean>;
      safety_contact_email: string | null;
      smtp_host: string | null;
      smtp_from_email: string | null;
    }>(
      `select
         coalesce(default_min_group_size, 5) as default_min_group_size,
         coalesce(data_residency_region, 'EU') as data_residency_region,
         coalesce(plan_tier, 'standard') as plan_tier,
         coalesce(features, '{}'::jsonb) as features,
         safety_contact_email,
         smtp_host,
         smtp_from_email
       from identity.tenant_settings where tenant_id = $1`,
      [tenantId],
    );
    const row = result.rows[0];
    return {
      minGroupSize: row?.default_min_group_size ?? 5,
      dataResidencyRegion: row?.data_residency_region ?? "EU",
      planTier: row?.plan_tier ?? "standard",
      features: row?.features ?? {},
      safetyContactEmail: row?.safety_contact_email ?? null,
      // Never the password -- just enough for the settings UI to show
      // "configured" vs "not configured" without ever round-tripping the secret.
      smtpConfigured: Boolean(row?.smtp_host),
      smtpFromEmail: row?.smtp_from_email ?? null,
    };
  }

  async addCycleAction(tenantId: string, cycleId: string, authorEmail: string, actionText: string) {
    await this.db.query(
      `insert into identity.cycle_actions (id, tenant_id, cycle_id, author_email, action_text)
       values ($1, $2, $3, $4, $5)`,
      [randomUUID(), tenantId, cycleId, authorEmail, actionText],
    );
  }

  async listCycleActions(tenantId: string, cycleId: string): Promise<CycleAction[]> {
    const result = await this.db.query<{ id: string; author_email: string; action_text: string; created_at: string }>(
      `select id, author_email, action_text, created_at::text as created_at
       from identity.cycle_actions
       where tenant_id = $1 and cycle_id = $2
       order by created_at desc
       limit 10`,
      [tenantId, cycleId],
    );
    return result.rows.map((row) => ({
      id: row.id,
      authorEmail: row.author_email,
      actionText: row.action_text,
      createdAt: row.created_at,
    }));
  }

  async listAllSupportNotes(limit = 30): Promise<Array<TenantSupportNote & { tenantId: string; tenantName: string }>> {
    const result = await this.db.query<{
      id: string;
      tenant_id: string;
      tenant_name: string;
      author_email: string;
      note: string;
      created_at: string;
    }>(
      `select n.id, n.tenant_id, t.name as tenant_name, n.author_email, n.note, n.created_at::text as created_at
       from identity.tenant_support_notes n
       join identity.tenants t on t.id = n.tenant_id
       order by n.created_at desc
       limit $1`,
      [limit],
    );
    return result.rows.map((row) => ({
      id: row.id,
      tenantId: row.tenant_id,
      tenantName: row.tenant_name,
      authorEmail: row.author_email,
      note: row.note,
      createdAt: row.created_at,
    }));
  }

  async logSuperAdminAccess(superAdminUserId: string, superAdminEmail: string, tenantId: string) {
    await this.db.query(
      `insert into identity.super_admin_access_log (id, super_admin_user_id, super_admin_email, tenant_id)
       values ($1, $2, $3, $4)`,
      [randomUUID(), superAdminUserId, superAdminEmail, tenantId],
    );
  }

  /**
   * Points a tenant at their own dedicated database (or, passing null,
   * moves them back onto the shared one). The caller is responsible for
   * having already run scripts/run-migrations.mjs against `connectionString`
   * -- this method only records where to find it, on the privileged
   * control-plane pool (identity.tenants must stay reachable regardless
   * of which database a given tenant's own data lives in). See
   * 0027_tenant_dedicated_db.sql and getPoolForTenant (tenantPool.ts).
   */
  async setDedicatedDatabaseUrl(tenantId: string, connectionString: string | null) {
    await this.db.query(`update identity.tenants set database_url_encrypted = $2 where id = $1`, [
      tenantId,
      connectionString ? encryptSecret(connectionString) : null,
    ]);
  }

  async createTenant(name: string, slug = toTenantSlug(name)): Promise<TenantRecord> {
    const id = randomUUID();
    const result = await this.db.query<{ id: string; name: string; slug: string }>(
      `insert into identity.tenants (id, name, slug)
       values ($1, $2, $3)
       on conflict (slug) do update set updated_at = now()
       returning id, name, slug`,
      [id, name, slug],
    );
    const tenant = result.rows[0];
    await this.db.query(
      `insert into identity.tenant_settings (tenant_id)
       values ($1)
       on conflict (tenant_id) do nothing`,
      [tenant.id],
    );
    return tenant;
  }

  async findTenantById(id: string): Promise<TenantRecord | null> {
    const result = await this.db.query<{ id: string; name: string; slug: string }>(
      "select id, name, slug from identity.tenants where id = $1",
      [id],
    );
    return result.rows[0] ?? null;
  }

  async findTenantBySlug(slug: string): Promise<TenantRecord | null> {
    const result = await this.db.query<{ id: string; name: string; slug: string }>(
      "select id, name, slug from identity.tenants where slug = $1",
      [slug],
    );
    return result.rows[0] ?? null;
  }

  async getOrCreateTenant(name: string, slug = toTenantSlug(name)): Promise<TenantRecord> {
    const existing = await this.findTenantBySlug(slug);
    if (existing) return existing;
    return this.createTenant(name, slug);
  }

  async importEmployees(tenantId: string, employees: EmployeeImportRecord[]) {
    const imported = [];
    for (const employee of employees) {
      const id = randomUUID();
      await this.db.query(
        `insert into identity.employees (id, tenant_id, email, name, team, location, manager_email)
         values ($1, $2, $3, $4, $5, $6, $7)
         on conflict (tenant_id, email)
         do update set name = excluded.name, team = excluded.team, location = excluded.location, manager_email = excluded.manager_email
         returning id, email, name, team, location, manager_email`,
        [id, tenantId, employee.email, employee.name ?? null, normalizeTeamLabel(employee.team), employee.location ?? null, employee.managerEmail ?? null],
      );
      imported.push(employee);
    }
    return imported.length;
  }

  /**
   * All employee emails for a tenant, unpaginated -- used only to validate
   * that a CSV import's manager_email column references a real employee
   * (see /api/employees/import) before treating it as verified enough to
   * report on. Not for display: EmployeeRecord's fuller shape and
   * pagination live in listEmployees below.
   */
  async listAllEmployeeEmails(tenantId: string): Promise<Set<string>> {
    const result = await this.db.query<{ email: string }>(`select email from identity.employees where tenant_id = $1`, [tenantId]);
    return new Set(result.rows.map((row) => row.email));
  }

  async listEmployees(
    tenantId: string,
    options: { search?: string; limit?: number; offset?: number } = {},
  ): Promise<{ employees: EmployeeRecord[]; total: number }> {
    const limit = options.limit ?? 25;
    const offset = options.offset ?? 0;
    const search = options.search?.trim();

    const whereSearch = search ? `and (e.email ilike $2 or e.name ilike $2 or e.team ilike $2)` : "";
    const params: unknown[] = search ? [tenantId, `%${search}%`] : [tenantId];

    const countResult = await this.db.query<{ count: string }>(
      `select count(*)::text as count from identity.employees e where e.tenant_id = $1 ${whereSearch}`,
      params,
    );

    const rowsResult = await this.db.query<{
      id: string;
      email: string;
      name: string | null;
      team: string | null;
      location: string | null;
      employment_status: string;
    }>(
      `select e.id, e.email, e.name, e.team, e.location, e.employment_status
       from identity.employees e
       where e.tenant_id = $1 ${whereSearch}
       order by e.name nulls last, e.email
       limit ${search ? "$3" : "$2"} offset ${search ? "$4" : "$3"}`,
      [...params, limit, offset],
    );

    return {
      employees: rowsResult.rows.map((row) => ({
        id: row.id,
        email: row.email,
        name: row.name,
        team: row.team,
        location: row.location,
        employmentStatus: row.employment_status,
      })),
      total: Number(countResult.rows[0]?.count ?? 0),
    };
  }

  /**
   * Distinct normalized team labels for a tenant, with active-employee
   * counts. This is the authoring-side counterpart to
   * ResponseRepository.listDepartmentsForCycle -- that lists departments
   * observed in submitted responses for a cycle; this lists teams as
   * currently assigned on identity.employees, for admin management.
   */
  async listTeams(tenantId: string): Promise<Array<{ team: string; memberCount: number }>> {
    const result = await this.db.query<{ team: string; member_count: string }>(
      `select team, count(*)::text as member_count
       from identity.employees
       where tenant_id = $1 and team is not null and employment_status = 'active'
       group by team
       order by team`,
      [tenantId],
    );
    return result.rows.map((row) => ({ team: row.team, memberCount: Number(row.member_count) }));
  }

  async renameTeam(tenantId: string, fromTeam: string, toTeam: string): Promise<number> {
    const normalizedFrom = normalizeTeamLabel(fromTeam);
    const normalizedTo = normalizeTeamLabel(toTeam);
    if (!normalizedFrom || !normalizedTo) throw new Error("Team names cannot be empty.");
    const result = await this.db.query(
      `update identity.employees set team = $3 where tenant_id = $1 and team = $2`,
      [tenantId, normalizedFrom, normalizedTo],
    );
    return result.rowCount ?? 0;
  }

  /** Merges several team labels into one target label -- same underlying update as renameTeam, applied to each source. */
  async mergeTeams(tenantId: string, fromTeams: string[], intoTeam: string): Promise<number> {
    const normalizedInto = normalizeTeamLabel(intoTeam);
    if (!normalizedInto) throw new Error("Target team name cannot be empty.");
    let total = 0;
    for (const fromTeam of fromTeams) {
      const normalizedFrom = normalizeTeamLabel(fromTeam);
      if (!normalizedFrom || normalizedFrom === normalizedInto) continue;
      total += await this.renameTeam(tenantId, normalizedFrom, normalizedInto);
    }
    return total;
  }

  /**
   * Creates a tenant API key and returns the raw value exactly once -- only
   * key_hash is ever persisted (same convention as respondent tokens, see
   * hashServerToken). Callers must show `rawKey` to the admin immediately
   * and never log or re-derive it afterward.
   */
  async createApiKey(tenantId: string, label: string | null): Promise<{ id: string; rawKey: string }> {
    const id = randomUUID();
    const rawKey = `ssk_${randomBytes(24).toString("base64url")}`;
    await this.db.query(
      `insert into identity.tenant_api_keys (id, tenant_id, key_hash, label) values ($1, $2, $3, $4)`,
      [id, tenantId, hashServerToken(rawKey), label],
    );
    return { id, rawKey };
  }

  async listApiKeys(tenantId: string): Promise<Array<{ id: string; label: string | null; createdAt: string; revokedAt: string | null }>> {
    const result = await this.db.query<{ id: string; label: string | null; created_at: string; revoked_at: string | null }>(
      `select id, label, created_at, revoked_at from identity.tenant_api_keys where tenant_id = $1 order by created_at desc`,
      [tenantId],
    );
    return result.rows.map((row) => ({ id: row.id, label: row.label, createdAt: row.created_at, revokedAt: row.revoked_at }));
  }

  async revokeApiKey(tenantId: string, keyId: string): Promise<void> {
    const result = await this.db.query(
      `update identity.tenant_api_keys set revoked_at = now() where tenant_id = $1 and id = $2 and revoked_at is null`,
      [tenantId, keyId],
    );
    if (result.rowCount !== 1) throw new Error("API key not found.");
  }

  /**
   * Resolves a raw API key to its tenant, on the privileged pool -- this is
   * what *establishes* the tenant context for an external integration
   * request, so it necessarily runs before app.current_tenant_id is set,
   * same reasoning as findIssuedToken for respondent tokens.
   */
  async findTenantForApiKey(rawKey: string): Promise<{ tenantId: string } | null> {
    const result = await this.db.query<{ tenant_id: string }>(
      `select tenant_id from identity.tenant_api_keys where key_hash = $1 and revoked_at is null`,
      [hashServerToken(rawKey)],
    );
    return result.rows[0] ? { tenantId: result.rows[0].tenant_id } : null;
  }

  async setEmployeeStatus(tenantId: string, employeeId: string, status: "active" | "inactive") {
    const result = await this.db.query(
      `update identity.employees set employment_status = $3 where tenant_id = $1 and id = $2`,
      [tenantId, employeeId, status],
    );
    if (result.rowCount !== 1) throw new Error("Employee not found.");
  }

  async countActiveEmployees(tenantId: string) {
    const result = await this.db.query<{ count: string }>(
      "select count(*)::text from identity.employees where tenant_id = $1 and employment_status = 'active'",
      [tenantId],
    );
    return Number(result.rows[0]?.count ?? 0);
  }

  async issueTokens(tenantId: string, cycleId: string): Promise<IssuedParticipantToken[]> {
    const employees = await this.db.query<{
      id: string;
      email: string;
      name: string | null;
      team: string | null;
      location: string | null;
    }>("select id, email, name, team, location from identity.employees where tenant_id = $1 and employment_status = 'active'", [
      tenantId,
    ]);

    const issued: IssuedParticipantToken[] = [];
    for (const employee of employees.rows) {
      const rawToken = randomBytes(32).toString("base64url");
      // team/location are snapshotted here so a later employee-record
      // change (a re-import, a team/office rename) can't retroactively
      // reshuffle this cycle's anonymity groups -- or which branch-gated
      // questions someone sees -- after invites already went out.
      const result = await this.db.query<{ id: string }>(
        `insert into identity.survey_participants
          (id, tenant_id, cycle_id, employee_id, token_hash, token_status, issued_at, team, location)
         values ($1, $2, $3, $4, $5, 'issued', now(), $6, $7)
         on conflict (cycle_id, employee_id) do nothing
         returning id`,
        [randomUUID(), tenantId, cycleId, employee.id, hashServerToken(rawToken), employee.team, employee.location],
      );
      if (result.rowCount === 1) {
        issued.push({ employeeId: employee.id, email: employee.email, name: employee.name ?? undefined, rawToken });
      }
    }
    return issued;
  }

  async createInviteOutboxForIssuedTokens(tenantId: string, cycleId: string, issuedTokens: IssuedParticipantToken[]) {
    let created = 0;
    for (const token of issuedTokens) {
      const participant = await this.db.query<{ id: string }>(
        `select p.id
         from identity.survey_participants p
         where p.tenant_id = $1
           and p.cycle_id = $2
           and p.employee_id = $3
           and p.token_status = 'issued'`,
        [tenantId, cycleId, token.employeeId],
      );
      const participantId = participant.rows[0]?.id;
      if (!participantId) continue;
      const result = await this.db.query(
        `insert into identity.invite_outbox (id, tenant_id, cycle_id, participant_id, delivery_type, respondent_path)
         values ($1, $2, $3, $4, 'invite', $5)
         on conflict (participant_id, delivery_type)
         do update set respondent_path = excluded.respondent_path, updated_at = now()`,
        [randomUUID(), tenantId, cycleId, participantId, `/s/${token.rawToken}`],
      );
      created += result.rowCount ?? 0;
    }
    return created;
  }

  async findIssuedToken(tokenHash: string) {
    const result = await this.db.query<{
      tenant_id: string;
      cycle_id: string;
      token_status: "issued" | "spent" | "revoked";
      team: string | null;
    }>(
      `select tenant_id, cycle_id, token_status, team
       from identity.survey_participants
       where token_hash = $1`,
      [tokenHash],
    );
    return result.rows[0] ?? null;
  }

  async findIssuedTokenForRespondentSession(tokenHash: string) {
    const result = await this.db.query<{
      tenant_id: string;
      cycle_id: string;
      token_status: "issued" | "spent" | "revoked";
      team: string | null;
      location: string | null;
    }>(
      `select tenant_id, cycle_id, token_status, team, location
       from identity.survey_participants
       where token_hash = $1`,
      [tokenHash],
    );
    const participant = result.rows[0];
    if (!participant || participant.token_status !== "issued") return null;
    return participant;
  }

  async markTokenSpent(tokenHash: string) {
    const result = await this.db.query(
      `update identity.survey_participants
       set token_status = 'spent', spent_at = now()
       where token_hash = $1 and token_status = 'issued'`,
      [tokenHash],
    );
    if (result.rowCount !== 1) throw new Error("You've already completed this survey.");
  }

  async getReminderTargets(cycleId: string) {
    const result = await this.db.query<{
      email: string;
      name: string | null;
      token_hash: string;
    }>(
      `select e.email, e.name, p.token_hash
       from identity.survey_participants p
       join identity.employees e on e.id = p.employee_id
       where p.cycle_id = $1 and p.token_status = 'issued'`,
      [cycleId],
    );
    return result.rows;
  }

  /**
   * Total tokens issued for a cycle vs. how many have been spent (=
   * responded) -- sourced from identity.survey_participants only, never
   * responses.*. Drives the Send tab's single smart-action button: once
   * issued === spent, everyone eligible has responded.
   */
  async getParticipationSummary(tenantId: string, cycleId: string): Promise<{ issued: number; spent: number }> {
    const result = await this.db.query<{ issued: string; spent: string }>(
      `select count(*)::text as issued,
              count(*) filter (where token_status = 'spent')::text as spent
       from identity.survey_participants
       where tenant_id = $1 and cycle_id = $2`,
      [tenantId, cycleId],
    );
    const row = result.rows[0];
    return { issued: Number(row?.issued ?? 0), spent: Number(row?.spent ?? 0) };
  }

  async getLatestCycleIdForTenant(tenantId: string) {
    const result = await this.db.query<{ id: string }>(
      `select cycle_id as id
       from identity.survey_participants
       where tenant_id = $1
       order by issued_at desc
       limit 1`,
      [tenantId],
    );
    return result.rows[0]?.id ?? null;
  }

  /**
   * A `failed` outbox row (e.g. RESEND_API_KEY was missing/misconfigured
   * at send time) is otherwise permanently stuck: prepareInviteOutbox's
   * `on conflict (participant_id, delivery_type) do nothing` never touches
   * an existing row, and nothing else in the app resets one. Called at the
   * top of both prepare methods below so every "prepare" (real Send button
   * or the dev/test panel) also gives previously-failed, still-eligible
   * participants a fresh shot at delivery -- without this, once a send
   * fails for any reason, that participant can never be retried again.
   */
  private async resetFailedOutbox(tenantId: string, cycleId: string, deliveryType: "invite" | "reminder") {
    const result = await this.db.query(
      `update identity.invite_outbox o
       set delivery_status = 'pending', updated_at = now()
       from identity.survey_participants p
       where o.participant_id = p.id
         and o.tenant_id = $1
         and o.cycle_id = $2
         and o.delivery_type = $3
         and o.delivery_status = 'failed'
         and p.token_status = 'issued'
         and ($3 <> 'reminder' or p.reminder_count < 3)
         and ($3 <> 'reminder' or exists (
           select 1 from identity.invite_outbox sent
           where sent.participant_id = p.id and sent.delivery_type = 'invite' and sent.delivery_status = 'sent'
         ))`,
      [tenantId, cycleId, deliveryType],
    );
    return result.rowCount ?? 0;
  }

  async prepareInviteOutbox(tenantId: string, cycleId: string) {
    const retried = await this.resetFailedOutbox(tenantId, cycleId, "invite");
    const result = await this.db.query(
      `insert into identity.invite_outbox (id, tenant_id, cycle_id, participant_id, delivery_type)
       select (
         substr(md5(p.id::text || ':invite'), 1, 8) || '-' ||
         substr(md5(p.id::text || ':invite'), 9, 4) || '-4' ||
         substr(md5(p.id::text || ':invite'), 14, 3) || '-8' ||
         substr(md5(p.id::text || ':invite'), 18, 3) || '-' ||
         substr(md5(p.id::text || ':invite'), 21, 12)
       )::uuid, p.tenant_id, p.cycle_id, p.id, 'invite'
       from identity.survey_participants p
       where p.tenant_id = $1
         and p.cycle_id = $2
         and p.token_status = 'issued'
       on conflict (participant_id, delivery_type) do nothing`,
      [tenantId, cycleId],
    );
    return (result.rowCount ?? 0) + retried;
  }

  async prepareReminderOutbox(tenantId: string, cycleId: string) {
    const retried = await this.resetFailedOutbox(tenantId, cycleId, "reminder");
    const result = await this.db.query(
      `insert into identity.invite_outbox (id, tenant_id, cycle_id, participant_id, delivery_type)
       select (
         substr(md5(p.id::text || ':reminder'), 1, 8) || '-' ||
         substr(md5(p.id::text || ':reminder'), 9, 4) || '-4' ||
         substr(md5(p.id::text || ':reminder'), 14, 3) || '-8' ||
         substr(md5(p.id::text || ':reminder'), 18, 3) || '-' ||
         substr(md5(p.id::text || ':reminder'), 21, 12)
       )::uuid, p.tenant_id, p.cycle_id, p.id, 'reminder'
       from identity.survey_participants p
       where p.tenant_id = $1
         and p.cycle_id = $2
         and p.token_status = 'issued'
         and p.reminder_count < 3
         -- A "reminder" email is only truthful for someone who actually got
         -- the original invite. Without this, a participant whose invite
         -- send failed (bad address, quota, whatever) would get an email
         -- titled "SaferSay survey reminder" as their first-ever contact --
         -- see resendDelivery.ts's buildInviteMessage, which doesn't know
         -- the difference between "reminding" and "never sent".
         and exists (
           select 1 from identity.invite_outbox sent
           where sent.participant_id = p.id and sent.delivery_type = 'invite' and sent.delivery_status = 'sent'
         )
       on conflict (participant_id, delivery_type) do nothing`,
      [tenantId, cycleId],
    );
    return (result.rowCount ?? 0) + retried;
  }

  async getInviteOutbox(tenantId: string, cycleId: string): Promise<{ summary: InviteOutboxSummary; rows: InviteOutboxRow[] }> {
    const rowsResult = await this.db.query<{
      id: string;
      cycle_id: string;
      delivery_type: "invite" | "reminder";
      delivery_status: "pending" | "queued" | "sent" | "failed";
      email: string;
      name: string | null;
      reminder_count: number;
      token_status: "issued" | "spent" | "revoked";
      respondent_path: string | null;
    }>(
      `select o.id, o.cycle_id, o.delivery_type, o.delivery_status, o.respondent_path, e.email, e.name, p.reminder_count, p.token_status
       from identity.invite_outbox o
       join identity.survey_participants p on p.id = o.participant_id
       join identity.employees e on e.id = p.employee_id
       where o.tenant_id = $1 and o.cycle_id = $2
       order by o.created_at desc
       limit 50`,
      [tenantId, cycleId],
    );

    const summaryResult = await this.db.query<{
      pending_invites: string;
      queued_invites: string;
      sent_invites: string;
      pending_reminders: string;
      queued_reminders: string;
      sent_reminders: string;
    }>(
      `select
         count(*) filter (where delivery_type = 'invite' and delivery_status = 'pending')::text as pending_invites,
         count(*) filter (where delivery_type = 'invite' and delivery_status = 'queued')::text as queued_invites,
         count(*) filter (where delivery_type = 'invite' and delivery_status = 'sent')::text as sent_invites,
         count(*) filter (where delivery_type = 'reminder' and delivery_status = 'pending')::text as pending_reminders,
         count(*) filter (where delivery_type = 'reminder' and delivery_status = 'queued')::text as queued_reminders,
         count(*) filter (where delivery_type = 'reminder' and delivery_status = 'sent')::text as sent_reminders
       from identity.invite_outbox
       where tenant_id = $1 and cycle_id = $2`,
      [tenantId, cycleId],
    );
    const summaryRow = summaryResult.rows[0];
    return {
      summary: {
        cycleId,
        pendingInvites: Number(summaryRow?.pending_invites ?? 0),
        queuedInvites: Number(summaryRow?.queued_invites ?? 0),
        sentInvites: Number(summaryRow?.sent_invites ?? 0),
        pendingReminders: Number(summaryRow?.pending_reminders ?? 0),
        queuedReminders: Number(summaryRow?.queued_reminders ?? 0),
        sentReminders: Number(summaryRow?.sent_reminders ?? 0),
      },
      rows: rowsResult.rows.map((row) => ({
        id: row.id,
        cycleId: row.cycle_id,
        deliveryType: row.delivery_type,
        deliveryStatus: row.delivery_status,
        email: row.email,
        name: row.name,
        reminderCount: row.reminder_count,
        tokenStatus: row.token_status,
        respondentPath: row.respondent_path,
      })),
    };
  }

  async markOutboxQueued(tenantId: string, cycleId: string, deliveryType: "invite" | "reminder") {
    const result = await this.db.query<{ participant_id: string }>(
      `update identity.invite_outbox
       set delivery_status = 'queued', queued_at = now(), updated_at = now()
       where tenant_id = $1
         and cycle_id = $2
         and delivery_type = $3
         and delivery_status = 'pending'
       returning participant_id`,
      [tenantId, cycleId, deliveryType],
    );
    if (deliveryType === "reminder" && result.rowCount && result.rowCount > 0) {
      await this.db.query(
        `update identity.survey_participants p
         set reminder_count = reminder_count + 1, last_reminded_at = now()
         where p.id = any($1::uuid[])`,
        [result.rows.map((row) => row.participant_id)],
      );
    }
    return result.rowCount ?? 0;
  }

  async getQueuedOutboxDeliveries(tenantId: string, cycleId: string, deliveryType: "invite" | "reminder", limit = 25): Promise<QueuedInviteDelivery[]> {
    const result = await this.db.query<{
      id: string;
      cycle_id: string;
      delivery_type: "invite" | "reminder";
      delivery_status: "pending" | "queued" | "sent" | "failed";
      email: string;
      name: string | null;
      reminder_count: number;
      token_status: "issued" | "spent" | "revoked";
      respondent_path: string | null;
    }>(
      `select o.id, o.cycle_id, o.delivery_type, o.delivery_status, o.respondent_path, e.email, e.name, p.reminder_count, p.token_status
       from identity.invite_outbox o
       join identity.survey_participants p on p.id = o.participant_id
       join identity.employees e on e.id = p.employee_id
       where o.tenant_id = $1
         and o.cycle_id = $2
         and o.delivery_type = $3
         and o.delivery_status = 'queued'
         and p.token_status = 'issued'
       order by o.queued_at asc nulls last, o.created_at asc
       limit $4`,
      [tenantId, cycleId, deliveryType, limit],
    );

    return result.rows.map((row) => ({
      id: row.id,
      outboxId: row.id,
      cycleId: row.cycle_id,
      deliveryType: row.delivery_type,
      deliveryStatus: row.delivery_status,
      email: row.email,
      name: row.name,
      reminderCount: row.reminder_count,
      tokenStatus: row.token_status,
      respondentPath: row.respondent_path,
    }));
  }

  async markOutboxSent(outboxId: string) {
    await this.db.query(
      `update identity.invite_outbox
       set delivery_status = 'sent', sent_at = now(), updated_at = now()
       where id = $1`,
      [outboxId],
    );
  }

  async markOutboxFailed(outboxId: string) {
    await this.db.query(
      `update identity.invite_outbox
       set delivery_status = 'failed', updated_at = now()
       where id = $1`,
      [outboxId],
    );
  }

  async getPilotIdentitySummary(tenantId: string, cycleId: string | null): Promise<PilotIdentitySummary> {
    const employeeResult = await this.db.query<{ count: string }>(
      "select count(*)::text from identity.employees where tenant_id = $1 and employment_status = 'active'",
      [tenantId],
    );

    if (!cycleId) {
      return {
        employees: Number(employeeResult.rows[0]?.count ?? 0),
        participants: 0,
        issuedTokens: 0,
        spentTokens: 0,
        pendingInvites: 0,
        queuedInvites: 0,
        sentInvites: 0,
      };
    }

    const tokenResult = await this.db.query<{
      participants: string;
      issued_tokens: string;
      spent_tokens: string;
    }>(
      `select
         count(*)::text as participants,
         count(*) filter (where token_status = 'issued')::text as issued_tokens,
         count(*) filter (where token_status = 'spent')::text as spent_tokens
       from identity.survey_participants
       where tenant_id = $1 and cycle_id = $2`,
      [tenantId, cycleId],
    );
    const outboxResult = await this.db.query<{
      pending_invites: string;
      queued_invites: string;
      sent_invites: string;
    }>(
      `select
         count(*) filter (where delivery_type = 'invite' and delivery_status = 'pending')::text as pending_invites,
         count(*) filter (where delivery_type = 'invite' and delivery_status = 'queued')::text as queued_invites,
         count(*) filter (where delivery_type = 'invite' and delivery_status = 'sent')::text as sent_invites
       from identity.invite_outbox
       where tenant_id = $1 and cycle_id = $2`,
      [tenantId, cycleId],
    );
    const tokenRow = tokenResult.rows[0];
    const outboxRow = outboxResult.rows[0];

    return {
      employees: Number(employeeResult.rows[0]?.count ?? 0),
      participants: Number(tokenRow?.participants ?? 0),
      issuedTokens: Number(tokenRow?.issued_tokens ?? 0),
      spentTokens: Number(tokenRow?.spent_tokens ?? 0),
      pendingInvites: Number(outboxRow?.pending_invites ?? 0),
      queuedInvites: Number(outboxRow?.queued_invites ?? 0),
      sentInvites: Number(outboxRow?.sent_invites ?? 0),
    };
  }
}

type UserRow = {
  id: string;
  tenant_id: string;
  auth_provider: string;
  provider_subject: string;
  email: string;
  name: string | null;
  role: UserRole;
};

function mapUserRow(row: UserRow): UserRecord {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    authProvider: row.auth_provider,
    providerSubject: row.provider_subject,
    email: row.email,
    name: row.name,
    role: row.role,
  };
}

export function toTenantSlug(value: string) {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "tenant";
}
