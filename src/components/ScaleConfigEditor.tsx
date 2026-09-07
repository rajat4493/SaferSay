"use client";

import type { ScaleConfig } from "@/lib/scaleRange";

/**
 * Editor for a "scale"-type question's configured range + optional anchor
 * labels -- min/max are validated again server-side (parseScaleConfig in
 * the questions API route) before ever being stored, this is just the UI.
 * Mirrors QuestionOptionsEditor's shape/placement for multiple_choice etc.
 */
export function ScaleConfigEditor({
  scale,
  onChange,
  idPrefix,
}: {
  scale: ScaleConfig;
  onChange: (next: ScaleConfig) => void;
  idPrefix: string;
}) {
  return (
    <div className="mt-2 space-y-2 pl-1">
      <div className="flex items-center gap-2">
        <label className="text-xs text-[var(--ink-mid)]" htmlFor={`${idPrefix}-scale-min`}>
          Min
        </label>
        <input
          id={`${idPrefix}-scale-min`}
          type="number"
          value={scale.min}
          onChange={(event) => onChange({ ...scale, min: Number(event.target.value) })}
          aria-label={`${idPrefix} scale minimum`}
          className="admin-input h-8 w-20 text-xs"
        />
        <label className="text-xs text-[var(--ink-mid)]" htmlFor={`${idPrefix}-scale-max`}>
          Max
        </label>
        <input
          id={`${idPrefix}-scale-max`}
          type="number"
          value={scale.max}
          onChange={(event) => onChange({ ...scale, max: Number(event.target.value) })}
          aria-label={`${idPrefix} scale maximum`}
          className="admin-input h-8 w-20 text-xs"
        />
      </div>
      <div className="flex items-center gap-2">
        <input
          value={scale.lowLabel ?? ""}
          onChange={(event) => onChange({ ...scale, lowLabel: event.target.value })}
          placeholder={`Label for ${scale.min} (optional)`}
          aria-label={`${idPrefix} low-end anchor label`}
          className="admin-input h-8 flex-1 text-xs"
        />
        <input
          value={scale.highLabel ?? ""}
          onChange={(event) => onChange({ ...scale, highLabel: event.target.value })}
          placeholder={`Label for ${scale.max} (optional)`}
          aria-label={`${idPrefix} high-end anchor label`}
          className="admin-input h-8 flex-1 text-xs"
        />
      </div>
    </div>
  );
}
