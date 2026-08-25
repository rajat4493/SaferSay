"use client";

import { useEffect, useState } from "react";
import { TrendingUp } from "lucide-react";
import { Card } from "@/components/AppShell";
import { QuestionTrendLine, type TrendLinePoint } from "@/components/QuestionTrendLine";
import { getScoreTier } from "@/lib/scoreTier";
import { SkeletonText } from "@/components/Skeleton";
import { ViewerCard } from "@/components/ViewerShell";

type TrendPoint = {
  cycleId: string;
  cycleName: string;
  cycleCreatedAt: string;
  n: number;
  average: number | null;
  protected: boolean;
  scaleMax?: 5 | 10;
};
type TrendQuestion = { questionText: string; points: TrendPoint[] };

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

      <div className="space-y-5">
        {questions.map((question) => {
          // Normalized to /10 via each point's own scaleMax (5 for
          // likert_5, 10 for enps_0_10) -- fixes the panel's old hardcoded
          // /5 math, which mis-scaled enps_0_10 questions, and puts every
          // question on the same visual scale so heights are actually
          // comparable across the whole list.
          const linePoints: TrendLinePoint[] = question.points.map((point) => {
            const index = legendIndex.get(point.cycleId);
            if (point.protected || point.average === null) {
              return {
                value10: null,
                protected: true,
                title: `${index}. ${point.cycleName} (${shortDate(point.cycleCreatedAt)}): hidden until the anonymity threshold is met`,
              };
            }
            return {
              value10: (point.average / (point.scaleMax ?? 5)) * 10,
              protected: false,
              title: `${index}. ${point.cycleName} (${shortDate(point.cycleCreatedAt)}): ${point.average.toFixed(2)} (n=${point.n})`,
            };
          });
          const lastReal = [...linePoints].reverse().find((p) => p.value10 !== null);
          const tier = getScoreTier(lastReal?.value10 ?? 0);
          return (
            <div key={question.questionText}>
              <p className="mb-1.5 text-[13px] text-[var(--ink-mid)]">{question.questionText}</p>
              <QuestionTrendLine points={linePoints} color={lastReal ? tier.text : "var(--ink-faint)"} />
            </div>
          );
        })}
      </div>
    </ShellCard>
  );
}
