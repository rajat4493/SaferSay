"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Pencil, Plus, Trash2, X } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { SkeletonCard, SkeletonText } from "@/components/Skeleton";
import { SurveyStageTabs } from "@/components/SurveyStageTabs";
import { useToast } from "@/components/ToastProvider";
import { QuestionOptionsEditor, type QuestionOption } from "@/components/QuestionOptionsEditor";
import { canRunSurvey } from "@/lib/permissions";
import type { UserRole } from "@/lib/server/repositories/types";

type ShowIf = { attribute: "team" | "location"; op: "eq" | "neq"; value: string } | null;
type QuestionType = "likert_5" | "enps_0_10" | "open_text" | "multiple_choice" | "ranking" | "matrix";

type CycleQuestion = {
  id: string;
  position: number;
  text: string;
  type: QuestionType;
  construct: string | null;
  optional: boolean;
  options: QuestionOption[] | null;
  showIf: ShowIf;
};

type CycleDetail = {
  cycle: { id: string; name: string; status: string; minGroupSize: number; createdAt: string };
  templateName: string | null;
  questions: CycleQuestion[];
};

type DraftQuestion = { text: string; type: QuestionType; construct: string | null; optional: boolean; options: QuestionOption[]; showIf: ShowIf };

const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  likert_5: "Rating scale (1-5)",
  enps_0_10: "eNPS scale (0-10)",
  open_text: "Open text",
  multiple_choice: "Multiple choice",
  ranking: "Ranking",
  matrix: "Matrix row",
};
const OPTION_TYPES: QuestionType[] = ["multiple_choice", "ranking", "matrix"];

