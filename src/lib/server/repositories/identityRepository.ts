import { randomBytes, randomUUID } from "crypto";
import { Pool } from "pg";
import { hashServerToken } from "@/lib/server/tokenHashing";
import { EmployeeImportRecord, IssuedParticipantToken, TenantRecord } from "./types";

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
}

export function toTenantSlug(value: string) {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "tenant";
}
