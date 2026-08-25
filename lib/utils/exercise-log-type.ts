/**
 * Helpers for interpreting an exercise's `log_type`.
 *
 * The exercises table uses four canonical log_type values:
 *   - "reps"         → bodyweight rep count (push-ups, air squats)
 *   - "weight_reps"  → weight + rep count (barbell rows, dumbbell curls)
 *   - "time"         → duration only (plank, wall sit)
 *   - "weight_time"  → weighted duration (weighted plank, farmer carry)
 *
 * We use these to decide what to *label* the primary metric input in the
 * workout builder — a plank shouldn't say "REPS", it should say "TIME (s)".
 *
 * Note: the workout_exercises table itself doesn't have separate weight or
 * duration columns — the same `reps` / `reps_display` fields carry the
 * prescription for both time and rep exercises. The label just changes.
 */

export type LogType =
  | "reps"
  | "weight_reps"
  | "time"
  | "weight_time"
  | string
  | null
  | undefined;

export function isTimeBased(logType: LogType): boolean {
  return logType === "time" || logType === "weight_time";
}

export function isWeighted(logType: LogType): boolean {
  return logType === "weight_reps" || logType === "weight_time";
}

/** Label for the primary prescription input ("Reps" vs "Time (s)"). */
export function metricLabel(logType: LogType): string {
  return isTimeBased(logType) ? "Time (s)" : "Reps";
}

/** Placeholder for the primary prescription input. */
export function metricPlaceholder(logType: LogType): string {
  return isTimeBased(logType) ? "30 or 30-45" : "8 or 8-10";
}

/** Unit suffix used in the compact display line ("reps" or "s"). */
export function metricUnitSuffix(logType: LogType): string {
  return isTimeBased(logType) ? "s" : "reps";
}

/**
 * Compact one-line summary of a prescription, log-type aware.
 * Examples:
 *   sets=3, reps=10, log_type=weight_reps  →  "3 × 10 reps"
 *   sets=3, reps=30, log_type=time         →  "3 × 30 s"
 *   sets=3, reps=null, reps_display="8-10" →  "3 × 8-10 reps"
 */
export function formatSetsAndMetric(
  sets: number | null | undefined,
  reps: number | null | undefined,
  repsDisplay: string | null | undefined,
  logType: LogType,
): string {
  const s = sets ?? 0;
  const suffix = metricUnitSuffix(logType);
  const value = repsDisplay?.trim() || (reps != null ? String(reps) : "");
  if (!s && !value) return "—";
  if (!s) return `${value} ${suffix}`;
  if (!value) return `${s} set${s === 1 ? "" : "s"}`;
  return `${s} × ${value} ${suffix}`;
}
