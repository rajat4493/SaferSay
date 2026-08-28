"use client";

import { useEffect, useState, useTransition } from "react";
import { ArrowRight, CheckCircle2, EyeOff, Lock, PlusCircle, Zap } from "lucide-react";
import { useToast } from "@/components/ToastProvider";

type AIInsights = {
  summary: string;
  strategicWork: string[];
  quickWins: string[];
  nextAction: string;
};

type InsightsResponse = {
  ok?: boolean;
  error?: string;
  insufficientData?: boolean;
  source?: "ai" | "deterministic";
  insights?: AIInsights;
  aiUpgradeAvailable?: boolean;
  aiTemporarilyUnavailable?: boolean;
};

type FetchState =
  | { kind: "loading" }
  | { kind: "insufficient-data" }
  | { kind: "error"; message: string }
  | { kind: "ready"; source: "ai" | "deterministic"; insights: AIInsights; aiUpgradeAvailable: boolean; aiTemporarilyUnavailable: boolean };

// Quieter than a plain .card (dashed border, page-tint background, no
// shadow) -- illustrative/derived content, not the real safety-score data
// sitting next to it, and shouldn't compete with it for visual weight.
const SHELL_CLASS = "card border-dashed bg-[var(--bg)] shadow-none";

export function AiSynthesisCard({ cycleId, locked = false }: { cycleId?: string; locked?: boolean }) {
  const [state, setState] = useState<FetchState>({ kind: "loading" });
  const [, startTransition] = useTransition();
  const toast = useToast();
  // "Track this" only appears when this tenant has opted into tracking
  // (action_mode !== "insights_only") and the viewer is the one role that
  // can publish a commitment -- matches /api/report/commitment's own
  // customer_admin-only gate exactly, so this button never renders a
  // request that would just 403.
  const [canTrack, setCanTrack] = useState(false);
  const [trackedItems, setTrackedItems] = useState<Set<string>>(new Set());
  const [tracking, setTracking] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/tenants/current")
      .then((response) => response.json())
      .then((data: { ok?: boolean; role?: string; actionMode?: string }) => {
        if (data.ok) setCanTrack(data.role === "customer_admin" && data.actionMode !== "insights_only");
      })
      .catch(() => undefined);
  }, []);

  async function trackItem(statement: string) {
    if (!cycleId) return;
    setTracking(statement);
    const targetDate = new Date();
    targetDate.setUTCDate(targetDate.getUTCDate() + 14);
    const response = await fetch("/api/report/commitment", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ cycleId, statement, targetDate: targetDate.toISOString().slice(0, 10), source: "insight", sendUpdate: false }),
    });
    const data = (await response.json().catch(() => ({ ok: false }))) as { ok?: boolean; error?: string };
    setTracking(null);
    if (data.ok) {
      setTrackedItems((current) => new Set(current).add(statement));
      toast.show({ variant: "success", message: "Added to your tracked commitments -- set a real target date below." });
    } else {
      toast.show({ variant: "error", message: data.error ?? "Couldn't track that recommendation." });
    }
  }

  useEffect(() => {
    if (locked || !cycleId) return;
    let cancelled = false;
    startTransition(() => setState({ kind: "loading" }));
    fetch(`/api/report/insights?cycleId=${encodeURIComponent(cycleId)}`)
      .then((response) => response.json() as Promise<InsightsResponse>)
      .then((data) => {
        if (cancelled) return;
        if (data.ok && data.insights) {
          setState({
            kind: "ready",
            source: data.source ?? "deterministic",
            insights: data.insights,
            aiUpgradeAvailable: Boolean(data.aiUpgradeAvailable),
            aiTemporarilyUnavailable: Boolean(data.aiTemporarilyUnavailable),
          });
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

  const { insights, source, aiUpgradeAvailable, aiTemporarilyUnavailable } = state;

  return (
    <div className={SHELL_CLASS}>
      <div className="flex items-center justify-between">
        <h2 className="text-[14.5px] font-semibold text-[var(--ink)]">AI Synthesis</h2>
        <span className="badge-beta">{source === "ai" ? "Beta" : "Free"}</span>
      </div>
      <p className="mt-1.5 text-[12px] text-[var(--ink-soft)]">
        {source === "ai"
          ? "Generated from this cycle's real, already-unlocked group scores."
          : aiTemporarilyUnavailable
            ? "A rules-based read of this cycle's real group scores -- AI synthesis is temporarily unavailable, try again shortly."
            : "A rules-based read of this cycle's real group scores. Recognition and recommendations are always included, on every plan."}
      </p>

      <p className="mt-3 text-[13px] leading-[1.5] text-[var(--ink)]">{insights.summary}</p>

      {insights.quickWins.length > 0 ? (
        <div className="mt-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--ink-faint)]">Quick wins</p>
          <ul className="mt-1 space-y-1">
            {insights.quickWins.map((item) => (
              <li key={item} className="flex items-start justify-between gap-1.5 text-[12.5px] leading-[1.5] text-[var(--ink-mid)]">
                <span className="flex items-start gap-1.5">
                  <Zap size={13} strokeWidth={1.8} className="mt-[3px] shrink-0 text-[var(--green)]" />
                  {item}
                </span>
                <TrackButton item={item} canTrack={canTrack} tracked={trackedItems.has(item)} tracking={tracking === item} onTrack={trackItem} />
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
              <li key={item} className="flex items-start justify-between gap-1.5 text-[12.5px] leading-[1.5] text-[var(--ink-mid)]">
                {item}
                <TrackButton item={item} canTrack={canTrack} tracked={trackedItems.has(item)} tracking={tracking === item} onTrack={trackItem} />
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="mt-3 flex items-start justify-between gap-1.5 border-t border-[var(--border)] pt-3 text-[12.5px] font-medium leading-[1.5] text-[var(--ink)]">
        <span className="flex items-start gap-1.5">
          <ArrowRight size={13} strokeWidth={1.8} className="mt-[3px] shrink-0" />
          {insights.nextAction}
        </span>
        <TrackButton item={insights.nextAction} canTrack={canTrack} tracked={trackedItems.has(insights.nextAction)} tracking={tracking === insights.nextAction} onTrack={trackItem} />
      </div>

      {aiUpgradeAvailable ? (
        <div className="mt-3 flex items-center gap-1.5 text-[11.5px] font-medium text-[var(--ink-faint)]">
          <Lock size={12} strokeWidth={1.8} />
          Add survey credits for AI-generated synthesis of these same numbers.
        </div>
      ) : null}
    </div>
  );
}

/** Turns one recommendation into a tracked commitment, one click --
 * only rendered for the workspace owner on a tenant that's opted into
 * tracking (see canTrack above). Recognition itself never needs this;
 * it's purely the bridge into the "your choice" tracking layer. */
function TrackButton({
  item, canTrack, tracked, tracking, onTrack,
}: { item: string; canTrack: boolean; tracked: boolean; tracking: boolean; onTrack: (item: string) => void }) {
  if (!canTrack) return null;
  if (tracked) {
    return (
      <span className="inline-flex shrink-0 items-center gap-1 text-[11px] font-medium text-[var(--green)]">
        <CheckCircle2 size={12} strokeWidth={1.8} /> Tracked
      </span>
    );
  }
  return (
    <button
      type="button"
      onClick={() => onTrack(item)}
      disabled={tracking}
      className="inline-flex shrink-0 items-center gap-1 text-[11px] font-medium text-[var(--ink-faint)] hover:text-[var(--ink)] disabled:opacity-60"
    >
      <PlusCircle size={12} strokeWidth={1.8} /> {tracking ? "Tracking..." : "Track this"}
    </button>
  );
}
