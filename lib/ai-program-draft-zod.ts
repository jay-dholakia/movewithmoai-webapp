import { z } from "zod";

const GROUP_TYPES = new Set(["circuit", "superset"]);

const optionalBool = z.preprocess((v) => {
  if (v === undefined || v === null) return undefined;
  if (typeof v === "boolean") return v;
  if (v === "true" || v === 1 || v === "1") return true;
  if (v === "false" || v === 0 || v === "0") return false;
  return v;
}, z.boolean().optional());

export const draftExerciseSchema = z.object({
  exercise_id: z.string().uuid(),
  order_index: z.number().int().min(1),
  sets: z.number().int().min(1),
  reps: z.number().int().nullable().optional(),
  reps_display: z.string().nullable().optional(),
  rest_seconds: z.number().int().min(0).nullable().optional(),
  rest_display: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  group_type: z.enum(["circuit", "superset"]).nullable().optional(),
  group_id: z.number().int().min(1).nullable().optional(),
});

const applyExerciseSchema = z.object({
  exercise_id: z.string().uuid(),
  order_index: z.coerce.number().int().min(1),
  sets: z.coerce.number().int().min(1),
  reps: z.preprocess((v) => {
    if (v === undefined) return undefined;
    if (v === null || v === "") return null;
    const n = Number(v);
    return Number.isFinite(n) ? Math.trunc(n) : v;
  }, z.number().int().nullable().optional()),
  reps_display: z.string().nullable().optional(),
  rest_seconds: z.preprocess((v) => {
    if (v === undefined) return undefined;
    if (v === null || v === "") return null;
    const n = Number(v);
    return Number.isFinite(n) ? Math.trunc(n) : v;
  }, z.number().int().min(0).nullable().optional()),
  rest_display: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  group_type: z.preprocess((v) => {
    if (v === undefined) return undefined;
    if (v === null || v === "") return null;
    return v;
  }, z.enum(["circuit", "superset"]).nullable().optional()),
  group_id: z.preprocess((v) => {
    if (v === undefined) return undefined;
    if (v === null || v === "") return null;
    const n = Number(v);
    return Number.isFinite(n) ? Math.trunc(n) : v;
  }, z.number().int().min(1).nullable().optional()),
});

export type DraftExercise = z.infer<typeof draftExerciseSchema>;

const draftWorkoutSchema = z.object({
  title: z.string().min(1),
  type: z.enum(["upper", "lower", "full", "bodyweight"]),
  order_index: z.number().int().min(1).optional(),
  description: z.string().nullable().optional(),
  is_circuit: z.boolean().optional(),
  exercises: z.array(draftExerciseSchema).min(1),
});

export const programDraftSchema = z.object({
  program: z.object({
    plan_id: z.string().min(1),
    plan_name: z.string().min(1),
    gender: z.string().optional(),
    min_age: z.number().optional(),
    max_age: z.number().optional(),
    days_per_week: z.number().int().min(1).max(7).optional(),
    description: z.string().nullable().optional(),
    difficulty_level: z.string().nullable().optional(),
  }),
  workouts: z.array(draftWorkoutSchema).min(1),
});

export const workoutDraftSchema = z.object({
  workout: z.object({
    title: z.string().min(1),
    type: z.enum(["upper", "lower", "full", "bodyweight"]),
    description: z.string().nullable().optional(),
    is_circuit: z.boolean().optional(),
    plan_id: z.string().nullable().optional(),
    order_index: z.number().int().min(1).nullable().optional(),
  }),
  exercises: z.array(draftExerciseSchema).min(1),
});

const applyWorkoutDraftSchema = z.object({
  workout: z.object({
    title: z.string().min(1),
    type: z.enum(["upper", "lower", "full", "bodyweight"]),
    description: z.string().nullable().optional(),
    is_circuit: optionalBool,
    plan_id: z.preprocess(
      (v) => (v === "" ? null : v),
      z.string().nullable().optional(),
    ),
    order_index: z.coerce.number().int().min(1).nullable().optional(),
  }),
  exercises: z.array(applyExerciseSchema).min(1),
});

