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
});
