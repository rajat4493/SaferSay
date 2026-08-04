"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, Rocket, ShieldCheck } from "lucide-react";
import { surveyTemplates, type SurveyTemplate } from "@/lib/templates";

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
      setStatus("Include at least one question before creating the cycle.");
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
      setStatus(result.error ?? "Survey cycle could not be created.");
      return;
    }

    setStatus(
      `Draft cycle created. ${result.cycle.tokensIssued} secure respondent tokens issued and ${result.cycle.invitesPrepared ?? 0} delivery-safe invite links prepared.`,
    );
  }

  return (
    <div className="mt-5 rounded-3xl border border-[var(--brand-border)] bg-white/75 p-5">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-2 rounded-full bg-[var(--brand-accent-soft)] px-3 py-1 text-xs font-semibold text-[var(--brand-accent)]">
            <ShieldCheck size={14} />
            Server-side launch prep
          </div>
          <h2 className="mt-3 text-xl font-semibold">Create draft cycle</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--brand-muted)]">
            Creates a Supabase survey cycle from {template.name} and issues one secure token per active employee.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-[minmax(220px,1fr)_auto]">
          <input
            value={cycleName}
            onChange={(event) => setCycleName(event.target.value)}
            placeholder={`${template.name} - July pulse`}
            className="h-11 rounded-full border border-[var(--brand-border)] bg-white px-4 text-sm outline-none focus:border-[var(--brand-accent)]"
          />
          <button
            onClick={createCycle}
            disabled={submitting}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[var(--brand-ink)] px-5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Rocket size={16} />
            {submitting ? "Creating..." : "Create"}
          </button>
        </div>
      </div>

      <div className="mt-5 border-t border-[var(--brand-border)] pt-5">
        <h3 className="text-sm font-semibold">Customize questions ({includedCount} included)</h3>
        <p className="mt-1 text-xs text-[var(--brand-muted)]">
          Uncheck questions you don&apos;t need, edit wording, or reorder before creating the cycle. Leave everything as-is to use the
          template unchanged.
        </p>
        <div className="mt-3 space-y-2">
          {questions.map((question, index) => (
            <div
              key={question.id}
              className={`flex items-start gap-3 rounded-2xl border p-3 text-sm ${
                question.included ? "border-[var(--brand-border)] bg-white" : "border-[var(--brand-border)] bg-[var(--brand-bg)] opacity-60"
              }`}
            >
              <input
                type="checkbox"
                checked={question.included}
                onChange={() => toggleIncluded(index)}
                className="mt-1 h-4 w-4"
                aria-label={`Include question ${index + 1}`}
              />
              <div className="flex-1">
                <div className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--brand-muted)]">{question.construct}</div>
                <input
                  value={question.text}
                  onChange={(event) => editText(index, event.target.value)}
                  disabled={!question.included}
                  className="mt-1 w-full rounded-xl border border-transparent bg-transparent px-1 py-1 text-sm outline-none focus:border-[var(--brand-accent)] disabled:cursor-not-allowed"
                />
              </div>
              <div className="flex flex-col gap-1">
                <button
                  type="button"
                  onClick={() => move(index, -1)}
                  disabled={index === 0}
                  className="rounded-full border border-[var(--brand-border)] p-1 disabled:cursor-not-allowed disabled:opacity-30"
                  aria-label="Move question up"
                >
                  <ArrowUp size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => move(index, 1)}
                  disabled={index === questions.length - 1}
                  className="rounded-full border border-[var(--brand-border)] p-1 disabled:cursor-not-allowed disabled:opacity-30"
                  aria-label="Move question down"
                >
                  <ArrowDown size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {status ? <p className="mt-4 rounded-2xl bg-[var(--brand-bg)] p-3 text-sm font-semibold text-[var(--brand-muted)]">{status}</p> : null}
    </div>
  );
}
