"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Pencil, Plus, Trash2, X } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { SkeletonCard, SkeletonText } from "@/components/Skeleton";
import { SurveyStageTabs } from "@/components/SurveyStageTabs";
import { useToast } from "@/components/ToastProvider";

type CycleQuestion = { id: string; position: number; text: string; type: string; construct: string | null; optional: boolean };

type CycleDetail = {
  cycle: { id: string; name: string; status: string; minGroupSize: number; createdAt: string };
  templateName: string | null;
  questions: CycleQuestion[];
};

type DraftQuestion = { text: string; type: string; construct: string | null; optional: boolean };

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
  const [editing, setEditing] = useState(false);
  const [draftQuestions, setDraftQuestions] = useState<DraftQuestion[]>([]);
  const [saving, setSaving] = useState(false);

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

  function startEditing() {
    if (!detail) return;
    setDraftQuestions(
      detail.questions
        .slice()
        .sort((a, b) => a.position - b.position)
        .map((question) => ({ text: question.text, type: question.type, construct: question.construct, optional: question.optional })),
    );
    setEditing(true);
  }

  function moveDraft(index: number, direction: -1 | 1) {
    setDraftQuestions((current) => {
      const next = [...current];
      const target = index + direction;
      if (target < 0 || target >= next.length) return current;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function editDraftText(index: number, text: string) {
    setDraftQuestions((current) => current.map((question, i) => (i === index ? { ...question, text } : question)));
  }

  function removeDraft(index: number) {
    setDraftQuestions((current) => current.filter((_, i) => i !== index));
  }

  function addDraft() {
    setDraftQuestions((current) => [...current, { text: "", type: "likert_5", construct: null, optional: false }]);
  }

  async function saveQuestions() {
    const questions = draftQuestions.map((question) => ({ ...question, text: question.text.trim() })).filter((question) => question.text.length > 0);
    if (questions.length === 0) {
      toast.show({ variant: "error", message: "A survey needs at least one question." });
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(`/api/cycles/${surveyId}/questions`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ questions }),
      });
      const result = (await response.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!response.ok || !result.ok) {
        toast.show({ variant: "error", message: result.error ?? "Couldn't save those changes." });
        return;
      }
      setDetail((current) =>
        current
          ? { ...current, questions: questions.map((question, index) => ({ id: `draft-${index}`, position: index + 1, ...question })) }
          : current,
      );
      setEditing(false);
      toast.show({ variant: "success", message: "Questions updated." });
    } catch {
      toast.show({ variant: "error", message: "Couldn't save those changes. Try again." });
    } finally {
      setSaving(false);
    }
  }

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
                {detail.cycle.status === "draft"
                  ? "Questions can be edited while this survey is still a draft. Once it's sent, they lock so results stay comparable across the run."
                  : "Questions are locked because this survey has been sent, so results stay comparable across the run. Start a new survey to change them."}
              </p>
            </div>

            <div className="card">
              <div className="flex items-center justify-between gap-3">
                <h2 className="section-title">Questions</h2>
                {detail.cycle.status === "draft" && !editing ? (
                  <button onClick={startEditing} className="btn-secondary px-3 py-1.5 text-xs">
                    <Pencil size={13} strokeWidth={1.8} />
                    Edit questions
                  </button>
                ) : null}
              </div>

              {editing ? (
                <div className="mt-4">
                  <div className="space-y-2">
                    {draftQuestions.map((question, index) => (
                      <div key={index} className="flex items-start gap-3 rounded-[var(--radius-input)] border border-[var(--border)] bg-white p-3 text-sm">
                        <div className="flex-1">
                          {question.construct ? <div className="label-text">{question.construct}</div> : null}
                          <input
                            value={question.text}
                            onChange={(event) => editDraftText(index, event.target.value)}
                            aria-label={`Question ${index + 1} text`}
                            className="mt-1 w-full rounded-[var(--radius-input)] border border-transparent bg-transparent px-1 py-1 text-[14px] text-[var(--ink)] outline-none focus:border-[var(--border)]"
                          />
                        </div>
                        <div className="flex flex-col gap-1">
                          <button
                            type="button"
                            onClick={() => moveDraft(index, -1)}
                            disabled={index === 0}
                            className="rounded-[var(--radius-input)] border border-[var(--border)] p-1 text-[var(--ink-mid)] hover:bg-[var(--bg-hover)] disabled:cursor-not-allowed disabled:opacity-30"
                            aria-label="Move question up"
                          >
                            <ArrowUp size={13} strokeWidth={1.8} />
                          </button>
                          <button
                            type="button"
                            onClick={() => moveDraft(index, 1)}
                            disabled={index === draftQuestions.length - 1}
                            className="rounded-[var(--radius-input)] border border-[var(--border)] p-1 text-[var(--ink-mid)] hover:bg-[var(--bg-hover)] disabled:cursor-not-allowed disabled:opacity-30"
                            aria-label="Move question down"
                          >
                            <ArrowDown size={13} strokeWidth={1.8} />
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeDraft(index)}
                          disabled={draftQuestions.length <= 1}
                          className="rounded-[var(--radius-input)] border border-[var(--border)] p-1 text-[var(--red)] hover:bg-[var(--red-bg)] disabled:cursor-not-allowed disabled:opacity-30"
                          aria-label="Remove question"
                        >
                          <Trash2 size={13} strokeWidth={1.8} />
                        </button>
                      </div>
                    ))}
                  </div>

                  <button onClick={addDraft} className="btn-secondary mt-3 px-3 py-1.5 text-xs">
                    <Plus size={13} strokeWidth={1.8} />
                    Add question
                  </button>

                  <div className="mt-4 flex items-center gap-2">
                    <button onClick={saveQuestions} disabled={saving} className="btn-primary px-4 py-2 text-sm">
                      {saving ? "Saving..." : "Save changes"}
                    </button>
                    <button onClick={() => setEditing(false)} disabled={saving} className="btn-secondary px-4 py-2 text-sm">
                      <X size={13} strokeWidth={1.8} />
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
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
              )}
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
