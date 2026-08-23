import { describe, expect, it } from "vitest";
import { parseEmployeeSyncPayload } from "./employeeSyncPayload";

describe("parseEmployeeSyncPayload", () => {
  it("parses valid employee records", () => {
    const result = parseEmployeeSyncPayload([{ email: "a@example.com", name: "A", team: "Eng" }]);
    expect(result.errors).toEqual([]);
    expect(result.employees).toEqual([{ email: "a@example.com", name: "A", team: "Eng", location: undefined, managerEmail: undefined }]);
  });

  it("rejects a non-array body", () => {
    const result = parseEmployeeSyncPayload({ email: "a@example.com" });
    expect(result.errors).toContain("Body must be a JSON array of employee records.");
  });

  it("rejects an empty array", () => {
    const result = parseEmployeeSyncPayload([]);
    expect(result.errors).toContain("No employee records were provided.");
  });

  it("requires a valid email per record and reports the offending row", () => {
    const result = parseEmployeeSyncPayload([{ email: "not-an-email" }]);
    expect(result.errors).toEqual(["Record 1: email is not valid."]);
  });

  it("rejects duplicate emails within one batch", () => {
    const result = parseEmployeeSyncPayload([{ email: "a@example.com" }, { email: "a@example.com" }]);
    expect(result.errors).toContain('Record 2: duplicate email "a@example.com".');
  });

  it("rejects a managerEmail equal to the employee's own email", () => {
    const result = parseEmployeeSyncPayload([{ email: "a@example.com", managerEmail: "a@example.com" }]);
    expect(result.errors[0]).toContain("cannot be the same as the employee's own email");
  });

  it("caps a batch at 10000 records", () => {
    const batch = Array.from({ length: 10001 }, (_, i) => ({ email: `e${i}@example.com` }));
    const result = parseEmployeeSyncPayload(batch);
    expect(result.errors[0]).toContain("more than 10000 records");
  });
});
