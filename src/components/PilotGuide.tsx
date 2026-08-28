"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { Check, Circle, RefreshCw } from "lucide-react";
import { Card } from "@/components/AppShell";
import { SkeletonText } from "@/components/Skeleton";

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
          <p className="meta-label">Your first survey</p>
          <h2 className="section-title mt-2">Launch in a few clear steps</h2>
          <p className="mt-1.5 max-w-2xl secondary-text">Add your people, choose a survey, send it, then review results once they are safely protected.</p>
        </div>
        <button onClick={load} className="btn-secondary shrink-0">
          <RefreshCw size={13} strokeWidth={1.8} />
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="mt-5">
          <SkeletonText lines={2} />
        </div>
      ) : null}
      {state?.error ? <p className="mt-5 secondary-text font-medium text-[var(--red)]">{state.error}</p> : null}

      {next ? (
        <div className="mt-5 rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--bg)] p-4">
          <p className="meta-label">Next click</p>
          <div className="mt-2 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div>
              <h3 className="text-[14px] font-medium text-[var(--ink)]">{next.label}</h3>
              <p className="mt-1 secondary-text">{next.detail}</p>
            </div>
            <Link href={next.href} className="btn-primary btn-pill shrink-0 text-center">
              {next.action}
            </Link>
          </div>
        </div>
      ) : null}

      {steps ? (
        <div className="mt-5 grid gap-2">
          {steps.map((step, index) => (
            <Link key={step.key} href={step.href} className="card card-interactive grid gap-3 text-[13px] md:grid-cols-[28px_1fr_auto] md:items-center">
              <div className={`grid h-7 w-7 place-items-center rounded-full ${step.done ? "border border-[var(--green-border)] bg-[var(--green-bg)] text-[var(--green)]" : "bg-[var(--bg)] text-[var(--ink-faint)]"}`}>
                {step.done ? <Check size={14} strokeWidth={2} /> : <Circle size={12} strokeWidth={1.8} />}
              </div>
              <div>
                <div className="font-medium text-[var(--ink)]">
                  {index + 1}. {step.label}
                </div>
                <div className="mt-1 text-[var(--ink-mid)]">{step.detail}</div>
              </div>
              <span className="font-medium text-[var(--ink)]">{step.action}</span>
            </Link>
          ))}
        </div>
      ) : null}
    </Card>
  );
}
