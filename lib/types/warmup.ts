import type { WorkoutFocus } from "@/lib/workout-focus";

export interface Stretch {
  id: string;
  name: string;
  description: string;
  youtube_url: string | null;
}

export interface WarmupDose {
  /** Exactly one of duration_seconds / reps is set. */
  duration_seconds: number | null;
  reps: number | null;
  per_side: boolean;
}

export interface WarmupRoutineSlot extends WarmupDose {
  sequence: number;
  stretch_id: string;
}

export interface WarmupRoutine {
  id: string;
  name: string;
  workout_focus: WorkoutFocus;
  slots: WarmupRoutineSlot[];
}

export interface WarmupCatalog {
  stretches: Stretch[];
  routines: WarmupRoutine[];
}

/** One row of get_workout_warmup: the resolved slot (default or override). */
export interface WarmupSlot extends WarmupDose {
  sequence: number;
  stretch_id: string;
  name: string;
  description: string;
  youtube_url: string | null;
  is_override: boolean;
  routine_id: string;
  routine_name: string;
  workout_focus: WorkoutFocus;
}

export interface WarmupOverrideInput extends WarmupDose {
  stretch_id: string;
}

/** "40s", "8 reps / side". */
export function formatWarmupDose(dose: WarmupDose): string {
  const base =
    dose.duration_seconds != null
      ? `${dose.duration_seconds}s`
      : `${dose.reps ?? 0} reps`;
  return dose.per_side ? `${base} / side` : base;
}
