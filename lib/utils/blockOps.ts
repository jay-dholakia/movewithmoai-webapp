import type { WorkoutExerciseRow } from "@/lib/types/workout-builder";

export function toInsertBody(
  row: WorkoutExerciseRow,
  overrides: Partial<{
    order_index: number;
    group_id: number | null;
    group_type: WorkoutExerciseRow["group_type"];
  }> = {},
) {
  return {
    exercise_id: row.exercise_id,
    order_index: overrides.order_index ?? row.order_index,
    sets: row.sets,
    reps: row.reps,
    reps_display: row.reps_display,
    rest_seconds: row.rest_seconds,
    rest_display: row.rest_display,
    notes: row.notes,
    group_id:
      overrides.group_id !== undefined ? overrides.group_id : row.group_id,
    group_type:
      overrides.group_type !== undefined
        ? overrides.group_type
        : row.group_type,
  };
}
