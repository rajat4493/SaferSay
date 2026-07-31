import type { Pool } from "pg";
import { IdentityRepository } from "@/lib/server/repositories/identityRepository";
import { ResponseRepository } from "@/lib/server/repositories/responseRepository";

export async function getPilotState(params: { db: Pool; tenantId: string }) {
  const responseRepository = new ResponseRepository(params.db);
  const identityRepository = new IdentityRepository(params.db);
  const report = await responseRepository.getLatestProtectedReportForTenant(params.tenantId);
  const identity = await identityRepository.getPilotIdentitySummary(params.tenantId, report.cycle?.id ?? null);

  const steps = [
    {
      key: "employees",
      label: "Upload employees",
      done: identity.employees > 0,
      href: "/app/participants",
      action: "Upload CSV",
      detail: `${identity.employees} active employees loaded.`,
    },
    {
      key: "cycle",
      label: "Create survey cycle",
      done: Boolean(report.cycle),
      href: "/app/surveys/new",
      action: "Create draft cycle",
      detail: report.cycle ? report.cycle.name : "No survey cycle yet.",
    },
    {
      key: "tokens",
      label: "Issue secure tokens",
      done: identity.participants > 0,
      href: "/app/surveys/new",
      action: "Create cycle",
      detail: `${identity.participants} participant tokens created.`,
    },
    {
      key: "outbox",
      label: "Prepare invite outbox",
      done: identity.pendingInvites + identity.queuedInvites + identity.sentInvites > 0,
      href: "/app/integrations",
      action: "Prepare invites",
      detail: `${identity.pendingInvites} pending, ${identity.queuedInvites} queued, ${identity.sentInvites} sent.`,
    },
    {
      key: "queue",
      label: "Queue invites",
      done: identity.queuedInvites + identity.sentInvites > 0,
      href: "/app/integrations",
      action: "Queue invites",
      detail: `${identity.queuedInvites} invites queued.`,
    },
    {
      key: "responses",
      label: "Collect responses",
      done: report.report.n > 0,
      href: "/app/reports",
      action: "Watch report",
      detail: `${report.report.n} responses submitted.`,
    },
    {
      key: "report",
      label: "Review safe report",
      done: !report.report.protected,
      href: "/app/reports",
      action: "Open report",
      detail: report.report.protected
        ? `Protected until ${report.cycle?.minGroupSize ?? 5} responses exist.`
        : "Report is unlocked.",
    },
  ];

  const nextStep = steps.find((step) => !step.done) ?? steps[steps.length - 1];

  return {
    cycle: report.cycle,
    identity,
    report: report.report,
    steps,
    nextStep,
  };
}
