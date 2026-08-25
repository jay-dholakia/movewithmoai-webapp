"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Dumbbell,
  Layers,
  Loader2,
  Lock,
  Plus,
  Repeat,
  Trash2,
} from "lucide-react";
import { CoachService } from "@/lib/services/coachService";
import type {
  AdminCatalogExercise,
  ExerciseGroupType,
  WorkoutBlock,
  WorkoutExerciseRow,
  WorkoutProgramRow,
  WorkoutTemplateRow,
} from "@/lib/types/workout-builder";
import {
  groupExercisesIntoBlocks,
  nextGroupId,
  nextOrderIndex,
} from "@/lib/utils/workoutBlocks";
import { BlockCard } from "@/components/admin/workout-builder/BlockCard";
import {
  adminInputClass,
  adminSelectClass,
} from "@/components/admin/workout-builder/formStyles";
import { AdminTemplateEditorSkeleton } from "@/components/admin/AdminLoadingSkeleton";
import { CoachProgramsTabs } from "@/components/coach/CoachSectionTabs/CoachSectionTabs";
import {
  ExercisePickerDrawer,
  PickerMode,
} from "@/components/admin/workout-builder/ExercisePickerDrawer";
import {
  closestCenter,
  DndContext,
  DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import {
  diffGroupChanges,
  flattenBlocks,
  moveBlock,
  moveInsideGroup,
} from "@/lib/utils/reorderBlocks";
import { toInsertBody } from "@/lib/utils/blockOps";

type BlockKind = "individual" | "superset" | "circuit";

// The coach endpoints may enrich rows with these flags. Missing values are
// treated as editable to stay backwards-compatible.
type CoachWorkoutTemplate = WorkoutTemplateRow & {
  is_mine?: boolean;
  can_edit?: boolean;
};

type CoachWorkoutProgram = WorkoutProgramRow & {
  is_mine?: boolean;
};

export default function CoachWorkoutTemplateEditorPage() {
  const params = useParams();
  const router = useRouter();
  const id = String(params.id || "");
  const workoutIdRef = useRef(id);
  workoutIdRef.current = id;

  const [workout, setWorkout] = useState<CoachWorkoutTemplate | null>(null);
  const [programs, setPrograms] = useState<CoachWorkoutProgram[]>([]);
  const [rows, setRows] = useState<WorkoutExerciseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingMeta, setSavingMeta] = useState(false);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerMode, setPickerMode] = useState<PickerMode>("individual");
  const [reordering, setReordering] = useState(false);
  const [pickerTargetGroup, setPickerTargetGroup] = useState<{
    groupId: number;
    groupType: ExerciseGroupType;
    insertAfterOrder: number;
  } | null>(null);

  const [pickerConversionSeed, setPickerConversionSeed] = useState<{
    seedRowId: string;
    targetType: ExerciseGroupType;
  } | null>(null);

  const [meta, setMeta] = useState({
    title: "",
    type: "full" as WorkoutTemplateRow["type"],
    plan_id: "",
    order_index: "",
    description: "",
  });

  const readOnly =
    !!workout && (workout.can_edit === false || workout.is_mine === false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    const [w, p, ex] = await Promise.all([
      CoachService.getWorkoutTemplate(id),
      // Coach doesn't have listWorkoutPrograms — use the enriched endpoint and
      // ask for a large page so the dropdown is fully populated.
      CoachService.listWorkoutProgramsEnriched(true, 1, 1000),
      CoachService.listTemplateExercises(id),
    ]);

    let programList: CoachWorkoutProgram[] =
      p.success && Array.isArray(p.programs) ? p.programs : [];

    if (w.success && w.workout) {
      const wo = w.workout as CoachWorkoutTemplate;
      setWorkout(wo);

      const assignedPlanId = wo.plan_id || "";
      if (
        assignedPlanId &&
        !programList.some((pr) => pr.plan_id === assignedPlanId)
      ) {
        const single = await CoachService.getWorkoutProgram(assignedPlanId);
        if (single.success && single.program) {
          programList = [single.program, ...programList];
        }
      }
      setMeta({
        title: wo.title || "",
        type: (wo.type as WorkoutTemplateRow["type"]) || "full",
        plan_id: assignedPlanId,
        order_index: wo.order_index != null ? String(wo.order_index) : "",
        description: wo.description || "",
      });
    } else {
      setError(w.error || "Workout not found");
    }

    setPrograms(programList);
    if (ex.success && Array.isArray(ex.exercises))
      setRows(ex.exercises as WorkoutExerciseRow[]);
    setLoading(false);
  }, [id]);

  const reloadExercises = useCallback(async () => {
    const wid = workoutIdRef.current;
    if (!wid) return;
    const ex = await CoachService.listTemplateExercises(wid);
    if (workoutIdRef.current !== wid) return;
    if (ex.success && Array.isArray(ex.exercises))
      setRows(ex.exercises as WorkoutExerciseRow[]);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const saveMeta = async () => {
    if (readOnly) return;
    setSavingMeta(true);
    const body: Record<string, unknown> = {
      title: meta.title.trim(),
      type: meta.type,
      description: meta.description.trim() || null,
      plan_id: meta.plan_id === "" ? null : meta.plan_id,
      order_index: meta.order_index === "" ? null : Number(meta.order_index),
    };
    const res = await CoachService.updateWorkoutTemplate(id, body);
    setSavingMeta(false);
    if (res.success && res.workout) setWorkout(res.workout);
    else alert(res.error || "Save failed");
  };

  const patchRow = async (rowId: string, patch: Record<string, unknown>) => {
    if (readOnly) return;
    // Optimistic
    setRows((prev) =>
      prev.map((r) =>
        r.id === rowId ? ({ ...r, ...patch } as WorkoutExerciseRow) : r,
      ),
    );
    const res = await CoachService.updateWorkoutExerciseRow(rowId, patch);
    if (!res.success) {
      alert(res.error || "Save failed");
      await reloadExercises();
    }
  };

  const deleteRow = async (rowId: string) => {
    if (readOnly) return;
    if (!confirm("Remove this exercise from the workout?")) return;
    const res = await CoachService.deleteWorkoutExerciseRow(rowId);
    if (!res.success) {
      alert(res.error || "Delete failed");
      return;
    }
    await reloadExercises();
  };

  const duplicateBlock = async (block: WorkoutBlock) => {
    if (readOnly) return;
    const items =
      block.kind === "individual" ? [block.exercise] : block.exercises;
    const baseOrder = nextOrderIndex(rows);
    const newGid = block.kind === "group" ? nextGroupId(rows) : null;
    const newGtype = block.kind === "group" ? block.groupType : null;

    for (let i = 0; i < items.length; i++) {
      const body = toInsertBody(items[i], {
        order_index: baseOrder + i,
        group_id: newGid,
        group_type: newGtype,
      });
      const res = await CoachService.addTemplateExercise(id, body);
      if (!res.success) {
        alert(res.error || "Failed to duplicate");
        break;
      }
    }
    await reloadExercises();
  };

  const addToGroup = (block: Extract<WorkoutBlock, { kind: "group" }>) => {
    if (readOnly) return;
    const lastOrder = Math.max(
      ...block.exercises.map((e) => e.order_index ?? 0),
    );
    setPickerMode("individual");
    setPickerConversionSeed(null);
    setPickerTargetGroup({
      groupId: block.groupId,
      groupType: block.groupType,
      insertAfterOrder: lastOrder,
    });
    setPickerOpen(true);
  };

  const toggleGroupType = async (
    block: Extract<WorkoutBlock, { kind: "group" }>,
  ) => {
    if (readOnly) return;
    const nextType: ExerciseGroupType =
      block.groupType === "circuit" ? "superset" : "circuit";
    if (
      !confirm(
        `Convert this ${block.groupType} to a ${nextType}? All ${block.exercises.length} exercises stay together.`,
      )
    )
      return;

    setRows((prev) =>
      prev.map((r) =>
        r.group_id === block.groupId ? { ...r, group_type: nextType } : r,
      ),
    );

    for (const ex of block.exercises) {
      const res = await CoachService.updateWorkoutExerciseRow(ex.id, {
        group_type: nextType,
      });
      if (!res.success) {
        alert(res.error || "Failed to convert");
        break;
      }
    }
    await reloadExercises();
  };

  const ungroupBlock = async (
    block: Extract<WorkoutBlock, { kind: "group" }>,
  ) => {
    if (readOnly) return;
    if (
      !confirm(
        `Ungroup this ${block.groupType}? Its ${block.exercises.length} exercises will become individual blocks.`,
      )
    )
      return;

    setRows((prev) =>
      prev.map((r) =>
        r.group_id === block.groupId
          ? { ...r, group_id: null, group_type: null }
          : r,
      ),
    );

    for (const ex of block.exercises) {
      const res = await CoachService.updateWorkoutExerciseRow(ex.id, {
        group_id: null,
        group_type: null,
      });
      if (!res.success) {
        alert(res.error || "Failed to ungroup");
        break;
      }
    }
    await reloadExercises();
  };

  const convertToGroup = (
    block: Extract<WorkoutBlock, { kind: "individual" }>,
    to: ExerciseGroupType,
  ) => {
    if (readOnly) return;
    setPickerMode(to);
    setPickerTargetGroup(null);
    setPickerConversionSeed({
      seedRowId: block.exercise.id,
      targetType: to,
    });
    setPickerOpen(true);
  };

  const deleteBlock = async (block: WorkoutBlock) => {
    if (readOnly) return;
    const count = block.kind === "individual" ? 1 : block.exercises.length;
    const kindLabel =
      block.kind === "individual"
        ? "exercise"
        : block.groupType === "circuit"
          ? "circuit"
          : "superset";
    if (
      !confirm(
        `Delete this ${kindLabel}? ${count} exercise${count === 1 ? "" : "s"} will be removed.`,
      )
    )
      return;

    const ids =
      block.kind === "individual"
        ? [block.exercise.id]
        : block.exercises.map((e) => e.id);

    const results = await Promise.all(
      ids.map((rid) => CoachService.deleteWorkoutExerciseRow(rid)),
    );
    const failed = results.filter((r) => !r.success);
    if (failed.length > 0) {
      alert(failed[0].error || "Some deletions failed");
    }
    await reloadExercises();
  };

  const persistBlockLayout = async (nextBlocks: WorkoutBlock[]) => {
    if (readOnly) return;
    const previous = rows;

    const flat = flattenBlocks(nextBlocks);
    const optimistic = flat.map((r, i) => ({ ...r, order_index: i + 1 }));
    setRows(optimistic);

    setReordering(true);
    try {
      const groupPatches = diffGroupChanges(previous, nextBlocks);
      for (const p of groupPatches) {
        const res = await CoachService.updateWorkoutExerciseRow(p.rowId, {
          group_id: p.group_id,
          group_type: p.group_type,
        });
        if (!res.success) {
          alert(res.error || "Failed to update grouping");
          await reloadExercises();
          return;
        }
      }

      const rowIds = flat.map((r) => r.id);
      const res = await CoachService.reorderTemplateExercises(id, rowIds);
      if (!res.success) {
        alert(res.error || "Failed to reorder");
      }
    } finally {
      setReordering(false);
      await reloadExercises();
    }
  };

  const handleMoveBlock = (from: number, to: number) => {
    if (readOnly) return;
    if (to < 0 || to >= blocks.length) return;
    const next = moveBlock(blocks, from, to);
    void persistBlockLayout(next);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    if (readOnly) return;
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const activeId = String(active.id);
    const overId = String(over.id);

    const activeInGroup = activeId.includes("::");
    const overInGroup = overId.includes("::");

    if (activeInGroup && overInGroup) {
      const [activeBlockKey, activeRowId] = activeId.split("::");
      const [overBlockKey, overRowId] = overId.split("::");

      if (activeBlockKey !== overBlockKey) return;

      const blockIndex = blocks.findIndex((b) => b.key === activeBlockKey);
      if (blockIndex < 0) return;
      const group = blocks[blockIndex];
      if (group.kind !== "group") return;

      const fromEx = group.exercises.findIndex((e) => e.id === activeRowId);
      const toEx = group.exercises.findIndex((e) => e.id === overRowId);
      if (fromEx < 0 || toEx < 0) return;

      const next = moveInsideGroup(blocks, blockIndex, fromEx, toEx);
      void persistBlockLayout(next);
      return;
    }

    const fromIdx = blocks.findIndex((b) => b.key === activeId);
    const toIdx = blocks.findIndex((b) => b.key === overId);
    if (fromIdx < 0 || toIdx < 0) return;
    const next = moveBlock(blocks, fromIdx, toIdx);
    void persistBlockLayout(next);
  };

  const addBlock = (kind: BlockKind) => {
    if (readOnly) return;
    setShowAddMenu(false);
    setPickerMode(kind);
    setPickerTargetGroup(null);
    setPickerConversionSeed(null);
    setPickerOpen(true);
  };

  const handlePickerConfirm = async (picked: AdminCatalogExercise[]) => {
    if (readOnly) return;
    if (picked.length === 0) return;

    // Case A: Adding into an existing group
    if (pickerTargetGroup) {
      const { groupId, groupType, insertAfterOrder } = pickerTargetGroup;
      const startOrder = insertAfterOrder + 1;

      const inserts = picked.map((ex, i) => ({
        exercise_id: ex.id,
        order_index: startOrder + i,
        sets: 3,
        reps: null,
        reps_display: null,
        rest_seconds: null,
        group_type: groupType,
        group_id: groupId,
        notes: null,
      }));

      for (const body of inserts) {
        const res = await CoachService.addTemplateExercise(id, body);
        if (!res.success) {
          alert(res.error || "Failed to add exercise");
          break;
        }
      }

      setPickerOpen(false);
      setPickerTargetGroup(null);
      await reloadExercises();
      return;
    }

    // Case B: Converting an individual block to a group
    if (pickerConversionSeed) {
      const { seedRowId, targetType } = pickerConversionSeed;
      const seed = rows.find((r) => r.id === seedRowId);
      if (!seed) {
        setPickerOpen(false);
        setPickerConversionSeed(null);
        return;
      }
      const gid = nextGroupId(rows);

      const seedPatch = await CoachService.updateWorkoutExerciseRow(seed.id, {
        group_id: gid,
        group_type: targetType,
      });
      if (!seedPatch.success) {
        alert(seedPatch.error || "Failed to start group");
        setPickerOpen(false);
        setPickerConversionSeed(null);
        await reloadExercises();
        return;
      }

      const startOrder = (seed.order_index ?? 0) + 1;
      const inserts = picked.map((ex, i) => ({
        exercise_id: ex.id,
        order_index: startOrder + i,
        sets: seed.sets ?? 3,
        reps: null,
        reps_display: null,
        rest_seconds: null,
        group_type: targetType,
        group_id: gid,
        notes: null,
      }));

      for (const body of inserts) {
        const res = await CoachService.addTemplateExercise(id, body);
        if (!res.success) {
          alert(res.error || "Failed to add exercise");
          break;
        }
      }

      setPickerOpen(false);
      setPickerConversionSeed(null);
      await reloadExercises();
      return;
    }

    // Case C: Fresh block
    const baseOrder = nextOrderIndex(rows);
    const isGroup = pickerMode !== "individual";
    const gid = isGroup ? nextGroupId(rows) : null;
    const gtype = isGroup ? pickerMode : null;

    const inserts = picked.map((ex, i) => ({
      exercise_id: ex.id,
      order_index: baseOrder + i,
      sets: 3,
      reps: null,
      reps_display: null,
      rest_seconds: isGroup ? null : 60,
      group_type: gtype,
      group_id: gid,
      notes: null,
    }));

    for (const body of inserts) {
      const res = await CoachService.addTemplateExercise(id, body);
      if (!res.success) {
        alert(res.error || "Failed to add exercise");
        break;
      }
    }

    setPickerOpen(false);
    await reloadExercises();
  };

  const deleteWorkout = async () => {
    if (readOnly) return;
    if (!confirm("Delete this workout template and all its exercises?")) return;
    const res = await CoachService.deleteWorkoutTemplate(id);
    if (res.success) {
      window.location.href = "/coach/workout-templates";
    } else alert(res.error || "Delete failed");
  };

  if (!id) return null;

  const blocks = groupExercisesIntoBlocks(rows);

  // Only show programs the coach can actually assign into (their own).
  // Missing is_mine → treat as assignable (for older API responses).
  const assignablePrograms = programs.filter((p) => p.is_mine !== false);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <CoachProgramsTabs />
      <button
        type="button"
        onClick={() => router.back()}
        className="cursor-pointer inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </button>

      {loading && (
        <div aria-busy="true">
          <AdminTemplateEditorSkeleton />
        </div>
      )}
      {!loading && error && (
        <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {!loading && workout && (
        <>
          {/* Read-only banner */}
          {readOnly && (
            <div className="mb-6 rounded-xl border border-blue-200 bg-blue-50 p-4 flex items-start gap-3">
              <Lock className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-blue-900">
                  This workout is read-only
                </p>
                <p className="text-xs text-blue-800 mt-0.5">
                  It belongs to the shared library or a program you don&apos;t
                  own. You can view its structure but not make changes.
                </p>
              </div>
            </div>
          )}

          {/* Header */}
          <div className="mb-6 flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-semibold text-gray-900">
                  {meta.title || "Untitled workout"}
                </h1>
                {readOnly ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600">
                    <Lock className="h-3 w-3" />
                    Read-only
                  </span>
                ) : (
                  <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-semibold text-blue-800">
                    Yours
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                {rows.length} exercise{rows.length === 1 ? "" : "s"} ·{" "}
                {blocks.length} block{blocks.length === 1 ? "" : "s"}
              </p>
            </div>
            {!readOnly && (
              <button
                type="button"
                onClick={deleteWorkout}
                className="text-sm text-red-600 hover:text-red-800 inline-flex items-center gap-1"
              >
                <Trash2 className="h-4 w-4" />
                Delete workout
              </button>
            )}
          </div>

          {/* Metadata */}
          <section className="rounded-xl border border-gray-200 bg-white p-4 mb-8 space-y-3">
            <h2 className="text-sm font-semibold text-gray-900">
              Workout details
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <label>
                <span className="text-gray-600">Title</span>
                <input
                  className={adminInputClass}
                  value={meta.title}
                  disabled={readOnly}
                  onChange={(e) => setMeta({ ...meta, title: e.target.value })}
                />
              </label>
              <label>
                <span className="text-gray-600">Type</span>
                <select
                  className={`cursor-pointer ${adminSelectClass}`}
                  value={meta.type}
                  disabled={readOnly}
                  onChange={(e) =>
                    setMeta({
                      ...meta,
                      type: e.target.value as WorkoutTemplateRow["type"],
                    })
                  }
                >
                  <option value="upper">upper</option>
                  <option value="lower">lower</option>
                  <option value="full">full</option>
                  <option value="bodyweight">bodyweight</option>
                </select>
              </label>
              <label>
                <span className="text-gray-600">Program</span>
                <select
                  className={`cursor-pointer ${adminSelectClass}`}
                  value={meta.plan_id}
                  disabled={readOnly}
                  onChange={(e) =>
                    setMeta({ ...meta, plan_id: e.target.value })
                  }
                >
                  <option value="">— Unassigned —</option>
                  {assignablePrograms.map((p) => (
                    <option key={p.plan_id} value={p.plan_id}>
                      {p.plan_name} ({p.plan_id})
                    </option>
                  ))}
                  {/* Preserve the current assignment even if it's not in the
                     coach's assignable list (e.g. shared library program). */}
                  {meta.plan_id &&
                    !assignablePrograms.some(
                      (p) => p.plan_id === meta.plan_id,
                    ) && (
                      <option value={meta.plan_id}>
                        {meta.plan_id} (read-only)
                      </option>
                    )}
                </select>
              </label>
              <label>
                <span className="text-gray-600">Day in program</span>
                <input
                  className={adminInputClass}
                  value={meta.order_index}
                  disabled={readOnly}
                  onChange={(e) =>
                    setMeta({ ...meta, order_index: e.target.value })
                  }
                  placeholder="1–5"
                />
              </label>
              <label className="md:col-span-2">
                <span className="text-gray-600">Description</span>
                <textarea
                  rows={2}
                  className={adminInputClass}
                  value={meta.description}
                  disabled={readOnly}
                  onChange={(e) =>
                    setMeta({ ...meta, description: e.target.value })
                  }
                />
              </label>
            </div>
            {!readOnly && (
              <button
                type="button"
                onClick={saveMeta}
                disabled={savingMeta}
                className="cursor-pointer px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {savingMeta ? (
                  <span className="inline-flex items-center gap-1.5">
                    <Loader2 className="h-3 w-3 animate-spin" /> Saving…
                  </span>
                ) : (
                  "Save details"
                )}
              </button>
            )}
          </section>

          {/* Blocks */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-900">
                {workout.title || "Workout"}
              </h2>
            </div>

            {blocks.length === 0 && (
              <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50/50 p-10 text-center">
                <p className="text-sm text-gray-500">
                  {readOnly
                    ? "This workout has no exercises."
                    : "No exercises yet. Add your first block to start building."}
                </p>
              </div>
            )}

            {reordering && !readOnly && (
              <p className="text-xs text-gray-500 flex items-center gap-1.5">
                <Loader2 className="h-3 w-3 animate-spin" />
                Saving new order…
              </p>
            )}

            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={blocks.map((b) => b.key)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-3">
                  {blocks.map((block, idx) => (
                    <BlockCard
                      key={block.key}
                      block={block}
                      index={idx}
                      totalBlocks={blocks.length}
                      onPatchRow={patchRow}
                      onDeleteRow={deleteRow}
                      onDeleteBlock={deleteBlock}
                      onMoveBlock={handleMoveBlock}
                      onDuplicateBlock={duplicateBlock}
                      onAddToGroup={addToGroup}
                      onToggleGroupType={toggleGroupType}
                      onUngroup={ungroupBlock}
                      onConvertToGroup={convertToGroup}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>

            {!readOnly && (
              <div className="relative pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddMenu((v) => !v)}
                  className="cursor-pointer w-full flex items-center justify-center gap-2 py-3.5 rounded-xl border border-dashed border-gray-300 text-sm font-medium text-gray-700 hover:border-blue-400 hover:text-blue-700 hover:bg-blue-50/40 transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  Add block
                </button>
                {showAddMenu && (
                  <>
                    <button
                      type="button"
                      aria-label="Close menu"
                      onClick={() => setShowAddMenu(false)}
                      className="cursor-default"
                    />
                    <div className=" mt-2 rounded-xl border border-gray-200 bg-white shadow-lg overflow-hidden">
                      <AddBlockOption
                        icon={<Dumbbell className="h-5 w-5" />}
                        title="Individual exercise"
                        subtitle="Add one standalone exercise"
                        onClick={() => addBlock("individual")}
                      />
                      <AddBlockOption
                        icon={<Layers className="h-5 w-5 text-amber-600" />}
                        title="Superset"
                        subtitle="Group 2+ exercises to alternate"
                        onClick={() => addBlock("superset")}
                      />
                      <AddBlockOption
                        icon={<Repeat className="h-5 w-5 text-purple-600" />}
                        title="Circuit"
                        subtitle="Rounds of multiple exercises"
                        onClick={() => addBlock("circuit")}
                        isLast
                      />
                    </div>
                  </>
                )}
              </div>
            )}
          </section>
        </>
      )}
      {!readOnly && (
        <ExercisePickerDrawer
          open={pickerOpen}
          mode={pickerMode}
          onClose={() => {
            setPickerOpen(false);
            setPickerTargetGroup(null);
            setPickerConversionSeed(null);
          }}
          onConfirm={handlePickerConfirm}
        />
      )}
    </div>
  );
}

function AddBlockOption({
  icon,
  title,
  subtitle,
  onClick,
  isLast,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  onClick: () => void;
  isLast?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`cursor-pointer w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-gray-50 transition ${
        isLast ? "" : "border-b border-gray-100"
      }`}
    >
      <span className="text-gray-500 shrink-0 mt-0.5">{icon}</span>
      <div>
        <p className="text-sm font-medium text-gray-900">{title}</p>
        <p className="text-xs text-gray-500">{subtitle}</p>
      </div>
    </button>
  );
}
