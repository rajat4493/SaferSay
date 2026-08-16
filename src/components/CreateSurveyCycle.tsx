"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp } from "lucide-react";
import { surveyTemplates, type SurveyTemplate } from "@/lib/templates";
import { useToast } from "@/components/ToastProvider";

type EditableQuestion = SurveyTemplate["questions"][number] & { included: boolean };

function toEditable(template: SurveyTemplate): EditableQuestion[] {
  return template.questions.map((question) => ({ ...question, included: true }));
}

function hasCustomizations(template: SurveyTemplate, questions: EditableQuestion[]) {
  const active = questions.filter((question) => question.included);
  if (active.length !== template.questions.length) return true;
  return active.some((question, index) => {
    const original = template.questions[index];
    return !original || question.id !== original.id || question.text !== original.text;
  });
}

export function CreateSurveyCycle({ templateSlug }: { templateSlug: string }) {
  const template = surveyTemplates.find((item) => item.slug === templateSlug) ?? surveyTemplates[0];
  const [questions, setQuestions] = useState<EditableQuestion[]>(() => toEditable(template));
  const [cycleName, setCycleName] = useState("");
  const [status, setStatus] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();
  const toast = useToast();

  function toggleIncluded(index: number) {
    setQuestions((current) => current.map((question, i) => (i === index ? { ...question, included: !question.included } : question)));
  }

  function editText(index: number, text: string) {
    setQuestions((current) => current.map((question, i) => (i === index ? { ...question, text } : question)));
  }

  function move(index: number, direction: -1 | 1) {
    setQuestions((current) => {
      const next = [...current];
      const target = index + direction;
      if (target < 0 || target >= next.length) return current;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  const includedCount = questions.filter((question) => question.included).length;

  async function createCycle() {
    if (includedCount === 0) {
      const message = "Include at least one question before creating the cycle.";
      setStatus(message);
      toast.show({ variant: "error", message });
      return;
    }

    setSubmitting(true);
    setStatus("");

    const customized = hasCustomizations(template, questions);
    const body: Record<string, unknown> = { templateSlug, cycleName };
    if (customized) {
      body.questions = questions
        .filter((question) => question.included)
        .map((question) => ({
          text: question.text,
          type: question.type,
          construct: question.construct,
          optional: question.optional,
        }));
    }

    const response = await fetch("/api/cycles/create", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const result = (await response.json().catch(() => ({}))) as {
      cycle?: { cycleId: string; employees: number; tokensIssued: number; invitesPrepared?: number };
      error?: string;
    };
    setSubmitting(false);

    if (!response.ok || !result.cycle) {
      const message = result.error ?? "Survey could not be created.";
      setStatus(message);
      toast.show({ variant: "error", message });
      return;
    }

    toast.show({ variant: "success", message: `Survey created. ${result.cycle.tokensIssued} secure invite links prepared.` });
    router.push(`/app/${result.cycle.cycleId}/send`);
  }

  return (
    <div className="card mt-[9px]">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div className="max-w-2xl">
          <p className="meta-label">Launch</p>
          <h2 className="section-title mt-2">Create draft cycle</h2>
          <p className="mt-1.5 secondary-text">
            Creates a survey cycle from {template.name} and issues one secure token per active employee.
          </p>
        </div>
        <div className="grid gap-2 sm:grid-cols-[minmax(220px,1fr)_auto]">
          <input
            value={cycleName}
            onChange={(event) => setCycleName(event.target.value)}
            placeholder={`${template.name} - July pulse`}
            aria-label="Survey cycle name"
            className="admin-input"
          />
          <button onClick={createCycle} disabled={submitting} className="btn-primary">
            {submitting ? "Creating..." : "Create"}
          </button>
        </div>
      </div>

      <div className="mt-5 border-t border-[var(--border)] pt-5">
        <h3 className="text-[14px] font-medium text-[var(--ink)]">Customize questions ({includedCount} included)</h3>
        <p className="mt-1 secondary-text">
          Uncheck questions you don&apos;t need, edit wording, or reorder before creating the cycle. Leave everything as-is to use the
          template unchanged.
        </p>
        <div className="mt-3 space-y-2">
          {questions.map((question, index) => (
            <div
              key={question.id}
              className={`flex items-start gap-3 rounded-[var(--radius-input)] border p-3 text-sm ${
                question.included ? "border-[var(--border)] bg-white" : "border-[var(--border)] bg-[var(--bg)] opacity-60"
              }`}
            >
              <input type="checkbox" checked={question.included} onChange={() => toggleIncluded(index)} className="mt-1 h-4 w-4" aria-label={`Include question ${index + 1}`} />
              <div className="flex-1">
                <div className="label-text">{question.construct}</div>
                <input
                  value={question.text}
                  onChange={(event) => editText(index, event.target.value)}
                  disabled={!question.included}
                  className="mt-1 w-full rounded-[var(--radius-input)] border border-transparent bg-transparent px-1 py-1 text-[14px] text-[var(--ink)] outline-none focus:border-[var(--border)] disabled:cursor-not-allowed"
                />
              </div>
              <div className="flex flex-col gap-1">
                <button
                  type="button"
                  onClick={() => move(index, -1)}
                  disabled={index === 0}
                  className="rounded-[var(--radius-input)] border border-[var(--border)] p-1 text-[var(--ink-mid)] hover:bg-[var(--bg-hover)] disabled:cursor-not-allowed disabled:opacity-30"
                  aria-label="Move question up"
                >
                  <ArrowUp size={13} strokeWidth={1.8} />
                </button>
                <button
                  type="button"
                  onClick={() => move(index, 1)}
                  disabled={index === questions.length - 1}
                  className="rounded-[var(--radius-input)] border border-[var(--border)] p-1 text-[var(--ink-mid)] hover:bg-[var(--bg-hover)] disabled:cursor-not-allowed disabled:opacity-30"
                  aria-label="Move question down"
                >
                  <ArrowDown size={13} strokeWidth={1.8} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {status ? <p className="mt-4 rounded-[var(--radius-input)] bg-[var(--bg)] p-3 secondary-text font-medium">{status}</p> : null}
    </div>
  );
}
