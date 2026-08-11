"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { SkeletonCard, SkeletonText } from "@/components/Skeleton";
import { SurveyStageTabs } from "@/components/SurveyStageTabs";
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
    <AppShell title={detail?.cycle.name ?? "Survey"} subtitle="Template and questions this survey was built with.">
      <div className="space-y-[9px]">
        <SurveyStageTabs active="Build" status={detail?.cycle.status} />

        {notFound ? (
          <div className="card text-center">
            <p className="secondary-text">This survey doesn&apos;t exist or you don&apos;t have access to it.</p>
            <button onClick={() => router.push("/app/surveys")} className="btn-secondary mt-4">
              <ArrowLeft size={14} strokeWidth={1.8} />
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
            <div className="card">
              <h2 className="section-title">Template</h2>
              <p className="mt-2 secondary-text">
                {detail.templateName ?? "Custom"} · {detail.questions.length} question{detail.questions.length === 1 ? "" : "s"} · Minimum group size {detail.cycle.minGroupSize}
              </p>
              <p className="mt-3 text-xs text-[var(--ink-faint)]">
                Questions are locked once a survey is created, so results stay comparable across the run. Start a new survey to change them.
              </p>
            </div>

            <div className="card">
              <h2 className="section-title">Questions</h2>
              <div className="mt-4 space-y-2">
                {detail.questions.length === 0 ? (
                  <SkeletonText lines={2} />
                ) : (
                  detail.questions
                    .slice()
                    .sort((a, b) => a.position - b.position)
                    .map((question) => (
                      <div key={question.id} className="rounded-[var(--radius-input)] border border-[var(--border)] bg-white p-3 text-[13px]">
                        {question.construct ? <div className="label-text">{question.construct}</div> : null}
                        <div className="mt-1 text-[var(--ink)]">{question.text}</div>
                      </div>
                    ))
                )}
              </div>
            </div>

            <div className="flex justify-between">
              <button onClick={() => router.push("/app/surveys")} className="btn-secondary">
                <ArrowLeft size={14} strokeWidth={1.8} />
                Back to surveys
              </button>
              <button onClick={() => router.push(`/app/${surveyId}/send`)} className="btn-primary">
                Next: Send survey
                <ArrowRight size={14} strokeWidth={1.8} />
              </button>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
