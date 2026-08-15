"use client";

import { useEffect, useState } from "react";
import { EyeOff, TrendingUp } from "lucide-react";
import { Card } from "@/components/AppShell";
import { SkeletonText } from "@/components/Skeleton";
import { ViewerCard } from "@/components/ViewerShell";

type TrendPoint = { cycleId: string; cycleName: string; n: number; average: number | null; protected: boolean };
type TrendQuestion = { questionText: string; points: TrendPoint[] };

// Same convention as ProtectedReportPanel.tsx: black bars by default, red
// only below this /5-normalized threshold.
const ATTENTION_THRESHOLD = 3.25;

/**
 * Cross-cycle question trend, shown below the current cycle's report.
 * Questions that were reworded between cycles simply don't appear here
 * until they've been asked the same way twice -- no "first asked this
 * cycle" label, this panel just stays quiet about questions with nothing
 * to compare yet (see plan: silent handling, not explicit UI).
 */
export function CycleTrendPanel({ mode = "admin" }: { mode?: "admin" | "viewer" }) {
  const [questions, setQuestions] = useState<TrendQuestion[] | null>(null);
  const [loading, setLoading] = useState(true);
  const ShellCard = mode === "viewer" ? ViewerCard : Card;

  useEffect(() => {
    let cancelled = false;
    fetch("/api/report/trend")
      .then((response) => response.json())
      .then((data: { ok?: boolean; questions?: TrendQuestion[] }) => {
        if (!cancelled && data.ok) setQuestions(data.questions ?? []);
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <ShellCard className="mt-[9px]">
        <SkeletonText lines={3} />
      </ShellCard>
    );
  }

  // Trend is supplementary to the main report -- if it failed to load, or
  // there's nothing comparable yet, just don't render the section at all
  // rather than showing an empty/error card under the real report.
  if (!questions || questions.length === 0) return null;

  return (
    <ShellCard className="mt-[9px]">
      <div className="mb-4">
        <h2 className="section-title flex items-center gap-2">
          <TrendingUp size={15} strokeWidth={1.8} /> Trend across cycles
        </h2>
        <p className="mt-1 secondary-text">Questions asked the same way across multiple surveys, oldest to newest.</p>
      </div>
      <div className="space-y-5">
        {questions.map((question) => (
          <div key={question.questionText}>
            <p className="mb-2 text-[13px] text-[var(--ink-mid)]">{question.questionText}</p>
            <div className="flex items-end gap-2">
              {question.points.map((point) => {
                if (point.protected || point.average === null) {
                  return (
                    <div
                      key={point.cycleId}
                      className="flex flex-col items-center gap-1"
                      title={`${point.cycleName}: hidden until the anonymity threshold is met`}
                    >
                      <div className="flex h-[52px] w-[22px] items-end justify-center rounded-[var(--radius-input)] bg-[var(--bg-active)]">
                        <EyeOff size={12} strokeWidth={1.8} className="mb-2 text-[var(--ink-faint)]" />
                      </div>
                      <span className="text-[10px] text-[var(--ink-faint)]">{point.cycleName}</span>
                    </div>
                  );
                }
                const attention = point.average < ATTENTION_THRESHOLD;
                const height = `${Math.max(6, Math.min(100, (point.average / 5) * 100))}%`;
                return (
                  <div key={point.cycleId} className="flex flex-col items-center gap-1" title={`${point.cycleName}: ${point.average.toFixed(2)}`}>
                    <div className="flex h-[52px] w-[22px] items-end rounded-[var(--radius-input)] bg-[var(--bg-active)]">
                      <div className="w-full rounded-[var(--radius-input)]" style={{ height, background: attention ? "var(--red)" : "var(--ink)" }} />
                    </div>
                    <span className="text-[10px] font-medium text-[var(--ink)]">{point.average.toFixed(1)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </ShellCard>
  );
}
