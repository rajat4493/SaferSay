/**
 * Every numeric question type normalizes onto the same 0-10 scale before
 * being averaged/compared across question types (see reportThemes.ts,
 * ProtectedReportPanel.tsx, CycleTrendPanel.tsx) -- this is the single
 * place that maps a question's raw scale to that normalization.
 *
 * likert_5 (1-5) and enps_0_10 (0-10) are fixed, built-in ranges. "scale"
 * is a tenant-configured range (min/max + optional anchor labels), stored
 * in the question's `options` column as this same shape -- see
 * db/migrations/0049_configurable_scale_questions.sql.
 *
 * Earlier normalization code used `(value / scaleMax) * 10`, which is only
 * correct when a scale's minimum is 0 -- for likert_5 (min 1), that
 * silently compressed the real range into [2, 10] instead of [0, 10].
 * `normalizeToTen` fixes that for every scale type, including the
 * already-shipped likert_5/enps_0_10 ones, not just the new configurable
 * one.
 */
export type ScaleConfig = { min: number; max: number; lowLabel?: string; highLabel?: string };

const LIKERT_5: ScaleConfig = { min: 1, max: 5 };
const ENPS_0_10: ScaleConfig = { min: 0, max: 10 };
// Used only when a "scale" question's stored config is missing or corrupt
// (should not happen once validated at write time) -- a safe, wide default
// rather than a crash.
const SCALE_FALLBACK: ScaleConfig = { min: 0, max: 10 };

export function isScaleConfig(value: unknown): value is ScaleConfig {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  return typeof candidate.min === "number" && typeof candidate.max === "number" && Number.isFinite(candidate.min) && Number.isFinite(candidate.max) && candidate.max > candidate.min;
}

/** `type` is loosely typed (`string`) so this works against both the
 * server's QuestionType union and any client-local copy of it. */
export function resolveScale(type: string, storedScale: unknown): ScaleConfig {
  if (type === "likert_5") return LIKERT_5;
  if (type === "enps_0_10") return ENPS_0_10;
  if (type === "scale" && isScaleConfig(storedScale)) return storedScale;
  return SCALE_FALLBACK;
}

export function normalizeToTen(value: number, scale: ScaleConfig): number {
  const span = scale.max - scale.min;
  if (span <= 0) return 0;
  return ((value - scale.min) / span) * 10;
}
