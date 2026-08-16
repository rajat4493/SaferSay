"use client";

import { useEffect, useState } from "react";
import { EyeOff, TrendingUp } from "lucide-react";
import { Card } from "@/components/AppShell";
import { SkeletonText } from "@/components/Skeleton";
import { ViewerCard } from "@/components/ViewerShell";

type TrendPoint = { cycleId: string; cycleName: string; cycleCreatedAt: string; n: number; average: number | null; protected: boolean };
type TrendQuestion = { questionText: string; points: TrendPoint[] };

// Same convention as ProtectedReportPanel.tsx: black bars by default, red
// only below this /5-normalized threshold.
const ATTENTION_THRESHOLD = 3.25;

const shortDate = (iso: string) => new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });

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

  // A cycle's name/date is constant across every question it appears in --
  // showing it once here instead of on every single bar (as before) is
  // what actually fixed the "cycle name repeated 8 times" clutter. Indexed
  // by cycleId, oldest first, deduped across questions (not every question
  // has a point for every cycle -- a reworded question can skip one).
  const legend = Array.from(
    questions
      .flatMap((question) => question.points)
      .reduce((map, point) => map.set(point.cycleId, point), new Map<string, TrendPoint>())
      .values(),
  ).sort((a, b) => new Date(a.cycleCreatedAt).getTime() - new Date(b.cycleCreatedAt).getTime());
  const legendIndex = new Map(legend.map((point, index) => [point.cycleId, index + 1]));

  return (
    <ShellCard className="mt-[9px]">
      <div className="mb-3">
        <h2 className="section-title flex items-center gap-2">
          <TrendingUp size={15} strokeWidth={1.8} /> Trend across cycles
        </h2>
        <p className="mt-1 secondary-text">Questions asked the same way across multiple surveys, oldest to newest.</p>
      </div>

      <div className="mb-4 flex flex-wrap gap-x-4 gap-y-1 border-b border-[var(--border)] pb-3 text-[11.5px] text-[var(--ink-mid)]">
        {legend.map((point, index) => (
          <span key={point.cycleId} className="inline-flex items-center gap-1.5">
            <span className="grid h-4 w-4 shrink-0 place-items-center rounded-full bg-[var(--bg-active)] text-[9.5px] font-semibold text-[var(--ink-mid)]">
              {index + 1}
            </span>
            {point.cycleName} · {shortDate(point.cycleCreatedAt)}
          </span>
        ))}
      </div>

      <div className="space-y-4">
        {questions.map((question) => (
          <div key={question.questionText}>
            <p className="mb-1.5 text-[13px] text-[var(--ink-mid)]">{question.questionText}</p>
            <div className="flex items-end gap-2.5">
              {question.points.map((point) => {
                const index = legendIndex.get(point.cycleId);
                const indexBadge = (
                  <span className="grid h-4 w-4 shrink-0 place-items-center rounded-full bg-[var(--bg-active)] text-[9.5px] font-semibold text-[var(--ink-mid)]">
                    {index}
                  </span>
                );
                if (point.protected || point.average === null) {
                  return (
                    <div
                      key={point.cycleId}
                      className="flex flex-col items-center gap-1"
                      title={`${index}. ${point.cycleName} (${shortDate(point.cycleCreatedAt)}): hidden until the anonymity threshold is met`}
                    >
                      <div className="flex h-[44px] w-[26px] items-end justify-center rounded-t-[6px] bg-[var(--bg-active)]">
                        <EyeOff size={12} strokeWidth={1.8} className="mb-2 text-[var(--ink-faint)]" />
                      </div>
                      {indexBadge}
                    </div>
                  );
                }
                const attention = point.average < ATTENTION_THRESHOLD;
                const height = `${Math.max(10, Math.min(100, (point.average / 5) * 100))}%`;
                return (
                  <div
                    key={point.cycleId}
                    className="flex flex-col items-center gap-1"
                    title={`${index}. ${point.cycleName} (${shortDate(point.cycleCreatedAt)}): ${point.average.toFixed(2)} (n=${point.n})`}
                  >
                    <div className="flex h-[44px] w-[26px] items-end rounded-t-[6px] bg-[var(--bg-active)]">
                      <div className="w-full rounded-t-[6px]" style={{ height, background: attention ? "var(--red)" : "var(--ink)" }} />
                    </div>
                    {indexBadge}
                    <span className="text-[10px] font-medium text-[var(--ink)]">
                      {point.average.toFixed(1)} <span className="font-normal text-[var(--ink-faint)]">n={point.n}</span>
                    </span>
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
