import type {
  WorkoutBlock,
  WorkoutExerciseRow,
} from "@/lib/types/workout-builder";

export function groupExercisesIntoBlocks(
  rows: WorkoutExerciseRow[],
): WorkoutBlock[] {
  const sorted = [...rows].sort(
    (a, b) => (a.order_index ?? 0) - (b.order_index ?? 0),
  );

  const blocks: WorkoutBlock[] = [];
  let i = 0;

  while (i < sorted.length) {
    const row = sorted[i];

    if (row.group_id == null || row.group_type == null) {
      blocks.push({
        kind: "individual",
        key: `ind-${row.id}`,
        exercise: row,
      });
      i++;
      continue;
    }

    const gid = row.group_id;
    const gtype = row.group_type;
    const collected: WorkoutExerciseRow[] = [];

    while (
      i < sorted.length &&
      sorted[i].group_id === gid &&
      sorted[i].group_type === gtype
    ) {
      collected.push(sorted[i]);
      i++;
    }

    blocks.push({
      kind: "group",
      key: `grp-${gid}`,
      groupId: gid,
      groupType: gtype,
      exercises: collected,
    });
  }

  return blocks;
}

export function nextGroupId(rows: WorkoutExerciseRow[]): number {
  const existing = rows
    .map((r) => r.group_id)
    .filter((v): v is number => typeof v === "number");
  return existing.length === 0 ? 1 : Math.max(...existing) + 1;
}

export function nextOrderIndex(rows: WorkoutExerciseRow[]): number {
  if (rows.length === 0) return 1;
  return Math.max(...rows.map((r) => r.order_index ?? 0)) + 1;
}

export function groupLetter(index: number): string {
  return String.fromCharCode(65 + (index % 26));
}

export function formatRest(
  restSeconds: number | null,
  restDisplay: string | null,
): string | null {
  if (restDisplay && restDisplay.trim()) return `${restDisplay.trim()} rest`;
  if (restSeconds == null || restSeconds <= 0) return null;
  if (restSeconds >= 60 && restSeconds % 60 === 0) {
    const m = restSeconds / 60;
    return `${m} min rest`;
  }
  return `${restSeconds} sec rest`;
}

/** Format sets/reps as "4 sets × 8 reps" or "3 × 12". */
export function formatSetsReps(
  sets: number | null,
  reps: number | null,
  repsDisplay: string | null,
): string {
  const s = sets ?? 0;
  const r = repsDisplay?.trim() || (reps != null ? String(reps) : "—");
  if (s === 0) return r;
  return `${s} × ${r}`;
}
