import { describe, expect, it } from "vitest";
import { parseEmployeeCsv } from "./csvEmployees";

describe("employee CSV parser", () => {
  it("parses valid HR CSV rows", () => {
    const preview = parseEmployeeCsv("email,name,team,location\nalex@example.com,Alex,Ops,London\nsam@example.com,Sam,Sales,Dublin");
    expect(preview.errors).toEqual([]);
    expect(preview.employees).toHaveLength(2);
    expect(preview.employees[0]).toEqual({
      email: "alex@example.com",
      name: "Alex",
      team: "Ops",
      location: "London",
    });
  });

  it("reports missing email and duplicate employees", () => {
    const preview = parseEmployeeCsv("name,email\nAlex,alex@example.com\nSam,alex@example.com\nNo Email,");
    expect(preview.errors).toContain('Row 3: duplicate email "alex@example.com".');
    expect(preview.errors).toContain("Row 4: email is required.");
  });

  it("supports quoted values", () => {
    const preview = parseEmployeeCsv('email,name,team\nalex@example.com,"Alex, Senior","People Ops"');
    expect(preview.errors).toEqual([]);
    expect(preview.employees[0].name).toBe("Alex, Senior");
    expect(preview.employees[0].team).toBe("People Ops");
  });

  it("accepts a valid manager_email and lowercases it", () => {
    const preview = parseEmployeeCsv("email,manager_email\nalex@example.com,Boss@example.com");
    expect(preview.errors).toEqual([]);
    expect(preview.employees[0].managerEmail).toBe("boss@example.com");
  });

  it("rejects a malformed manager_email", () => {
    const preview = parseEmployeeCsv("email,manager_email\nalex@example.com,not-an-email");
    expect(preview.errors).toContain("Row 2: manager_email is not a valid email.");
  });

  it("rejects an employee listed as their own manager", () => {
    const preview = parseEmployeeCsv("email,manager_email\nalex@example.com,alex@example.com");
    expect(preview.errors).toContain("Row 2: manager_email cannot be the same as the employee's own email.");
  });
});
