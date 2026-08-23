"use client";

import { Plus, Trash2 } from "lucide-react";

export type QuestionOption = { key: string; label: string };

export function randomOptionKey() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : Math.random().toString(36).slice(2);
}

/**
 * Shared option-list editor for multiple_choice/ranking/matrix questions --
 * used by both the survey builder's draft-question editor
 * (src/app/app/[surveyId]/page.tsx) and the question-bank management
 * screen (src/app/app/questions/page.tsx), so the two don't drift into
 * two slightly different editing experiences for the same concept.
 */
export function QuestionOptionsEditor({
  options,
  onChange,
  idPrefix,
}: {
  options: QuestionOption[];
  onChange: (next: QuestionOption[]) => void;
  idPrefix: string;
}) {
  function addOption() {
    onChange([...options, { key: randomOptionKey(), label: "" }]);
  }

  function editLabel(index: number, label: string) {
    onChange(options.map((option, i) => (i === index ? { ...option, label } : option)));
  }

  function removeOption(index: number) {
    onChange(options.filter((_, i) => i !== index));
  }

  return (
    <div className="mt-2 space-y-1.5 pl-1">
      {options.map((option, index) => (
        <div key={option.key} className="flex items-center gap-2">
          <input
            value={option.label}
            onChange={(event) => editLabel(index, event.target.value)}
            placeholder={`Option ${index + 1}`}
            aria-label={`${idPrefix} option ${index + 1}`}
            className="admin-input h-8 flex-1 text-xs"
          />
          <button
            type="button"
            onClick={() => removeOption(index)}
            className="rounded-[var(--radius-input)] border border-[var(--border)] p-1 text-[var(--red)] hover:bg-[var(--red-bg)]"
            aria-label={`Remove ${idPrefix} option ${index + 1}`}
          >
            <Trash2 size={12} strokeWidth={1.8} />
          </button>
        </div>
      ))}
      <button type="button" onClick={addOption} className="btn-secondary px-2.5 py-1 text-xs">
        <Plus size={12} strokeWidth={1.8} />
        Add option
      </button>
    </div>
  );
}
