import { randomBytes, randomUUID } from "crypto";
import { Pool } from "pg";
import { hashServerToken } from "@/lib/serverStore";
import { EmployeeImportRecord, IssuedParticipantToken, TenantRecord } from "./types";

export class IdentityRepository {
  constructor(private readonly db: Pool) {}

  async createTenant(name: string): Promise<TenantRecord> {
    const id = randomUUID();
    await this.db.query("insert into identity.tenants (id, name) values ($1, $2)", [id, name]);
    return { id, name };
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
      await this.db.query(
        `insert into identity.survey_participants
          (id, tenant_id, cycle_id, employee_id, token_hash, token_status, issued_at)
         values ($1, $2, $3, $4, $5, 'issued', now())
         on conflict (token_hash) do nothing`,
        [randomUUID(), tenantId, cycleId, employee.id, hashServerToken(rawToken)],
      );
      issued.push({ employeeId: employee.id, email: employee.email, name: employee.name ?? undefined, rawToken });
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
