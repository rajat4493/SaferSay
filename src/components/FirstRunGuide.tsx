"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { Card } from "@/components/AppShell";

type PilotState = {
  ok?: boolean;
  cycle?: { id: string; name: string } | null;
  identity?: { employees: number; sentInvites: number };
};

type Step = { label: string; body: string; href: string; action: string };

/**
 * One step at a time, not a checklist -- deliberately simpler than
 * PilotGuide's 8-step version (see docs/COHERENCE_PLAN.md Gap 1). Stops
 * rendering for good once the tenant's first_run_completed_at flag is
 * set server-side (checked by the caller before mounting this).
 */
export function FirstRunGuide() {
  const [state, setState] = useState<PilotState | null>(null);
  const [, startTransition] = useTransition();

  async function load() {
    const response = await fetch("/api/pilot/state");
    setState((await response.json().catch(() => ({ ok: false }))) as PilotState);
  }

  useEffect(() => {
    startTransition(() => {
      void load();
    });
  }, []);

  if (!state?.ok || !state.identity) return null;

  const employees = state.identity.employees;
  const hasCycle = Boolean(state.cycle);
  const sentInvites = state.identity.sentInvites;
  const done = [employees > 0, hasCycle, sentInvites > 0];
  const stepIndex = done.findIndex((isDone) => !isDone);

  if (stepIndex === -1) {
    return (
      <Card className="mb-6">
        <p className="font-medium text-[var(--green)]">You&apos;re set up — your first survey is live.</p>
      </Card>
    );
  }

  const cycleName = state.cycle?.name;
  const steps: Step[] = [
    { label: "Load the people who should receive surveys", body: "Import a CSV of your employees so SaferSay knows who to invite.", href: "/app/people", action: "Upload employees" },
    { label: "Create your first survey", body: "Pick a template — SaferSay issues a secure invite link for each active employee.", href: "/app/surveys/new", action: "Create survey" },
    {
      label: `Send “${cycleName ?? "your survey"}”`,
      body: `Send the confidential invite links for ${cycleName ? `"${cycleName}"` : "this survey"} so people can start responding.`,
      href: hasCycle ? `/app/${state.cycle!.id}/send` : "/app/surveys/new",
      action: "Send invites",
    },
  ];
  const step = steps[stepIndex];

  return (
    <Card className="mb-6">
      <p className="meta-label">
        Step {stepIndex + 1} of {steps.length}
      </p>
      <h2 className="section-title mt-2">{step.label}</h2>
      <p className="mt-1.5 secondary-text">{step.body}</p>
      <Link href={step.href} className="btn-primary mt-4 inline-flex">
        {step.action}
      </Link>
    </Card>
  );
}
