"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, ChevronRight } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { SkeletonCard, SkeletonText } from "@/components/Skeleton";
import { SurveyStatusBadge } from "@/components/SurveyStatusBadge";
import { useToast } from "@/components/ToastProvider";

type CycleDetail = {
  cycle: { id: string; name: string; status: string; minGroupSize: number; createdAt: string };
  templateName: string | null;
  questions: Array<{ id: string; position: number; text: string; type: string; construct: string | null; optional: boolean }>;
};

export default function SurveyBuildPage() {
  const params = useParams();
  const surveyId = params.surveyId as string;
  // Keying by surveyId gives each survey its own fresh component instance,
  // so switching surveys resets `detail`/`notFound` by remounting instead
  // of setState calls at the top of an effect (avoids the extra render
  // pass react-hooks/set-state-in-effect flags).
  return <SurveyBuildContent key={surveyId} surveyId={surveyId} />;
}

function SurveyBuildContent({ surveyId }: { surveyId: string }) {
  const router = useRouter();
  const toast = useToast();
  const [detail, setDetail] = useState<CycleDetail | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    fetch(`/api/cycles/${surveyId}`)
      .then((response) => response.json())
      .then((data: { ok?: boolean; error?: string } & Partial<CycleDetail>) => {
        if (data.ok && data.cycle) {
          setDetail({ cycle: data.cycle, templateName: data.templateName ?? null, questions: data.questions ?? [] });
        } else {
          setNotFound(true);
          toast.show({ variant: "error", message: data.error ?? "That survey couldn't be found." });
        }
      })
      .catch(() => {
        setNotFound(true);
        toast.show({ variant: "error", message: "Couldn't load that survey." });
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [surveyId]);

  return (
    <AppShell
      title={detail?.cycle.name ?? "Survey"}
      subtitle="Template and questions this survey was built with."
    >
      <div className="space-y-6">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <div className="flex items-center gap-2 rounded-[var(--radius-pill)] bg-[var(--brand-accent-soft)] px-3 py-1 font-semibold text-[var(--brand-accent)]">
            Stage 1 of 3
          </div>
          {detail ? <SurveyStatusBadge status={detail.cycle.status} /> : null}
          <ChevronRight size={16} className="text-[var(--brand-muted)]" />
          <span className="font-semibold text-[var(--brand-accent)]">Build</span>
          <ChevronRight size={16} className="text-[var(--brand-muted)]" />
          <span className="text-[var(--brand-muted)]">Send</span>
          <ChevronRight size={16} className="text-[var(--brand-muted)]" />
          <span className="text-[var(--brand-muted)]">Results</span>
        </div>

        {notFound ? (
          <div className="rounded-[var(--radius-card)] border border-[var(--brand-glass-border)] bg-[var(--brand-glass-strong)] p-6 text-center shadow-[var(--shadow-soft)]">
            <p className="text-sm text-[var(--brand-muted)]">This survey doesn&apos;t exist or you don&apos;t have access to it.</p>
            <button
              onClick={() => router.push("/app")}
              className="mt-4 inline-flex items-center gap-2 rounded-[var(--radius-button)] border border-[var(--brand-line)] px-5 py-2 text-sm font-semibold transition hover:bg-[var(--brand-line-soft)]"
            >
              <ArrowLeft size={16} />
              Back to surveys
            </button>
          </div>
        ) : !detail ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : (
          <>
            <div className="rounded-[var(--radius-card)] border border-[var(--brand-glass-border)] bg-[var(--brand-glass-strong)] p-6 shadow-[var(--shadow-soft)] backdrop-blur-xl">
              <h2 className="text-lg font-semibold">Template</h2>
              <p className="mt-2 text-sm text-[var(--brand-muted)]">
                {detail.templateName ?? "Custom"} · {detail.questions.length} question{detail.questions.length === 1 ? "" : "s"} · Minimum group size {detail.cycle.minGroupSize}
              </p>
              <p className="mt-3 text-xs text-[var(--brand-ink-faint)]">
                Questions are locked once a survey is created, so results stay comparable across the run. Start a new survey to change them.
              </p>
            </div>

            <div className="rounded-[var(--radius-card)] border border-[var(--brand-glass-border)] bg-[var(--brand-glass-strong)] p-6 shadow-[var(--shadow-soft)] backdrop-blur-xl">
              <h2 className="text-lg font-semibold">Questions</h2>
              <div className="mt-4 space-y-2">
                {detail.questions.length === 0 ? (
                  <SkeletonText lines={2} />
                ) : (
                  detail.questions
                    .slice()
                    .sort((a, b) => a.position - b.position)
                    .map((question) => (
                      <div key={question.id} className="rounded-[var(--radius-input)] border border-[var(--brand-border)] bg-white p-3 text-sm">
                        {question.construct ? (
                          <div className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--brand-muted)]">{question.construct}</div>
                        ) : null}
                        <div className="mt-1">{question.text}</div>
                      </div>
                    ))
                )}
              </div>
            </div>

            <div className="flex justify-between">
              <button
                onClick={() => router.push("/app")}
                className="inline-flex items-center gap-2 rounded-[var(--radius-button)] border border-[var(--brand-line)] px-5 py-2 text-sm font-semibold text-[var(--brand-ink)] transition hover:bg-[var(--brand-line-soft)]"
              >
                <ArrowLeft size={16} />
                Back to surveys
              </button>
              <button
                onClick={() => router.push(`/app/${surveyId}/send`)}
                className="inline-flex items-center gap-2 rounded-[var(--radius-button)] bg-[var(--brand-accent)] px-5 py-2 text-sm font-semibold text-white transition hover:bg-[var(--brand-accent-deep)]"
              >
                Next: Send survey
                <ArrowRight size={16} />
              </button>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
