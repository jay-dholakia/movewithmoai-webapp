export type ProgressiveOverloadKind = "machine" | "barbell" | "dumbbell";

/** Increment applied per successful session, in lbs. */
export const PROGRESSIVE_OVERLOAD_INCREMENT_LBS: Record<
  ProgressiveOverloadKind,
  number
> = {
  machine: 10, // typical minimum plate on a selectorized stack
  barbell: 10, // 5lb plate per side
  dumbbell: 5, // 2.5lb per hand x2
};

// Cable stacks are machines, but their minimum increment is often 5lb rather
// than 10. Flip to false to exclude them entirely.
const TREAT_CABLE_AS_MACHINE = true;

// Set true to let admins enable the flag on any weight-logged exercise,
// regardless of equipment tags (useful while equipment data is inconsistent).
export const ALLOW_MANUAL_OVERRIDE = false;

export type ProgressiveOverloadInput = {
  name?: string | null;
  equipment?: unknown;
  exercise_type?: string | null;
  log_type?: string | null;
};

function normalizeEquipment(equipment: unknown): string[] {
  if (Array.isArray(equipment)) {
    return equipment.map((e) => String(e).toLowerCase().trim()).filter(Boolean);
  }
  if (typeof equipment === "string" && equipment.trim()) {
    return [equipment.toLowerCase().trim()];
  }
  return [];
}

/** Which increment bucket this exercise falls in, or null if it isn't loadable. */
export function progressiveOverloadKind(
  ex: ProgressiveOverloadInput,
): ProgressiveOverloadKind | null {
  if (ex.exercise_type === "bodyweight") return null;
  // Only weight-based logging can be progressively overloaded by weight.
  if (ex.log_type && ex.log_type !== "weight_reps") return null;

  const haystack = [
    ...normalizeEquipment(ex.equipment),
    (ex.name ?? "").toLowerCase(),
  ].join(" | ");

  // Order matters: check the more specific tokens first.
  if (/barbell|ez[-\s]?bar|smith\s?machine|trap\s?bar/.test(haystack)) {
    return "barbell";
  }
  if (/dumbbell|db\b/.test(haystack)) return "dumbbell";
  if (/cable|functional\s?trainer/.test(haystack)) {
    return TREAT_CABLE_AS_MACHINE ? "machine" : null;
  }
  if (
    /machine|selectorized|lever|pin[-\s]?stack|pulldown|leg\s?press/.test(
      haystack,
    )
  ) {
    return "machine";
  }
  return null;
}

export function isProgressiveOverloadEligible(
  ex: ProgressiveOverloadInput,
): boolean {
  if (progressiveOverloadKind(ex) !== null) return true;
  if (!ALLOW_MANUAL_OVERRIDE) return false;
  return ex.log_type === "weight_reps" && ex.exercise_type !== "bodyweight";
}

export function progressiveOverloadIncrementLbs(
  ex: ProgressiveOverloadInput,
): number | null {
  const kind = progressiveOverloadKind(ex);
  return kind ? PROGRESSIVE_OVERLOAD_INCREMENT_LBS[kind] : null;
}
