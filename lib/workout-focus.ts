/**
 * Workout focus = `workoutss.type`. Drives which warmup routine a workout gets.
 * Replaced the legacy upper/lower/full/bodyweight values; the old
 * "bodyweight" meaning now lives on `workoutss.is_bodyweight`.
 */
export const WORKOUT_FOCUS_VALUES = [
  "upper_body",
  "squat_lunge",
  "hip_hinge_glutes",
  "lower_body_mixed",
  "full_body",
] as const;

export type WorkoutFocus = (typeof WORKOUT_FOCUS_VALUES)[number];

export const WORKOUT_FOCUS_LABELS: Record<WorkoutFocus, string> = {
  upper_body: "Upper Body",
  squat_lunge: "Squat & Lunge",
  hip_hinge_glutes: "Hip Hinge & Glutes",
  lower_body_mixed: "Lower Body — Mixed",
  full_body: "Full Body",
};

export const DEFAULT_WORKOUT_FOCUS: WorkoutFocus = "full_body";

export const WORKOUT_FOCUS_OPTIONS = WORKOUT_FOCUS_VALUES.map((value) => ({
  value,
  label: WORKOUT_FOCUS_LABELS[value],
}));

export function isWorkoutFocus(value: unknown): value is WorkoutFocus {
  return (
    typeof value === "string" &&
    (WORKOUT_FOCUS_VALUES as readonly string[]).includes(value)
  );
}

export function getWorkoutFocusLabel(value: string | null | undefined): string {
  return isWorkoutFocus(value) ? WORKOUT_FOCUS_LABELS[value] : value || "—";
}

export const INVALID_FOCUS_ERROR = `type must be one of: ${WORKOUT_FOCUS_VALUES.join(", ")}`;

/**
 * Warning shown when an editor changes a saved workout's focus. The warmup is
 * derived from the focus, so it switches routine, and any replaced stretches
 * are reset because they belong to the old routine's slots.
 */
export function focusChangeWarmupMessage(
  nextFocus: string,
  replacedStretchCount: number,
): string {
  const base = `Changing the focus will also change this workout's warmup to the ${getWorkoutFocusLabel(nextFocus)} warmup.`;
  if (replacedStretchCount === 0) return base;
  return `${base} The ${replacedStretchCount} replaced stretch${replacedStretchCount === 1 ? "" : "es"} in the current warmup will be reset.`;
}
