import { describe, expect, it } from "vitest";
import { matchesShowIf } from "./respondentSessionService";

describe("matchesShowIf (Option B structural branching)", () => {
  it("shows a question with no condition to everyone", () => {
    expect(matchesShowIf(null, { team: "engineering", location: null })).toBe(true);
    expect(matchesShowIf(null, { team: null, location: null })).toBe(true);
  });

  it("matches an eq condition against the participant's snapshotted team", () => {
    const condition = { attribute: "team" as const, op: "eq" as const, value: "engineering" };
    expect(matchesShowIf(condition, { team: "engineering", location: null })).toBe(true);
    expect(matchesShowIf(condition, { team: "support", location: null })).toBe(false);
  });

  it("matches a neq condition", () => {
    const condition = { attribute: "team" as const, op: "neq" as const, value: "engineering" };
    expect(matchesShowIf(condition, { team: "support", location: null })).toBe(true);
    expect(matchesShowIf(condition, { team: "engineering", location: null })).toBe(false);
  });

  it("treats a null participant attribute as never matching eq, always matching neq", () => {
    // A respondent with no team on file shouldn't silently see (or be
    // silently excluded from) a team-gated question by accident -- eq
    // against nothing is false, neq against nothing is true (nothing
    // equals the gate value, so "not equal" holds).
    const eq = { attribute: "team" as const, op: "eq" as const, value: "engineering" };
    const neq = { attribute: "team" as const, op: "neq" as const, value: "engineering" };
    expect(matchesShowIf(eq, { team: null, location: null })).toBe(false);
    expect(matchesShowIf(neq, { team: null, location: null })).toBe(true);
  });

  it("evaluates location conditions independently of team", () => {
    const condition = { attribute: "location" as const, op: "eq" as const, value: "Remote" };
    expect(matchesShowIf(condition, { team: "engineering", location: "Remote" })).toBe(true);
    expect(matchesShowIf(condition, { team: "engineering", location: "Office" })).toBe(false);
  });
});
