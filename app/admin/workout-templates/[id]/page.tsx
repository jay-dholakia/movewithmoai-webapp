"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Dumbbell,
  Layers,
  Loader2,
  Plus,
  Repeat,
  Trash2,
} from "lucide-react";
import { AdminService } from "@/lib/services/adminService";
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
import { AdminProgramsTabs } from "@/components/admin/AdminSectionTabs";
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

export default function WorkoutTemplateEditorPage() {
  const params = useParams();
  const router = useRouter();
  const id = String(params.id || "");
  const workoutIdRef = useRef(id);
  workoutIdRef.current = id;

  const [workout, setWorkout] = useState<WorkoutTemplateRow | null>(null);
  const [programs, setPrograms] = useState<WorkoutProgramRow[]>([]);
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
      AdminService.getWorkoutTemplate(id),
      AdminService.listWorkoutPrograms(true),
      AdminService.listTemplateExercises(id),
    ]);

    let programList: WorkoutProgramRow[] =
      p.success && Array.isArray(p.programs) ? p.programs : [];

    if (w.success && w.workout) {
      setWorkout(w.workout);
      const wo = w.workout;
      const assignedPlanId = wo.plan_id || "";
      if (
        assignedPlanId &&
        !programList.some((pr) => pr.plan_id === assignedPlanId)
      ) {
        const single = await AdminService.getWorkoutProgram(assignedPlanId);
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
    const ex = await AdminService.listTemplateExercises(wid);
    if (workoutIdRef.current !== wid) return;
    if (ex.success && Array.isArray(ex.exercises))
      setRows(ex.exercises as WorkoutExerciseRow[]);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const saveMeta = async () => {
    setSavingMeta(true);
    const body: Record<string, unknown> = {
      title: meta.title.trim(),
      type: meta.type,
      description: meta.description.trim() || null,
      plan_id: meta.plan_id === "" ? null : meta.plan_id,
      order_index: meta.order_index === "" ? null : Number(meta.order_index),
    };
    const res = await AdminService.updateWorkoutTemplate(id, body);
    setSavingMeta(false);
    if (res.success && res.workout) setWorkout(res.workout);
    else alert(res.error || "Save failed");
  };

  const patchRow = async (rowId: string, patch: Record<string, unknown>) => {
    // Optimistic
    setRows((prev) =>
      prev.map((r) =>
        r.id === rowId ? ({ ...r, ...patch } as WorkoutExerciseRow) : r,
      ),
    );
    const res = await AdminService.updateWorkoutExerciseRow(rowId, patch);
    if (!res.success) {
      alert(res.error || "Save failed");
      await reloadExercises();
    }
  };

  const deleteRow = async (rowId: string) => {
    if (!confirm("Remove this exercise from the workout?")) return;
    const res = await AdminService.deleteWorkoutExerciseRow(rowId);
    if (!res.success) {
      alert(res.error || "Delete failed");
      return;
    }
    await reloadExercises();
  };

  const duplicateBlock = async (block: WorkoutBlock) => {
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
      const res = await AdminService.addTemplateExercise(id, body);
      if (!res.success) {
        alert(res.error || "Failed to duplicate");
        break;
      }
    }
    await reloadExercises();
  };

  const addToGroup = (block: Extract<WorkoutBlock, { kind: "group" }>) => {
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
    const nextType: ExerciseGroupType =
      block.groupType === "circuit" ? "superset" : "circuit";
    if (
      !confirm(
        `Convert this ${block.groupType} to a ${nextType}? All ${block.exercises.length} exercises stay together.`,
      )
    )
      return;

    // Optimistic
    setRows((prev) =>
      prev.map((r) =>
        r.group_id === block.groupId ? { ...r, group_type: nextType } : r,
      ),
    );

    // Patch each row in the group
    for (const ex of block.exercises) {
      const res = await AdminService.updateWorkoutExerciseRow(ex.id, {
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
    if (
      !confirm(
        `Ungroup this ${block.groupType}? Its ${block.exercises.length} exercises will become individual blocks.`,
      )
    )
      return;

    // Optimistic
    setRows((prev) =>
      prev.map((r) =>
        r.group_id === block.groupId
          ? { ...r, group_id: null, group_type: null }
          : r,
      ),
    );

    for (const ex of block.exercises) {
      const res = await AdminService.updateWorkoutExerciseRow(ex.id, {
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
    setPickerMode(to);
    setPickerTargetGroup(null);
    setPickerConversionSeed({
      seedRowId: block.exercise.id,
      targetType: to,
    });
    setPickerOpen(true);
  };

  const deleteBlock = async (block: WorkoutBlock) => {
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

    // Fire deletes in parallel; a full API would ideally be one bulk call
    const results = await Promise.all(
      ids.map((rid) => AdminService.deleteWorkoutExerciseRow(rid)),
    );
    const failed = results.filter((r) => !r.success);
    if (failed.length > 0) {
      alert(failed[0].error || "Some deletions failed");
    }
    await reloadExercises();
  };

  const persistBlockLayout = async (nextBlocks: WorkoutBlock[]) => {
    const previous = rows;

    const flat = flattenBlocks(nextBlocks);
    const optimistic = flat.map((r, i) => ({ ...r, order_index: i + 1 }));
    setRows(optimistic);

    setReordering(true);
    try {
      // 1. Group changes
      const groupPatches = diffGroupChanges(previous, nextBlocks);
      for (const p of groupPatches) {
        const res = await AdminService.updateWorkoutExerciseRow(p.rowId, {
          group_id: p.group_id,
          group_type: p.group_type,
        });
        if (!res.success) {
          alert(res.error || "Failed to update grouping");
          await reloadExercises();
          return;
        }
      }

      // 2. Flat reorder
      const rowIds = flat.map((r) => r.id);
      const res = await AdminService.reorderTemplateExercises(id, rowIds);
      if (!res.success) {
        alert(res.error || "Failed to reorder");
      }
    } finally {
      setReordering(false);
      // 3. Sync from server so order_index / anything derived matches
      await reloadExercises();
    }
  };

  const handleMoveBlock = (from: number, to: number) => {
    if (to < 0 || to >= blocks.length) return;
    const next = moveBlock(blocks, from, to);
    void persistBlockLayout(next);
  };

  const handleDragEnd = (event: DragEndEvent) => {
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

    // Otherwise treat it as a block-level drag by matching block keys
    const fromIdx = blocks.findIndex((b) => b.key === activeId);
    const toIdx = blocks.findIndex((b) => b.key === overId);
    if (fromIdx < 0 || toIdx < 0) return;
    const next = moveBlock(blocks, fromIdx, toIdx);
    void persistBlockLayout(next);
  };

  const addBlock = (kind: BlockKind) => {
    setShowAddMenu(false);
    setPickerMode(kind);
    setPickerTargetGroup(null);
    setPickerConversionSeed(null);
    setPickerOpen(true);
  };

  const handlePickerConfirm = async (picked: AdminCatalogExercise[]) => {
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
        const res = await AdminService.addTemplateExercise(id, body);
        if (!res.success) {
          alert(res.error || "Failed to add exercise");
          break;
        }
      }

      // Rebase order_index so nothing collides — server truth wins
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

      // 1) Patch the seed to become part of the group
      const seedPatch = await AdminService.updateWorkoutExerciseRow(seed.id, {
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

      // 2) Insert the picked exercises immediately after the seed with the same group_id
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
        const res = await AdminService.addTemplateExercise(id, body);
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

    // Case C: Fresh block (default — Phase 2 behavior)
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
      const res = await AdminService.addTemplateExercise(id, body);
      if (!res.success) {
        alert(res.error || "Failed to add exercise");
        break;
      }
    }

    setPickerOpen(false);
    await reloadExercises();
  };

  const deleteWorkout = async () => {
    if (!confirm("Delete this workout template and all its exercises?")) return;
    const res = await AdminService.deleteWorkoutTemplate(id);
    if (res.success) {
      window.location.href = "/admin/workout-templates";
    } else alert(res.error || "Delete failed");
  };

  if (!id) return null;

  const blocks = groupExercisesIntoBlocks(rows);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <AdminProgramsTabs />
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
          {/* Header */}
          <div className="mb-6 flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h1 className="text-2xl font-semibold text-gray-900">
                {meta.title || "Untitled workout"}
              </h1>
              <p className="text-xs text-gray-500 mt-0.5">
                {rows.length} exercise{rows.length === 1 ? "" : "s"} ·{" "}
                {blocks.length} block{blocks.length === 1 ? "" : "s"}
              </p>
            </div>
            <button
              type="button"
              onClick={deleteWorkout}
              className="text-sm text-red-600 hover:text-red-800 inline-flex items-center gap-1"
            >
              <Trash2 className="h-4 w-4" />
              Delete workout
            </button>
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
                  onChange={(e) => setMeta({ ...meta, title: e.target.value })}
                />
              </label>
              <label>
                <span className="text-gray-600">Type</span>
                <select
                  className={`cursor-pointer ${adminSelectClass}`}
                  value={meta.type}
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
                  onChange={(e) =>
                    setMeta({ ...meta, plan_id: e.target.value })
                  }
                >
                  <option value="">— Unassigned —</option>
                  {programs.map((p) => (
                    <option key={p.plan_id} value={p.plan_id}>
                      {p.plan_name} ({p.plan_id})
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span className="text-gray-600">Day in program</span>
                <input
                  className={adminInputClass}
                  value={meta.order_index}
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
                  onChange={(e) =>
                    setMeta({ ...meta, description: e.target.value })
                  }
                />
              </label>
            </div>
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
                  No exercises yet. Add your first block to start building.
                </p>
              </div>
            )}

            {reordering && (
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
          </section>
        </>
      )}
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
