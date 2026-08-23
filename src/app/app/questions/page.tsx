"use client";

import { useEffect, useState } from "react";
import { Library, Plus, Trash2 } from "lucide-react";
import { AppShell, Card } from "@/components/AppShell";
import { SkeletonText } from "@/components/Skeleton";
import { useToast } from "@/components/ToastProvider";
import { QuestionOptionsEditor, type QuestionOption } from "@/components/QuestionOptionsEditor";

type QuestionType = "scale" | "open_text" | "multiple_choice" | "ranking" | "matrix";
type BankQuestion = { id: string; construct: string | null; text: string; questionType: QuestionType; options: QuestionOption[] | null };

const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  scale: "Rating scale",
  open_text: "Open text",
  multiple_choice: "Multiple choice",
  ranking: "Ranking",
  matrix: "Matrix row",
};
const OPTION_TYPES: QuestionType[] = ["multiple_choice", "ranking", "matrix"];

export default function QuestionBankPage() {
  const toast = useToast();
  const [questions, setQuestions] = useState<BankQuestion[] | null>(null);
  const [draftText, setDraftText] = useState("");
  const [draftConstruct, setDraftConstruct] = useState("");
  const [draftType, setDraftType] = useState<QuestionType>("scale");
  const [draftOptions, setDraftOptions] = useState<QuestionOption[]>([]);
  const [saving, setSaving] = useState(false);

  function load() {
    fetch("/api/question-bank")
      .then((response) => response.json())
      .then((data: { ok?: boolean; questions?: BankQuestion[] }) => setQuestions(data.ok ? (data.questions ?? []) : []))
      .catch(() => setQuestions([]));
  }

  useEffect(load, []);

  async function addQuestion() {
    const text = draftText.trim();
    if (!text) return;
    if (OPTION_TYPES.includes(draftType) && draftOptions.filter((option) => option.label.trim()).length < 2) {
      toast.show({ variant: "error", message: "Multiple choice, ranking, and matrix questions need at least two options." });
      return;
    }

    setSaving(true);
    try {
      const response = await fetch("/api/question-bank", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          text,
          construct: draftConstruct.trim() || undefined,
          questionType: draftType,
          options: OPTION_TYPES.includes(draftType) ? draftOptions.filter((option) => option.label.trim()) : undefined,
        }),
      });
      const data = (await response.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!data.ok) {
        toast.show({ variant: "error", message: data.error ?? "Couldn't save that question." });
        return;
      }
      setDraftText("");
      setDraftConstruct("");
      setDraftType("scale");
      setDraftOptions([]);
      load();
      toast.show({ variant: "success", message: "Added to your question bank." });
    } finally {
      setSaving(false);
    }
  }

  async function archiveQuestion(id: string) {
    await fetch(`/api/question-bank?id=${id}`, { method: "DELETE" });
    load();
  }

  return (
    <AppShell title="Question bank" subtitle="Reusable questions you can add to any survey instead of retyping them each cycle.">
      <Card>
        <h2 className="section-title">Add a question</h2>
        <div className="mt-4 grid gap-3 max-w-lg">
          <input
            value={draftText}
            onChange={(e) => setDraftText(e.target.value)}
            placeholder="Question text"
            aria-label="Question text"
            className="admin-input normal-case"
          />
          <input
            value={draftConstruct}
            onChange={(e) => setDraftConstruct(e.target.value)}
            placeholder="Construct (optional, e.g. Trust)"
            aria-label="Construct"
            className="admin-input normal-case"
          />
          <select value={draftType} onChange={(e) => setDraftType(e.target.value as QuestionType)} aria-label="Question type" className="admin-input normal-case">
            {Object.entries(QUESTION_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          {OPTION_TYPES.includes(draftType) ? (
            <QuestionOptionsEditor options={draftOptions} onChange={setDraftOptions} idPrefix="New question" />
          ) : null}
          <button onClick={addQuestion} disabled={saving || !draftText.trim()} className="btn-primary justify-center">
            <Plus size={14} strokeWidth={1.8} />
            {saving ? "Adding..." : "Add to bank"}
          </button>
        </div>
      </Card>

      <Card className="mt-[9px]">
        <h2 className="section-title">Your questions</h2>
        {questions === null ? (
          <div className="mt-4">
            <SkeletonText lines={3} />
          </div>
        ) : questions.length === 0 ? (
          <div className="mt-6 flex flex-col items-center gap-2 py-6 text-center">
            <Library size={22} strokeWidth={1.6} className="text-[var(--ink-faint)]" />
            <p className="secondary-text">No questions saved yet. Add one above to reuse it across surveys.</p>
          </div>
        ) : (
          <div className="mt-4 space-y-2">
            {questions.map((question) => (
              <div key={question.id} className="flex items-start justify-between gap-3 rounded-[var(--radius-input)] border border-[var(--border)] bg-white p-3 text-[13px]">
                <div>
                  {question.construct ? <div className="label-text">{question.construct}</div> : null}
                  <div className="mt-1 text-[var(--ink)]">{question.text}</div>
                  <div className="mt-1 text-xs text-[var(--ink-faint)]">
                    {QUESTION_TYPE_LABELS[question.questionType]}
                    {question.options?.length ? ` · ${question.options.length} options` : ""}
                  </div>
                </div>
                <button
                  onClick={() => archiveQuestion(question.id)}
                  className="shrink-0 rounded-[var(--radius-input)] border border-[var(--border)] p-1.5 text-[var(--red)] hover:bg-[var(--red-bg)]"
                  aria-label={`Remove ${question.text}`}
                >
                  <Trash2 size={13} strokeWidth={1.8} />
                </button>
              </div>
            ))}
          </div>
        )}
      </Card>
    </AppShell>
  );
}
