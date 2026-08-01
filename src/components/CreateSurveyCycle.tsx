"use client";

import { useState } from "react";
import { Rocket, ShieldCheck } from "lucide-react";
import { surveyTemplates } from "@/lib/templates";

export function CreateSurveyCycle({ templateSlug }: { templateSlug: string }) {
  const template = surveyTemplates.find((item) => item.slug === templateSlug) ?? surveyTemplates[0];
  const [cycleName, setCycleName] = useState("");
  const [status, setStatus] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function createCycle() {
    setSubmitting(true);
    setStatus("");
    const response = await fetch("/api/cycles/create", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ templateSlug, cycleName }),
    });
    const result = (await response.json().catch(() => ({}))) as {
      cycle?: { cycleId: string; employees: number; tokensIssued: number; invitesPrepared?: number };
      error?: string;
    };
    setSubmitting(false);

    if (!response.ok || !result.cycle) {
      setStatus(result.error ?? "Survey cycle could not be created.");
      return;
    }

    setStatus(
      `Draft cycle created. ${result.cycle.tokensIssued} secure respondent tokens issued and ${result.cycle.invitesPrepared ?? 0} delivery-safe invite links prepared.`,
    );
  }

  return (
    <div className="mt-5 rounded-3xl border border-[var(--brand-border)] bg-white/75 p-5">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-2 rounded-full bg-[var(--brand-accent-soft)] px-3 py-1 text-xs font-semibold text-[var(--brand-accent)]">
            <ShieldCheck size={14} />
            Server-side launch prep
          </div>
          <h2 className="mt-3 text-xl font-semibold">Create draft cycle</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--brand-muted)]">
            Creates a Supabase survey cycle from {template.name} and issues one secure token per active employee.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-[minmax(220px,1fr)_auto]">
          <input
            value={cycleName}
            onChange={(event) => setCycleName(event.target.value)}
            placeholder={`${template.name} - July pulse`}
            className="h-11 rounded-full border border-[var(--brand-border)] bg-white px-4 text-sm outline-none focus:border-[var(--brand-accent)]"
          />
          <button
            onClick={createCycle}
            disabled={submitting}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[var(--brand-ink)] px-5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Rocket size={16} />
            {submitting ? "Creating..." : "Create"}
          </button>
        </div>
      </div>
      {status ? <p className="mt-4 rounded-2xl bg-[var(--brand-bg)] p-3 text-sm font-semibold text-[var(--brand-muted)]">{status}</p> : null}
    </div>
  );
}
