import type { EmployeeImportRecord } from "@/lib/server/repositories/types";

export type EmployeeCsvPreview = {
  employees: EmployeeImportRecord[];
  errors: string[];
  headers: string[];
  totalRows: number;
};

const requiredHeaders = ["email"];
const optionalHeaders = ["name", "team", "location", "manager_email"];
const acceptedHeaders = new Set([...requiredHeaders, ...optionalHeaders]);

export function parseEmployeeCsv(input: string): EmployeeCsvPreview {
  const rows = parseCsvRows(input).filter((row) => row.some((cell) => cell.trim().length > 0));
  if (rows.length === 0) return { employees: [], errors: ["The file is empty."], headers: [], totalRows: 0 };

  const headers = rows[0].map((header) => normalizeHeader(header));
  const errors: string[] = [];
  const seenHeaders = new Set<string>();
  headers.forEach((header) => {
    if (!header) errors.push("One or more header cells are blank.");
    if (header && seenHeaders.has(header)) errors.push(`Column "${header}" appears more than once.`);
    if (header) seenHeaders.add(header);
    if (header && !acceptedHeaders.has(header)) errors.push(`Column "${header}" is not supported.`);
  });

  for (const required of requiredHeaders) {
    if (!seenHeaders.has(required)) errors.push(`Missing required column "${required}".`);
  }

  const emailIndex = headers.indexOf("email");
  const nameIndex = headers.indexOf("name");
  const teamIndex = headers.indexOf("team");
  const locationIndex = headers.indexOf("location");
  const managerEmailIndex = headers.indexOf("manager_email");
  const emails = new Set<string>();
  const employees: EmployeeImportRecord[] = [];

  rows.slice(1).forEach((row, index) => {
    const rowNumber = index + 2;
    const email = readCell(row, emailIndex).toLowerCase();
    if (!email) {
      errors.push(`Row ${rowNumber}: email is required.`);
      return;
    }
    if (!isValidEmail(email)) {
      errors.push(`Row ${rowNumber}: email is not valid.`);
      return;
    }
    if (emails.has(email)) {
      errors.push(`Row ${rowNumber}: duplicate email "${email}".`);
      return;
    }
    emails.add(email);
    employees.push({
      email,
      name: readCell(row, nameIndex) || undefined,
      team: readCell(row, teamIndex) || undefined,
      location: readCell(row, locationIndex) || undefined,
      managerEmail: readCell(row, managerEmailIndex) || undefined,
    });
  });

  if (employees.length === 0 && errors.length === 0) errors.push("No employee rows were found.");

  return {
    employees,
    errors: [...new Set(errors)],
    headers,
    totalRows: Math.max(rows.length - 1, 0),
  };
}

function normalizeHeader(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, "_");
}

function readCell(row: string[], index: number) {
  if (index < 0) return "";
  return (row[index] ?? "").trim();
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function parseCsvRows(input: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  for (let index = 0; index < input.length; index += 1) {
    const character = input[index];
    const next = input[index + 1];

    if (character === '"' && quoted && next === '"') {
      cell += '"';
      index += 1;
      continue;
    }
    if (character === '"') {
      quoted = !quoted;
      continue;
    }
    if (character === "," && !quoted) {
      row.push(cell);
      cell = "";
      continue;
    }
    if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && next === "\n") index += 1;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
      continue;
    }
    cell += character;
  }

  row.push(cell);
  rows.push(row);
  return rows;
}
