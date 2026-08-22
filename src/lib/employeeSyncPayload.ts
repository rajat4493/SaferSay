import type { EmployeeImportRecord } from "@/lib/server/repositories/types";

/**
 * JSON-payload counterpart to parseEmployeeCsv (csvEmployees.ts) -- same
 * validation rules (email required/valid, no duplicates within the batch,
 * manager_email format, row cap), just reading a JSON array instead of CSV
 * text. Used by the HRIS/roster sync webhook (/api/employees/sync), where
 * a caller pushes structured records rather than uploading a file.
 */
export type EmployeeSyncPreview = { employees: EmployeeImportRecord[]; errors: string[] };

const MAX_ROWS = 10000;

export function parseEmployeeSyncPayload(raw: unknown): EmployeeSyncPreview {
  if (!Array.isArray(raw)) return { employees: [], errors: ["Body must be a JSON array of employee records."] };
  if (raw.length === 0) return { employees: [], errors: ["No employee records were provided."] };
  if (raw.length > MAX_ROWS) {
    return { employees: [], errors: [`This batch has more than ${MAX_ROWS} records. Split it into smaller batches and sync separately.`] };
  }

  const errors: string[] = [];
  const emails = new Set<string>();
  const employees: EmployeeImportRecord[] = [];

  raw.forEach((item, index) => {
    const rowNumber = index + 1;
    if (!item || typeof item !== "object") {
      errors.push(`Record ${rowNumber}: must be an object.`);
      return;
    }
    const value = item as Record<string, unknown>;
    const email = typeof value.email === "string" ? value.email.trim().toLowerCase() : "";
    if (!email) {
      errors.push(`Record ${rowNumber}: email is required.`);
      return;
    }
    if (!isValidEmail(email)) {
      errors.push(`Record ${rowNumber}: email is not valid.`);
      return;
    }
    if (emails.has(email)) {
      errors.push(`Record ${rowNumber}: duplicate email "${email}".`);
      return;
    }
    emails.add(email);

    const managerEmail = typeof value.managerEmail === "string" ? value.managerEmail.trim().toLowerCase() : "";
    if (managerEmail) {
      if (!isValidEmail(managerEmail)) {
        errors.push(`Record ${rowNumber}: managerEmail is not a valid email.`);
        return;
      }
      if (managerEmail === email) {
        errors.push(`Record ${rowNumber}: managerEmail cannot be the same as the employee's own email.`);
        return;
      }
    }

    employees.push({
      email,
      name: typeof value.name === "string" && value.name.trim() ? value.name.trim() : undefined,
      team: typeof value.team === "string" && value.team.trim() ? value.team.trim() : undefined,
      location: typeof value.location === "string" && value.location.trim() ? value.location.trim() : undefined,
      managerEmail: managerEmail || undefined,
    });
  });

  return { employees, errors: [...new Set(errors)] };
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}
