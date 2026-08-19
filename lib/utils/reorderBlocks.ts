import type {
  ExerciseGroupType,
  WorkoutBlock,
  WorkoutExerciseRow,
} from "@/lib/types/workout-builder";

export function flattenBlocks(blocks: WorkoutBlock[]): WorkoutExerciseRow[] {
  const out: WorkoutExerciseRow[] = [];
  for (const b of blocks) {
    if (b.kind === "individual") out.push(b.exercise);
    else out.push(...b.exercises);
  }
  return out;
}

export type GroupPatch = {
  rowId: string;
  group_id: number | null;
  group_type: ExerciseGroupType | null;
};

export function diffGroupChanges(
  previous: WorkoutExerciseRow[],
  nextBlocks: WorkoutBlock[],
): GroupPatch[] {
  const nextGroups = new Map<
    string,
    { group_id: number | null; group_type: ExerciseGroupType | null }
  >();

  for (const b of nextBlocks) {
    if (b.kind === "individual") {
      nextGroups.set(b.exercise.id, { group_id: null, group_type: null });
    } else {
      for (const ex of b.exercises) {
        nextGroups.set(ex.id, {
          group_id: b.groupId,
          group_type: b.groupType,
        });
      }
    }
  }

  const patches: GroupPatch[] = [];
  const byId = new Map(previous.map((r) => [r.id, r] as const));

  for (const [rowId, want] of nextGroups) {
    const prev = byId.get(rowId);
    if (!prev) continue;
    const prevGid = prev.group_id ?? null;
    const prevGtype = prev.group_type ?? null;
    if (prevGid !== want.group_id || prevGtype !== want.group_type) {
      patches.push({
        rowId,
        group_id: want.group_id,
        group_type: want.group_type,
      });
    }
  }

  return patches;
}

/**
 * Reorder blocks: move the block currently at index `from` to index `to`.
 */
export function moveBlock(
  blocks: WorkoutBlock[],
  from: number,
  to: number,
): WorkoutBlock[] {
  if (from === to || from < 0 || to < 0) return blocks;
  const copy = [...blocks];
  const [item] = copy.splice(from, 1);
  copy.splice(to, 0, item);
  return copy;
}

/**
 * Reorder an exercise within its group.
 */
export function moveInsideGroup(
  blocks: WorkoutBlock[],
  blockIndex: number,
  fromExIdx: number,
  toExIdx: number,
): WorkoutBlock[] {
  const target = blocks[blockIndex];
  if (!target || target.kind !== "group") return blocks;
  if (fromExIdx === toExIdx) return blocks;

  const nextExercises = [...target.exercises];
  const [item] = nextExercises.splice(fromExIdx, 1);
  nextExercises.splice(toExIdx, 0, item);

  const copy = [...blocks];
  copy[blockIndex] = { ...target, exercises: nextExercises };
  return copy;
}
