import { randomBytes, randomUUID } from "crypto";
import { Pool } from "pg";
import { hashServerToken } from "@/lib/server/tokenHashing";
import { EmployeeImportRecord, InviteOutboxRow, InviteOutboxSummary, IssuedParticipantToken, TenantRecord } from "./types";

export class IdentityRepository {
  constructor(private readonly db: Pool) {}

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
        `insert into identity.employees (id, tenant_id, email, name, team, location)
         values ($1, $2, $3, $4, $5, $6)
         on conflict (tenant_id, email)
         do update set name = excluded.name, team = excluded.team, location = excluded.location
         returning id, email, name, team, location`,
        [id, tenantId, employee.email, employee.name ?? null, employee.team ?? null, employee.location ?? null],
      );
      imported.push(employee);
    }
    return imported.length;
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
    }>("select id, email, name from identity.employees where tenant_id = $1 and employment_status = 'active'", [
      tenantId,
    ]);

    const issued: IssuedParticipantToken[] = [];
    for (const employee of employees.rows) {
      const rawToken = randomBytes(32).toString("base64url");
      const result = await this.db.query(
        `insert into identity.survey_participants
          (id, tenant_id, cycle_id, employee_id, token_hash, token_status, issued_at)
         values ($1, $2, $3, $4, $5, 'issued', now())
         on conflict (cycle_id, employee_id) do nothing
         returning id`,
        [randomUUID(), tenantId, cycleId, employee.id, hashServerToken(rawToken)],
      );
      if (result.rowCount === 1) {
        issued.push({ employeeId: employee.id, email: employee.email, name: employee.name ?? undefined, rawToken });
      }
    }
    return issued;
  }

  async findIssuedToken(tokenHash: string) {
    const result = await this.db.query<{
      tenant_id: string;
      cycle_id: string;
      token_status: "issued" | "spent" | "revoked";
    }>(
      `select tenant_id, cycle_id, token_status
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
    }>(
      `select tenant_id, cycle_id, token_status
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
    if (result.rowCount !== 1) throw new Error("Token is invalid or already spent.");
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

  async prepareInviteOutbox(tenantId: string, cycleId: string) {
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
    return result.rowCount ?? 0;
  }

  async prepareReminderOutbox(tenantId: string, cycleId: string) {
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
       on conflict (participant_id, delivery_type) do nothing`,
      [tenantId, cycleId],
    );
    return result.rowCount ?? 0;
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
    }>(
      `select o.id, o.cycle_id, o.delivery_type, o.delivery_status, e.email, e.name, p.reminder_count, p.token_status
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
}

export function toTenantSlug(value: string) {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "tenant";
}
