"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { Check, Circle, RefreshCw } from "lucide-react";
import { Card } from "@/components/AppShell";

type PilotState = {
  ok?: boolean;
  error?: string;
  tenant?: { name: string };
  nextStep?: { label: string; href: string; action: string; detail: string };
  steps?: Array<{ key: string; label: string; done: boolean; href: string; action: string; detail: string }>;
};

export function PilotGuide({ compact = false }: { compact?: boolean }) {
  const [state, setState] = useState<PilotState | null>(null);
  const [loading, setLoading] = useState(true);
  const [, startTransition] = useTransition();

  async function load() {
    setLoading(true);
    const response = await fetch("/api/pilot/state");
    setState((await response.json().catch(() => ({ ok: false, error: "Pilot state could not be loaded." }))) as PilotState);
    setLoading(false);
  }

  useEffect(() => {
    startTransition(() => {
      void load();
    });
  }, []);

  const next = state?.nextStep;
  const steps = compact ? state?.steps?.slice(0, 4) : state?.steps;

  return (
    <Card>
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-[var(--brand-accent-soft)] px-3 py-1 text-xs font-semibold text-[var(--brand-accent)]">
            First run
          </div>
          <h2 className="mt-3 text-xl font-semibold">Pilot guide</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--brand-muted)]">
            Follow this checklist to run one real confidential survey from upload to safe report.
          </p>
        </div>
        <button onClick={load} className="inline-flex items-center gap-2 rounded-full border border-[var(--brand-border)] bg-white px-4 py-2 text-sm font-semibold">
          <RefreshCw size={14} />
          Refresh
        </button>
      </div>

      {loading ? <p className="mt-5 text-sm font-semibold text-[var(--brand-muted)]">Checking pilot status...</p> : null}
      {state?.error ? <p className="mt-5 text-sm font-semibold text-[#9a392d]">{state.error}</p> : null}

      {next ? (
        <div className="mt-5 rounded-3xl border border-[var(--brand-border)] bg-white p-4">
          <p className="text-xs font-semibold uppercase text-[var(--brand-muted)]">Next click</p>
          <div className="mt-2 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div>
              <h3 className="text-lg font-semibold">{next.label}</h3>
              <p className="mt-1 text-sm text-[var(--brand-muted)]">{next.detail}</p>
            </div>
            <Link href={next.href} className="rounded-full bg-[var(--brand-ink)] px-5 py-3 text-center text-sm font-semibold text-white">
              {next.action}
            </Link>
          </div>
        </div>
      ) : null}

      {steps ? (
        <div className="mt-5 grid gap-3">
          {steps.map((step, index) => (
            <Link key={step.key} href={step.href} className="grid gap-3 rounded-2xl border border-[var(--brand-border)] bg-white p-4 text-sm md:grid-cols-[32px_1fr_auto] md:items-center">
              <div className={`grid h-8 w-8 place-items-center rounded-full ${step.done ? "bg-[var(--brand-accent-soft)] text-[var(--brand-accent)]" : "bg-[var(--brand-bg)] text-[var(--brand-muted)]"}`}>
                {step.done ? <Check size={16} /> : <Circle size={14} />}
              </div>
              <div>
                <div className="font-semibold">{index + 1}. {step.label}</div>
                <div className="mt-1 text-[var(--brand-muted)]">{step.detail}</div>
              </div>
              <span className="font-semibold text-[var(--brand-accent)]">{step.action}</span>
            </Link>
          ))}
        </div>
      ) : null}
    </Card>
  );
}