const applyProgramDraftSchema = z.object({
  program: z.object({
    plan_id: z.string().min(1),
    plan_name: z.string().min(1),
    gender: z.string().optional(),
    min_age: z.coerce.number().optional(),
    max_age: z.coerce.number().optional(),
    days_per_week: z.coerce.number().int().min(1).max(7).optional(),
    description: z.string().nullable().optional(),
    difficulty_level: z.string().nullable().optional(),
  }),
  workouts: z
    .array(
      z.object({
        title: z.string().min(1),
        type: z.enum(["upper", "lower", "full", "bodyweight"]),
        order_index: z.coerce.number().int().min(1).optional(),
        description: z.string().nullable().optional(),
        is_circuit: optionalBool,
        exercises: z.array(applyExerciseSchema).min(1),
      }),
    )
    .min(1),
});

export function parseProgramDraftForApply(raw: unknown): ProgramDraft {
  const parsed = applyProgramDraftSchema.parse(raw);
  return programDraftSchema.parse(parsed);
}

export function parseWorkoutDraftForApply(raw: unknown): WorkoutDraft {
  const parsed = applyWorkoutDraftSchema.parse(raw);
  return workoutDraftSchema.parse(parsed);
}

export type ProgramDraft = z.infer<typeof programDraftSchema>;
export type WorkoutDraft = z.infer<typeof workoutDraftSchema>;

export function tryParseDraftForEditor(
  mode: "program",
  raw: unknown,
): ProgramDraft | null;
export function tryParseDraftForEditor(
  mode: "workout",
  raw: unknown,
): WorkoutDraft | null;
export function tryParseDraftForEditor(
  mode: "program" | "workout",
  raw: unknown,
): ProgramDraft | WorkoutDraft | null {
  try {
    if (mode === "program") return parseProgramDraftForApply(raw);
    return parseWorkoutDraftForApply(raw);
  } catch {
    return null;
  }
}

export function validateGroupContiguity(
  exercises: DraftExercise[],
): string[] {
  const errors: string[] = [];
  const sorted = [...exercises].sort((a, b) => a.order_index - b.order_index);

  const orders = new Set<number>();
  for (const ex of sorted) {
    if (orders.has(ex.order_index)) {
      errors.push(`Duplicate order_index ${ex.order_index}`);
    }
    orders.add(ex.order_index);
  }

  for (const ex of sorted) {
    const hasG = ex.group_id != null;
    const hasT = ex.group_type != null;
    if (hasG !== hasT) {
      errors.push(
        `order_index ${ex.order_index}: group_id and group_type must both be set or both null`,
      );
    }
    if (hasT && ex.group_type && !GROUP_TYPES.has(ex.group_type)) {
      errors.push(`order_index ${ex.order_index}: invalid group_type`);
    }
  }

  let idx = 0;
  const clusterStarts = new Map<string, number[]>();
  while (idx < sorted.length) {
    const ex = sorted[idx];
    if (ex.group_id == null || ex.group_type == null) {
      idx++;
      continue;
    }
    const key = `${ex.group_type}:${ex.group_id}`;
    const startOrder = ex.order_index;
    while (
      idx < sorted.length &&
      sorted[idx].group_id === ex.group_id &&
      sorted[idx].group_type === ex.group_type
    ) {
      idx++;
    }
    const arr = clusterStarts.get(key) ?? [];
    arr.push(startOrder);
    clusterStarts.set(key, arr);
  }
  for (const [key, starts] of clusterStarts) {
    if (starts.length > 1) {
      errors.push(
        `Group ${key} is split into non-contiguous blocks (starts at order_index: ${starts.join(", ")})`,
      );
    }
  }
  return errors;
}

export function collectExerciseIdsFromProgramDraft(d: ProgramDraft): string[] {
  const ids: string[] = [];
  for (const w of d.workouts) {
    for (const e of w.exercises) {
      ids.push(e.exercise_id);
    }
  }
  return ids;
}

export function collectExerciseIdsFromWorkoutDraft(d: WorkoutDraft): string[] {
  return d.exercises.map((e) => e.exercise_id);
}
