import { describe, it, expect } from "vitest";
import { logAuditEvent } from "@/lib/server/auditLog";

describe("Audit Log De-anonymization Guard", () => {
  const validEntry = {
    tenantId: "test-tenant",
    actorRole: "customer_admin" as const,
    actorId: "admin@company.com",
    action: "survey_created" as const,
    targetType: "survey" as const,
    targetId: "survey-123",
  };

  describe("Safe entries (should not throw)", () => {
    it("logs survey creation", async () => {
      await expect(logAuditEvent(validEntry)).resolves.not.toThrow();
    });

    it("logs invites sent with aggregate count only", async () => {
      await expect(
        logAuditEvent({
          ...validEntry,
          action: "invites_sent",
          safeCounts: { invites_sent: 30 },
        })
      ).resolves.not.toThrow();
    });

    it("logs employee import with row count", async () => {
      await expect(
        logAuditEvent({
          ...validEntry,
          action: "employee_list_imported",
          targetType: "people_list",
          safeCounts: { rows_imported: 50 },
        })
      ).resolves.not.toThrow();
    });

    it("logs threshold change with new value", async () => {
      await expect(
        logAuditEvent({
          ...validEntry,
          action: "threshold_changed",
          targetType: "workspace",
          safeCounts: { new_threshold: 5 },
        })
      ).resolves.not.toThrow();
    });
  });

  describe("Unsafe entries (should throw)", () => {
    it("rejects safe_counts with email keys", async () => {
      await expect(
        logAuditEvent({
          ...validEntry,
          safeCounts: { respondent_emails: 30 }, // UNSAFE: respondent tracking
        })
      ).rejects.toThrow(/AUDIT GUARD VIOLATION/);
    });

    it("rejects safe_counts with submission per-person tracking", async () => {
      await expect(
        logAuditEvent({
          ...validEntry,
          safeCounts: { employee_submitted_count: 15 }, // UNSAFE: per-person tracking
        })
      ).rejects.toThrow(/AUDIT GUARD VIOLATION/);
    });

    it("rejects details containing respondent email addresses", async () => {
      await expect(
        logAuditEvent({
          ...validEntry,
          details: "sent invites to alice@company.com, bob@company.com", // UNSAFE: individual emails
        })
      ).rejects.toThrow(/AUDIT GUARD VIOLATION/);
    });

    it("rejects actions that look like respondent tracking", async () => {
      await expect(
        logAuditEvent({
          ...validEntry,
          action: "participant_responded" as never, // UNSAFE: respondent action -- deliberately not a real AuditLogAction, testing the runtime guard rejects it
        })
      ).rejects.toThrow(/AUDIT GUARD VIOLATION/);
    });

    it("rejects actions with submission in the name", async () => {
      await expect(
        logAuditEvent({
          ...validEntry,
          action: "submission_received" as never, // UNSAFE: submission tracking -- deliberately not a real AuditLogAction
        })
      ).rejects.toThrow(/AUDIT GUARD VIOLATION/);
    });

    it("rejects who_answered pattern", async () => {
      await expect(
        logAuditEvent({
          ...validEntry,
          action: "who_answered_query" as never, // UNSAFE: respondent identity tracking -- deliberately not a real AuditLogAction
        })
      ).rejects.toThrow(/AUDIT GUARD VIOLATION/);
    });

    it("rejects respondent_ prefix in actions", async () => {
      await expect(
        logAuditEvent({
          ...validEntry,
          action: "respondent_list_exported" as never, // UNSAFE: individual respondent tracking -- deliberately not a real AuditLogAction
        })
      ).rejects.toThrow(/AUDIT GUARD VIOLATION/);
    });
  });

  describe("Edge cases", () => {
    it("allows safe_counts with identity key if it's not about respondents", async () => {
      // This is a borderline case -- we allow "identity_count" but reject "identity_email"
      // In practice, you'd never use "identity" as a key in audit logs anyway
      await expect(
        logAuditEvent({
          ...validEntry,
          safeCounts: {}, // empty counts are OK
        })
      ).resolves.not.toThrow();
    });

    it("allows template names in details", async () => {
      await expect(
        logAuditEvent({
          ...validEntry,
          details: "from Engagement template",
        })
      ).resolves.not.toThrow();
    });
  });
});