// question_bank's type vocabulary is narrower than the cycle-question one
// ("scale" instead of a specific likert_5/enps_0_10) since a reusable bank
// question doesn't commit to a scale range until it's actually added to a
// cycle -- mapped to likert_5 on insert below, same as the type always
// meant when it was the only rating option.
type BankQuestionType = "scale" | "open_text" | "multiple_choice" | "ranking" | "matrix";
type BankQuestion = { id: string; construct: string | null; text: string; questionType: BankQuestionType; options: QuestionOption[] | null };

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
  const [bankQuestions, setBankQuestions] = useState<BankQuestion[]>([]);
  const [bankPickerValue, setBankPickerValue] = useState("");
  // Read-only roles (auditor, people_leader, compliance_reviewer) can view
  // this page but must never see the question-editing controls -- the
  // underlying PATCH already 403s them, but the button shouldn't render in
  // the first place, matching the same gating already applied on Results.
  const [canManage, setCanManage] = useState(false);

  useEffect(() => {
    fetch("/api/tenants/current")
      .then((response) => response.json())
      .then((data: { ok?: boolean; role?: UserRole }) => {
        if (data.ok && data.role) setCanManage(canRunSurvey(data.role));
      })
      .catch(() => undefined);
  }, []);

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

  useEffect(() => {
    fetch("/api/question-bank")
      .then((response) => response.json())
      .then((data: { ok?: boolean; questions?: BankQuestion[] }) => setBankQuestions(data.ok ? (data.questions ?? []) : []))
      .catch(() => undefined);
  }, []);

  function addFromBank() {
    const bankQuestion = bankQuestions.find((question) => question.id === bankPickerValue);
    if (!bankQuestion) return;
    const type: QuestionType = bankQuestion.questionType === "scale" ? "likert_5" : bankQuestion.questionType;
    setDraftQuestions((current) => [
      ...current,
      { text: bankQuestion.text, type, construct: bankQuestion.construct, optional: false, options: bankQuestion.options ?? [], showIf: null },
    ]);
    setBankPickerValue("");
  }

  function startEditing() {
    if (!detail) return;
    setDraftQuestions(
      detail.questions
        .slice()
        .sort((a, b) => a.position - b.position)
        .map((question) => ({
          text: question.text,
          type: question.type,
          construct: question.construct,
          optional: question.optional,
          options: question.options ?? [],
          showIf: question.showIf,
        })),
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

  function editDraftType(index: number, type: QuestionType) {
    setDraftQuestions((current) =>
      current.map((question, i) => (i === index ? { ...question, type, options: OPTION_TYPES.includes(type) ? question.options : [] } : question)),
    );
  }

  function editDraftShowIf(index: number, showIf: ShowIf) {
    setDraftQuestions((current) => current.map((question, i) => (i === index ? { ...question, showIf } : question)));
  }

  function setDraftOptions(index: number, options: QuestionOption[]) {
    setDraftQuestions((current) => current.map((question, i) => (i === index ? { ...question, options } : question)));
  }

  function removeDraft(index: number) {
    setDraftQuestions((current) => current.filter((_, i) => i !== index));
  }

  function addDraft() {
    setDraftQuestions((current) => [...current, { text: "", type: "likert_5", construct: null, optional: false, options: [], showIf: null }]);
  }

  async function saveQuestions() {
    const questions = draftQuestions.map((question) => ({ ...question, text: question.text.trim() })).filter((question) => question.text.length > 0);
    if (questions.length === 0) {
      toast.show({ variant: "error", message: "A survey needs at least one question." });
      return;
    }
    if (questions.some((question) => OPTION_TYPES.includes(question.type) && question.options.filter((option) => option.label.trim()).length < 2)) {
      toast.show({ variant: "error", message: "Multiple choice, ranking, and matrix questions need at least two options." });
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(`/api/cycles/${surveyId}/questions`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ questions: questions.map((question) => ({ ...question, options: question.options.filter((option) => option.label.trim()) })) }),
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
      <div className="space-y-[22px]">
        <SurveyStageTabs active="Build" status={detail?.cycle.status} />

        {notFound ? (
          <div className="card text-center">
            <p className="secondary-text">This survey doesn&apos;t exist or you don&apos;t have access to it.</p>
            <button onClick={() => router.push("/app")} className="btn-secondary mt-4">
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
                {canManage && detail.cycle.status === "draft" && !editing ? (
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
                      <div key={index} className="rounded-[var(--radius-input)] border border-[var(--border)] bg-white p-3 text-sm">
                        <div className="flex items-start gap-3">
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

                        <div className="mt-2 flex flex-wrap items-center gap-2 pl-1">
                          <select
                            value={question.type}
                            onChange={(event) => editDraftType(index, event.target.value as QuestionType)}
                            aria-label={`Question ${index + 1} type`}
                            className="admin-input h-8 w-auto text-xs"
                          >
                            {Object.entries(QUESTION_TYPE_LABELS).map(([value, label]) => (
                              <option key={value} value={value}>
                                {label}
                              </option>
                            ))}
                          </select>

                          <ShowIfPicker value={question.showIf} onChange={(showIf) => editDraftShowIf(index, showIf)} />
                        </div>

                        {OPTION_TYPES.includes(question.type) ? (
                          <QuestionOptionsEditor options={question.options} onChange={(options) => setDraftOptions(index, options)} idPrefix={`Question ${index + 1}`} />
                        ) : null}
                      </div>
                    ))}
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <button onClick={addDraft} className="btn-secondary px-3 py-1.5 text-xs">
                      <Plus size={13} strokeWidth={1.8} />
                      Add question
                    </button>
                    {bankQuestions.length > 0 ? (
                      <>
                        <select value={bankPickerValue} onChange={(e) => setBankPickerValue(e.target.value)} aria-label="Add from question bank" className="admin-input h-8 w-auto text-xs">
                          <option value="">Add from bank...</option>
                          {bankQuestions.map((question) => (
                            <option key={question.id} value={question.id}>
                              {question.text}
                            </option>
                          ))}
                        </select>
                        <button onClick={addFromBank} disabled={!bankPickerValue} className="btn-secondary px-3 py-1.5 text-xs disabled:cursor-not-allowed disabled:opacity-40">
                          Add
                        </button>
                      </>
                    ) : null}
                  </div>

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
                          <div className="mt-1 text-xs text-[var(--ink-faint)]">
                            {QUESTION_TYPE_LABELS[question.type]}
                            {question.options?.length ? ` · ${question.options.length} options` : ""}
                            {question.showIf ? ` · Shown only if ${question.showIf.attribute} ${question.showIf.op === "eq" ? "is" : "isn't"} "${question.showIf.value}"` : ""}
                          </div>
                        </div>
                      ))
                  )}
                </div>
              )}
            </div>

            <div className="flex justify-between">
              <button onClick={() => router.push("/app")} className="btn-secondary">
                <ArrowLeft size={14} strokeWidth={1.8} />
                Back to surveys
              </button>
              <button onClick={() => router.push(`/app/${surveyId}/${detail.cycle.status === "closed" ? "results" : "send"}`)} className="btn-primary">
                {detail.cycle.status === "closed" ? "View results" : "Next: Send survey"}
                <ArrowRight size={14} strokeWidth={1.8} />
              </button>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}

/**
 * Structural-only skip-logic picker: team/location only, never a prior
 * answer -- the dropdown itself is the UI-side half of the Option-B
 * restriction the /api/cycles/[id]/questions PATCH handler enforces
 * server-side. "Show to everyone" is the default and clears the condition.
 */
function ShowIfPicker({ value, onChange }: { value: ShowIf; onChange: (value: ShowIf) => void }) {
  const enabled = value !== null;
  return (
    <div className="flex items-center gap-1.5">
      <select
        value={enabled ? value.attribute : "everyone"}
        onChange={(event) => {
          const attribute = event.target.value;
          onChange(attribute === "everyone" ? null : { attribute: attribute as "team" | "location", op: "eq", value: value?.value ?? "" });
        }}
        aria-label="Show this question to"
        className="admin-input h-8 w-auto text-xs"
      >
        <option value="everyone">Show to everyone</option>
        <option value="team">Only if team is...</option>
        <option value="location">Only if location is...</option>
      </select>
      {enabled ? (
        <input
          value={value.value}
          onChange={(event) => onChange({ ...value, value: event.target.value })}
          placeholder={value.attribute === "team" ? "e.g. Engineering" : "e.g. Remote"}
          aria-label={`${value.attribute} value`}
          className="admin-input h-8 w-32 text-xs"
        />
      ) : null}
    </div>
  );
}
