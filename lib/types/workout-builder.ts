export type WorkoutTemplateType = "upper" | "lower" | "full" | "bodyweight";

export type ExerciseGroupType = "circuit" | "superset";

export interface WorkoutProgramRow {
  id: string;
  plan_id: string;
  plan_name: string;
  gender: string;
  min_age: number;
  max_age: number;
  days_per_week: number;
  description: string | null;
  difficulty_level: string | null;
  equipment_required: string[];
  base_plan_id: string | null;
  is_deprecated: boolean | null;
  month_active: string | null;
  created_at: string | null;
  updated_at: string | null;
}

/** Focus Moai rows linked to this program via `workout_focus`. */
export interface ProgramFocusMoaiRef {
  id: string;
  name: string;
  status: string;
}

export interface EnrichedWorkoutProgramRow extends WorkoutProgramRow {
  focus_moais: ProgramFocusMoaiRef[];
  assigned_user_count: number;
}

export interface WorkoutTemplateRow {
  id: string;
  title: string;
  type: WorkoutTemplateType;
  plan_id: string | null;
  description: string | null;
  order_index: number | null;
  is_circuit: boolean | null;
  difficulty_level: string | null;
  estimated_duration_minutes: number | null;
  tags: string[] | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface WorkoutExerciseRow {
  id: string;
  workout_template_id: string | null;
  exercise_id: string | null;
  order_index: number;
  sets: number;
  reps: number | null;
  reps_display: string | null;
  rest_seconds: number | null;
  rest_display: string | null;
  notes: string | null;
  group_id: number | null;
  group_type: ExerciseGroupType | null;
  exercises?: { id: string; name: string } | null;
}
