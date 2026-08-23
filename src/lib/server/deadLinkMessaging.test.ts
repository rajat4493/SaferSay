import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";

describe("respondent-facing dead-link messages distinguish already-submitted from invalid", () => {
  const sessionRoute = readFileSync("src/app/api/respondent/session/route.ts", "utf8");
  const submissionService = readFileSync("src/lib/server/confidentialSubmissionService.ts", "utf8");
  const serverStore = readFileSync("src/lib/serverStore.ts", "utf8");

  it("session route reports a distinct reason for a spent token vs. an unknown one", () => {
    expect(sessionRoute).toContain("already_submitted");
    expect(sessionRoute).toContain("You've already completed this survey.");
    expect(sessionRoute).toContain("This link isn't valid.");
    // Not the old collapsed message that covered every case identically.
    expect(sessionRoute).not.toContain("This survey link is not active.");
  });

  it("submit path (real DB) distinguishes the same two cases", () => {
    expect(submissionService).toContain("You've already completed this survey.");
    expect(submissionService).toContain("This link isn't valid.");
    expect(submissionService).not.toContain("Token is invalid or already spent.");
  });

  it("submit path (local/no-DB mode) distinguishes the same two cases", () => {
    expect(serverStore).toContain("You've already completed this survey.");
    expect(serverStore).toContain("This link isn't valid.");
    expect(serverStore).not.toContain("Token is invalid or already spent.");
  });
});
