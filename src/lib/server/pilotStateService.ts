import type { Queryable } from "@/lib/server/db/tenantPool";
import { IdentityRepository } from "@/lib/server/repositories/identityRepository";
import { ResponseRepository } from "@/lib/server/repositories/responseRepository";

export async function getPilotState(params: { db: Queryable; tenantId: string; tenantName?: string }) {
  const responseRepository = new ResponseRepository(params.db);
  const identityRepository = new IdentityRepository(params.db);
  const report = await responseRepository.getLatestProtectedReportForTenant(params.tenantId, undefined, params.tenantName);
  const identity = await identityRepository.getPilotIdentitySummary(params.tenantId, report.cycle?.id ?? null);

  // Once a cycle exists, deep-link straight into its Send/Results stage
  // instead of the old standalone routes -- those pages moved inside the
  // survey object (docs/strategy/CLAUDE_CODE_ADMIN_REFACTOR.md §1).
  const sendHref = report.cycle ? `/app/${report.cycle.id}/send` : "/app/surveys/new";
  const resultsHref = report.cycle ? `/app/${report.cycle.id}/results` : "/app";

  // This is deliberately the customer-facing version of first run. The
  // operational details (tokens, queue and outbox) still happen safely in
  // the product, but new HR users should never have to learn those terms to
  // launch their first survey.
  const steps = [
    {
      key: "employees",
      label: "Add your people",
      done: identity.employees > 0,
      href: "/app/people",
      action: "Add people",
      detail: `${identity.employees} active employees loaded.`,
    },
    {
      key: "cycle",
      label: "Choose and create your first survey",
      done: Boolean(report.cycle),
      href: "/app/surveys/new",
      action: "Choose a template",
      detail: report.cycle ? report.cycle.name : "No survey cycle yet.",
    },
    {
      key: "send",
      label: "Review people and send confidential invites",
      done: identity.queuedInvites + identity.sentInvites > 0,
      href: sendHref,
      action: "Review and send",
      detail: identity.queuedInvites + identity.sentInvites > 0 ? "Your survey is live and invite delivery is being tracked." : "Check the people who will be invited, then send when you are ready.",
    },
    {
      key: "responses",
      label: "Watch response progress",
      done: report.report.n > 0,
      href: resultsHref,
      action: "View progress",
      detail: `${report.report.n} responses submitted.`,
    },
    {
      key: "report",
      label: "Review protected results",
      done: !report.report.protected,
      href: resultsHref,
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
