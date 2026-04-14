/**
 * Workouts auto-generated for user equipment show this in `workoutss.title`.
 * Admin program/library views hide them unless `include_equipment_adapted=true`.
 */
export const EQUIPMENT_ADAPTED_TITLE_SUBSTRING = "adapted to your equipment";

export function isEquipmentAdaptedWorkoutTitle(title: string | null | undefined) {
  if (!title) return false;
  return title.toLowerCase().includes(EQUIPMENT_ADAPTED_TITLE_SUBSTRING);
}
