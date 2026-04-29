import type { DraftExercise } from "@/lib/ai-program-draft-zod";
import {
  parseProgramDraftForApply,
  parseWorkoutDraftForApply,
  type ProgramDraft,
  type WorkoutDraft,
} from "@/lib/ai-program-draft-zod";

export type EditorExerciseLine = DraftExercise & { clientId: string };

export type EditorWorkoutBlock = {
  clientId: string;
  title: string;
  type: "upper" | "lower" | "full" | "bodyweight";
  order_index: number;
  description: string;
  is_circuit: boolean;
  exercises: EditorExerciseLine[];
};

export type EditorProgramState = {
  program: {
    plan_id: string;
    plan_name: string;
    gender: string;
    min_age: number;
    max_age: number;
    days_per_week: number;
    description: string;
    difficulty_level: string;
  };
  workouts: EditorWorkoutBlock[];
};

export type EditorWorkoutState = {
  workout: {
    title: string;
    type: "upper" | "lower" | "full" | "bodyweight";
    description: string;
    is_circuit: boolean;
    plan_id: string;
    order_index: string;
  };
  exercises: EditorExerciseLine[];
};

function newClientId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `row-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function programDraftToEditor(d: ProgramDraft): EditorProgramState {
  return {
    program: {
      plan_id: d.program.plan_id,
      plan_name: d.program.plan_name,
      gender: d.program.gender ?? "All",
      min_age: d.program.min_age ?? 0,
      max_age: d.program.max_age ?? 120,
      days_per_week: d.program.days_per_week ?? 3,
      description: d.program.description ?? "",
      difficulty_level: d.program.difficulty_level ?? "",
    },
    workouts: d.workouts.map((w, wi) => ({
      clientId: newClientId(),
      title: w.title,
      type: w.type,
      order_index: w.order_index ?? wi + 1,
      description: w.description ?? "",
      is_circuit: w.is_circuit ?? false,
      exercises: w.exercises.map((e) => ({
        ...e,
        clientId: newClientId(),
      })),
    })),
  };
}

export function workoutDraftToEditor(d: WorkoutDraft): EditorWorkoutState {
  return {
    workout: {
      title: d.workout.title,
      type: d.workout.type,
      description: d.workout.description ?? "",
      is_circuit: d.workout.is_circuit ?? false,
      plan_id: d.workout.plan_id ?? "",
      order_index:
        d.workout.order_index !== null && d.workout.order_index !== undefined
          ? String(d.workout.order_index)
          : "",
    },
    exercises: d.exercises.map((e) => ({
      ...e,
      clientId: newClientId(),
    })),
  };
}

export function editorToProgramDraft(s: EditorProgramState): ProgramDraft {
  return parseProgramDraftForApply({
    program: {
      plan_id: s.program.plan_id.trim(),
      plan_name: s.program.plan_name.trim(),
      gender: s.program.gender || "All",
      min_age: s.program.min_age,
      max_age: s.program.max_age,
      days_per_week: s.program.days_per_week,
      description: s.program.description.trim() || null,
      difficulty_level: s.program.difficulty_level.trim() || null,
    },
    workouts: s.workouts.map((w, wi) => ({
      title: w.title.trim(),
      type: w.type,
      order_index: w.order_index ?? wi + 1,
      description: w.description.trim() || null,
      is_circuit: w.is_circuit,
      exercises: w.exercises.map(({ clientId: _c, ...rest }) => rest),
    })),
  });
}

export function editorToWorkoutDraft(s: EditorWorkoutState): WorkoutDraft {
  return parseWorkoutDraftForApply({
    workout: {
      title: s.workout.title.trim(),
      type: s.workout.type,
      description: s.workout.description.trim() || null,
      is_circuit: s.workout.is_circuit,
      plan_id: s.workout.plan_id.trim() || null,
      order_index:
        s.workout.order_index.trim() === ""
          ? null
          : Number(s.workout.order_index),
    },
    exercises: s.exercises.map(({ clientId: _c, ...rest }) => rest),
  });
}
