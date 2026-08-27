"use client";

import { useEffect, useState, useTransition } from "react";
import { ArrowRight, EyeOff, Lock, Zap } from "lucide-react";

type AIInsights = {
  summary: string;
  strategicWork: string[];
  quickWins: string[];
  nextAction: string;
};

type InsightsResponse = {
  ok?: boolean;
  error?: string;
  locked?: boolean;
  insufficientData?: boolean;
  source?: "ai" | "deterministic";
  insights?: AIInsights;
};

type FetchState =
  | { kind: "loading" }
  | { kind: "not-entitled" }
  | { kind: "insufficient-data" }
  | { kind: "error"; message: string }
  | { kind: "ready"; source: "ai" | "deterministic"; insights: AIInsights };

// Quieter than a plain .card (dashed border, page-tint background, no
// shadow) -- illustrative/derived content, not the real safety-score data
// sitting next to it, and shouldn't compete with it for visual weight.
const SHELL_CLASS = "card border-dashed bg-[var(--bg)] shadow-none";

export function AiSynthesisCard({ cycleId, locked = false }: { cycleId?: string; locked?: boolean }) {
  const [state, setState] = useState<FetchState>({ kind: "loading" });
  const [, startTransition] = useTransition();

  useEffect(() => {
    if (locked || !cycleId) return;
    let cancelled = false;
    startTransition(() => setState({ kind: "loading" }));
    fetch(`/api/report/insights?cycleId=${encodeURIComponent(cycleId)}`)
      .then((response) => response.json().then((data: InsightsResponse) => ({ status: response.status, data })))
      .then(({ status, data }) => {
        if (cancelled) return;
        if (data.ok && data.insights) {
          setState({ kind: "ready", source: data.source ?? "deterministic", insights: data.insights });
        } else if (status === 403 && data.locked) {
          setState({ kind: "not-entitled" });
        } else if (data.insufficientData) {
          setState({ kind: "insufficient-data" });
        } else {
          setState({ kind: "error", message: data.error ?? "Couldn't generate insights right now." });
        }
      })
      .catch(() => {
        if (!cancelled) setState({ kind: "error", message: "Couldn't generate insights right now." });
      });
    return () => {
      cancelled = true;
    };
  }, [locked, cycleId]);

  // Real report data (scores next to this card) is still locked with the
  // rest of the report -- this must never imply insights exist when the
  // underlying numbers don't.
  if (locked) {
    return (
      <div className={SHELL_CLASS}>
        <div className="flex items-center justify-between">
          <h2 className="text-[14.5px] font-semibold text-[var(--ink)]">AI Synthesis</h2>
          <span className="badge-beta">Beta</span>
        </div>
        <div className="mt-3 flex items-center gap-2 text-[13px] font-medium text-[var(--ink-mid)]">
          <EyeOff size={15} strokeWidth={1.8} /> Locked with the rest of the report
        </div>
        <p className="mt-2 text-[12px] leading-[1.5] text-[var(--ink-soft)]">
          AI interpretation will generate once enough responses exist to keep individuals unidentifiable.
        </p>
      </div>
    );
  }

  if (state.kind === "not-entitled") {
    return (
      <div className={SHELL_CLASS}>
        <div className="flex items-center justify-between">
          <h2 className="text-[14.5px] font-semibold text-[var(--ink)]">AI Synthesis</h2>
          <span className="badge-beta">Beta</span>
        </div>
        <div className="mt-3 flex items-center gap-2 text-[13px] font-medium text-[var(--ink-mid)]">
          <Lock size={15} strokeWidth={1.8} /> Included with paid survey credits
        </div>
        <p className="mt-2 text-[12px] leading-[1.5] text-[var(--ink-soft)]">
          Buy survey credits to unlock AI interpretation of this report&apos;s real, already-unlocked group scores.
        </p>
      </div>
    );
  }

  if (state.kind === "insufficient-data") {
    return (
      <div className={SHELL_CLASS}>
        <div className="flex items-center justify-between">
          <h2 className="text-[14.5px] font-semibold text-[var(--ink)]">AI Synthesis</h2>
          <span className="badge-beta">Beta</span>
        </div>
        <p className="mt-3 text-[13px] text-[var(--ink-mid)]">Not enough scored questions yet to summarize.</p>
      </div>
    );
  }

  if (state.kind === "error") {
    return (
      <div className={SHELL_CLASS}>
        <div className="flex items-center justify-between">
          <h2 className="text-[14.5px] font-semibold text-[var(--ink)]">AI Synthesis</h2>
          <span className="badge-beta">Beta</span>
        </div>
        <p className="mt-3 text-[13px] text-[var(--ink-mid)]">{state.message}</p>
      </div>
    );
  }

  if (state.kind === "loading") {
    return (
      <div className={SHELL_CLASS}>
        <div className="flex items-center justify-between">
          <h2 className="text-[14.5px] font-semibold text-[var(--ink)]">AI Synthesis</h2>
          <span className="badge-beta">Beta</span>
        </div>
        <p className="mt-3 text-[13px] text-[var(--ink-soft)]">Generating...</p>
      </div>
    );
  }

  const { insights, source } = state;

  return (
    <div className={SHELL_CLASS}>
      <div className="flex items-center justify-between">
        <h2 className="text-[14.5px] font-semibold text-[var(--ink)]">AI Synthesis</h2>
        <span className="badge-beta">{source === "ai" ? "Beta" : "Estimate"}</span>
      </div>
      <p className="mt-1.5 text-[12px] text-[var(--ink-soft)]">
        {source === "ai"
          ? "Generated from this cycle's real, already-unlocked group scores."
          : "A rules-based read of this cycle's real group scores -- no AI provider is configured yet."}
      </p>

      <p className="mt-3 text-[13px] leading-[1.5] text-[var(--ink)]">{insights.summary}</p>

      {insights.quickWins.length > 0 ? (
        <div className="mt-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--ink-faint)]">Quick wins</p>
          <ul className="mt-1 space-y-1">
            {insights.quickWins.map((item) => (
              <li key={item} className="flex items-start gap-1.5 text-[12.5px] leading-[1.5] text-[var(--ink-mid)]">
                <Zap size={13} strokeWidth={1.8} className="mt-[3px] shrink-0 text-[var(--green)]" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {insights.strategicWork.length > 0 ? (
        <div className="mt-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--ink-faint)]">Deeper work</p>
          <ul className="mt-1 space-y-1">
            {insights.strategicWork.map((item) => (
              <li key={item} className="text-[12.5px] leading-[1.5] text-[var(--ink-mid)]">
                {item}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="mt-3 flex items-start gap-1.5 border-t border-[var(--border)] pt-3 text-[12.5px] font-medium leading-[1.5] text-[var(--ink)]">
        <ArrowRight size={13} strokeWidth={1.8} className="mt-[3px] shrink-0" />
        {insights.nextAction}
      </div>
    </div>
  );
}
