/**
 * Canonical values for admin exercise entry. Keep in sync with DB constraints
 * (or migrate DB to match). Used by API validation and the exercise library UI.
 */

import { mergeEquipmentList } from "@/lib/program-equipment";

export const EXERCISE_CATEGORY_OPTIONS = [
  { value: "strength", label: "Strength" },
  { value: "hypertrophy", label: "Hypertrophy" },
  { value: "power", label: "Power" },
  { value: "mobility", label: "Mobility" },
  { value: "cardio", label: "Cardio" },
  { value: "core", label: "Core" },
  { value: "warmup", label: "Warm-up" },
  { value: "cooldown", label: "Cool-down" },
  { value: "plyometric", label: "Plyometric" },
  { value: "olympic", label: "Olympic lift" },
  { value: "accessory", label: "Accessory" },
  { value: "rehab", label: "Rehab / prehab" },
  { value: "sport_specific", label: "Sport-specific" },
  { value: "other", label: "Other" },
] as const;

export const EXERCISE_LOG_TYPE_OPTIONS = [
  { value: "reps_weight", label: "Reps + weight" },
  { value: "reps_only", label: "Reps only" },
  { value: "bodyweight", label: "Bodyweight reps" },
  { value: "time", label: "Time / hold" },
  { value: "distance", label: "Distance" },
  { value: "each_side", label: "Reps + weight (each side)" },
  { value: "amrap", label: "AMRAP / rounds" },
  { value: "emom", label: "EMOM" },
  { value: "watts", label: "Watts / machine output" },
  { value: "calories", label: "Calories (machine)" },
  { value: "other", label: "Other" },
] as const;

export type ExerciseCategoryValue =
  (typeof EXERCISE_CATEGORY_OPTIONS)[number]["value"];
export type ExerciseLogTypeValue =
  (typeof EXERCISE_LOG_TYPE_OPTIONS)[number]["value"];

const CATEGORY_VALUES = new Set<string>(
  EXERCISE_CATEGORY_OPTIONS.map((o) => o.value),
);
const LOG_TYPE_VALUES = new Set<string>(
  EXERCISE_LOG_TYPE_OPTIONS.map((o) => o.value),
);

export function isAllowedExerciseCategory(
  v: string | null | undefined,
): v is ExerciseCategoryValue {
  return typeof v === "string" && CATEGORY_VALUES.has(v);
}

export function isAllowedExerciseLogType(
  v: string | null | undefined,
): v is ExerciseLogTypeValue {
  return typeof v === "string" && LOG_TYPE_VALUES.has(v);
}

/** Equipment tags allowed in the admin UI (server rejects unknown tags). */
export const EXERCISE_EQUIPMENT_CHIPS = [
  { id: "bodyweight", label: "Bodyweight only" },
  { id: "barbell", label: "Barbell" },
  { id: "dumbbell", label: "Dumbbell" },
  { id: "kettlebell", label: "Kettlebell" },
  { id: "cable", label: "Cable" },
  { id: "machine", label: "Machine" },
  { id: "bench", label: "Bench" },
  { id: "squat_rack", label: "Squat rack" },
  { id: "smith_machine", label: "Smith machine" },
  { id: "pullup_bar", label: "Pull-up bar" },
  { id: "rings", label: "Gymnastic rings" },
  { id: "band", label: "Resistance band" },
  { id: "trx", label: "TRX / suspension" },
  { id: "medicine_ball", label: "Medicine ball" },
  { id: "stability_ball", label: "Stability ball" },
  { id: "foam_roller", label: "Foam roller" },
  { id: "box", label: "Plyo box" },
  { id: "jump_rope", label: "Jump rope" },
  { id: "rower", label: "Rowing machine" },
  { id: "bike", label: "Bike / assault bike" },
  { id: "treadmill", label: "Treadmill" },
  { id: "landmine", label: "Landmine" },
  { id: "ez_bar", label: "EZ bar" },
  { id: "trap_bar", label: "Trap bar" },
  { id: "sled", label: "Sled" },
  { id: "safety_bar", label: "Safety squat bar" },
  { id: "yoga_mat", label: "Yoga mat" },
  { id: "none", label: "None" },
] as const;

const EQUIPMENT_LABELS = new Set(
  EXERCISE_EQUIPMENT_CHIPS.map((c) => c.label.toLowerCase()),
);

export function normalizeEquipmentTagsFromClient(
  raw: unknown,
): string[] | null {
  if (raw == null) return null;
  const arr = Array.isArray(raw) ? raw : [];
  const labels: string[] = [];
  for (const x of arr) {
    const s = String(x).trim();
    if (!s) continue;
    const chip = EXERCISE_EQUIPMENT_CHIPS.find(
      (c) => c.label.toLowerCase() === s.toLowerCase(),
    );
    if (chip) labels.push(chip.label);
  }
  if (labels.length === 0) return null;
  return mergeEquipmentList(labels);
}

export function isKnownEquipmentLabel(label: string): boolean {
  return EQUIPMENT_LABELS.has(label.trim().toLowerCase());
}

export function exerciseCategoryLabel(
  value: string | null | undefined,
): string {
  if (!value) return "—";
  const o = EXERCISE_CATEGORY_OPTIONS.find((x) => x.value === value);
  return o?.label ?? value;
}

export function exerciseLogTypeLabel(
  value: string | null | undefined,
): string {
  if (!value) return "—";
  const o = EXERCISE_LOG_TYPE_OPTIONS.find((x) => x.value === value);
  return o?.label ?? value;
}
