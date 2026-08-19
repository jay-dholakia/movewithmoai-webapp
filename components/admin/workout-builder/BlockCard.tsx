"use client";

import { useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  ChevronUp,
  Copy,
  GripVertical,
  Layers,
  MoreVertical,
  Plus,
  Repeat,
  Trash2,
  Ungroup,
} from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";
import type {
  WorkoutBlock,
  WorkoutExerciseRow,
} from "@/lib/types/workout-builder";
import {
  formatRest,
  formatSetsReps,
  groupLetter,
} from "@/lib/utils/workoutBlocks";
import { adminInputClass } from "./formStyles";

type Props = {
  block: WorkoutBlock;
  index: number;
  totalBlocks: number;
  onPatchRow: (rowId: string, patch: Record<string, unknown>) => void;
  onDeleteRow: (rowId: string) => void;
  onDeleteBlock: (block: WorkoutBlock) => void;
  onMoveBlock: (from: number, to: number) => void;
  onDuplicateBlock: (block: WorkoutBlock) => void;
  onAddToGroup: (block: Extract<WorkoutBlock, { kind: "group" }>) => void;
  onToggleGroupType: (block: Extract<WorkoutBlock, { kind: "group" }>) => void;
  onUngroup: (block: Extract<WorkoutBlock, { kind: "group" }>) => void;
  onConvertToGroup: (
    block: Extract<WorkoutBlock, { kind: "individual" }>,
    to: "superset" | "circuit",
  ) => void;
};

export function BlockCard({
  block,
  index,
  totalBlocks,
  onPatchRow,
  onDeleteRow,
  onDeleteBlock,
  onMoveBlock,
  onDuplicateBlock,
  onAddToGroup,
  onToggleGroupType,
  onUngroup,
  onConvertToGroup,
}: Props) {
  if (block.kind === "individual") {
    return (
      <IndividualBlockShell
        blockId={block.key}
        index={index}
        totalBlocks={totalBlocks}
        onDeleteBlock={() => onDeleteBlock(block)}
        onMoveBlock={onMoveBlock}
        onDuplicate={() => onDuplicateBlock(block)}
        onMakeSuperset={() => onConvertToGroup(block, "superset")}
        onMakeCircuit={() => onConvertToGroup(block, "circuit")}
      >
        <ExerciseLine
          row={block.exercise}
          onPatch={onPatchRow}
          onDelete={onDeleteRow}
        />
      </IndividualBlockShell>
    );
  }

  const label = groupLetter(index);
  const isCircuit = block.groupType === "circuit";
  const rounds = block.exercises[0]?.sets ?? null;

  return (
    <GroupBlockShell
      blockId={block.key}
      index={index}
      totalBlocks={totalBlocks}
      isCircuit={isCircuit}
      rounds={rounds}
      onDeleteBlock={() => onDeleteBlock(block)}
      onMoveBlock={onMoveBlock}
      onDuplicate={() => onDuplicateBlock(block)}
      onAddToGroup={() => onAddToGroup(block)}
      onToggleGroupType={() => onToggleGroupType(block)}
      onUngroup={() => onUngroup(block)}
    >
      <GroupExerciseList
        blockKey={block.key}
        block={block}
        label={label}
        isCircuit={isCircuit}
        onPatchRow={onPatchRow}
        onDeleteRow={onDeleteRow}
      />
    </GroupBlockShell>
  );
}

/* ---------------- Shells ---------------- */

function IndividualBlockShell({
  blockId,
  index,
  totalBlocks,
  onDeleteBlock,
  onMoveBlock,
  onDuplicate,
  onMakeSuperset,
  onMakeCircuit,
  children,
}: {
  blockId: string;
  index: number;
  totalBlocks: number;
  onDeleteBlock: () => void;
  onMoveBlock: (from: number, to: number) => void;
  onDuplicate: () => void;
  onMakeSuperset: () => void;
  onMakeCircuit: () => void;
  children: React.ReactNode;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: blockId });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.55 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="rounded-xl border border-gray-200 bg-white shadow-sm"
    >
      <div className="flex items-start gap-3 p-4">
        <button
          type="button"
          className="touch-none text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing pt-0.5"
          aria-label="Drag to reorder block"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-5 w-5" />
        </button>
        <span className="text-sm font-semibold text-gray-400 tabular-nums pt-0.5">
          {index + 1}.
        </span>
        <div className="flex-1 min-w-0">{children}</div>
        <div className="flex items-start gap-1 shrink-0">
          <BlockActionButtons
            index={index}
            totalBlocks={totalBlocks}
            onMoveBlock={onMoveBlock}
            onDeleteBlock={onDeleteBlock}
          />
          <BlockMenu
            items={[
              {
                label: "Duplicate",
                icon: <Copy className="h-3.5 w-3.5" />,
                onClick: onDuplicate,
              },
              {
                label: "Turn into superset",
                icon: <Layers className="h-3.5 w-3.5 text-amber-600" />,
                onClick: onMakeSuperset,
              },
              {
                label: "Turn into circuit",
                icon: <Repeat className="h-3.5 w-3.5 text-purple-600" />,
                onClick: onMakeCircuit,
              },
            ]}
          />
        </div>
      </div>
    </div>
  );
}

function GroupBlockShell({
  blockId,
  index,
  totalBlocks,
  isCircuit,
  rounds,
  onDeleteBlock,
  onMoveBlock,
  onDuplicate,
  onAddToGroup,
  onToggleGroupType,
  onUngroup,
  children,
}: {
  blockId: string;
  index: number;
  totalBlocks: number;
  isCircuit: boolean;
  rounds: number | null;
  onDeleteBlock: () => void;
  onMoveBlock: (from: number, to: number) => void;
  onDuplicate: () => void;
  onAddToGroup: () => void;
  onToggleGroupType: () => void;
  onUngroup: () => void;
  children: React.ReactNode;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: blockId });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.55 : 1,
  };

  const shell = isCircuit
    ? "border-purple-200 bg-purple-50/40"
    : "border-amber-200 bg-amber-50/40";
  const accent = isCircuit ? "text-purple-700" : "text-amber-700";
  const Icon = isCircuit ? Repeat : Layers;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn("rounded-xl border shadow-sm", shell)}
    >
      <div className="flex items-start gap-3 p-4">
        <button
          type="button"
          className="touch-none text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing pt-0.5"
          aria-label="Drag to reorder block"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-5 w-5" />
        </button>
        <span className="text-sm font-semibold text-gray-400 tabular-nums pt-0.5">
          {index + 1}.
        </span>
        <div className="flex-1 min-w-0">
          <div className="mb-3 flex items-center gap-2">
            <Icon className={cn("h-4 w-4", accent)} />
            <span
              className={cn(
                "text-xs font-semibold uppercase tracking-wide",
                accent,
              )}
            >
              {isCircuit ? "Circuit" : "Superset"}
            </span>
            {isCircuit && rounds != null && rounds > 0 && (
              <span className="text-xs text-gray-500">· {rounds} rounds</span>
            )}
            <button
              type="button"
              onClick={onAddToGroup}
              className={cn(
                "ml-auto inline-flex items-center gap-1 text-xs font-medium hover:underline",
                accent,
              )}
            >
              <Plus className="h-3 w-3" />
              Add exercise
            </button>
          </div>
          {children}
        </div>
        <div className="flex items-start gap-1 shrink-0">
          <BlockActionButtons
            index={index}
            totalBlocks={totalBlocks}
            onMoveBlock={onMoveBlock}
            onDeleteBlock={onDeleteBlock}
          />
          <BlockMenu
            items={[
              {
                label: "Duplicate",
                icon: <Copy className="h-3.5 w-3.5" />,
                onClick: onDuplicate,
              },
              {
                label: isCircuit ? "Convert to superset" : "Convert to circuit",
                icon: isCircuit ? (
                  <Layers className="h-3.5 w-3.5 text-amber-600" />
                ) : (
                  <Repeat className="h-3.5 w-3.5 text-purple-600" />
                ),
                onClick: onToggleGroupType,
              },
              {
                label: "Ungroup",
                icon: <Ungroup className="h-3.5 w-3.5" />,
                onClick: onUngroup,
              },
            ]}
          />
        </div>
      </div>
    </div>
  );
}

function BlockActionButtons({
  index,
  totalBlocks,
  onMoveBlock,
  onDeleteBlock,
}: {
  index: number;
  totalBlocks: number;
  onMoveBlock: (from: number, to: number) => void;
  onDeleteBlock: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-0.5 shrink-0">
      <button
        type="button"
        onClick={() => onMoveBlock(index, index - 1)}
        disabled={index === 0}
        className="text-gray-300 hover:text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed p-0.5"
        aria-label="Move block up"
        title="Move up"
      >
        <ArrowUp className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        onClick={() => onMoveBlock(index, index + 1)}
        disabled={index >= totalBlocks - 1}
        className="text-gray-300 hover:text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed p-0.5"
        aria-label="Move block down"
        title="Move down"
      >
        <ArrowDown className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        onClick={onDeleteBlock}
        className="text-gray-300 hover:text-red-600 transition p-0.5"
        aria-label="Delete block"
        title="Delete block"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}

function BlockMenu({
  items,
}: {
  items: Array<{
    label: string;
    icon: React.ReactNode;
    onClick: () => void;
    danger?: boolean;
  }>;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="text-gray-300 hover:text-gray-700 p-0.5"
        aria-label="Block actions"
        title="More"
      >
        <MoreVertical className="h-4 w-4" />
      </button>
      {open && (
        <>
          <button
            type="button"
            aria-hidden
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-10 cursor-default"
          />
          <div className="absolute right-0 mt-1 z-20 w-48 rounded-lg border border-gray-200 bg-white shadow-lg overflow-hidden">
            {items.map((it, i) => (
              <button
                key={i}
                type="button"
                onClick={() => {
                  setOpen(false);
                  it.onClick();
                }}
                className={cn(
                  "w-full flex items-center gap-2 px-3 py-2 text-left text-xs hover:bg-gray-50 transition",
                  it.danger && "text-red-600",
                  i > 0 && "border-t border-gray-100",
                )}
              >
                <span className="text-gray-500">{it.icon}</span>
                <span className="text-gray-900">{it.label}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/* ---------------- Group internals ---------------- */

function GroupExerciseList({
  blockKey,
  block,
  label,
  isCircuit,
  onPatchRow,
  onDeleteRow,
}: {
  blockKey: string;
  block: Extract<WorkoutBlock, { kind: "group" }>;
  label: string;
  isCircuit: boolean;
  onPatchRow: (rowId: string, patch: Record<string, unknown>) => void;
  onDeleteRow: (rowId: string) => void;
}) {
  return (
    <ul className="space-y-2">
      {block.exercises.map((ex, exIdx) => (
        <SortableGroupExercise
          key={ex.id}
          id={`${blockKey}::${ex.id}`}
          exercise={ex}
          labelPrefix={`${label}${exIdx + 1}.`}
          hideRest={isCircuit}
          onPatch={onPatchRow}
          onDelete={onDeleteRow}
        />
      ))}
    </ul>
  );
}

function SortableGroupExercise({
  id,
  exercise,
  labelPrefix,
  hideRest,
  onPatch,
  onDelete,
}: {
  id: string;
  exercise: WorkoutExerciseRow;
  labelPrefix: string;
  hideRest: boolean;
  onPatch: (rowId: string, patch: Record<string, unknown>) => void;
  onDelete: (rowId: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <li ref={setNodeRef} style={style} className="flex items-start gap-2">
      <button
        type="button"
        className="touch-none text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing pt-2"
        aria-label="Drag exercise within group"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <div className="flex-1 min-w-0">
        <ExerciseLine
          row={exercise}
          labelPrefix={labelPrefix}
          hideRest={hideRest}
          onPatch={onPatch}
          onDelete={onDelete}
        />
      </div>
    </li>
  );
}

/* ---------------- Exercise line ---------------- */

function ExerciseLine({
  row,
  labelPrefix,
  hideRest,
  onPatch,
  onDelete,
}: {
  row: WorkoutExerciseRow;
  labelPrefix?: string;
  hideRest?: boolean;
  onPatch: (rowId: string, patch: Record<string, unknown>) => void;
  onDelete: (rowId: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const name = row.exercises?.name ?? "(unknown exercise)";

  const setsRepsLine = formatSetsReps(row.sets, row.reps, row.reps_display);
  const restLine = hideRest
    ? null
    : formatRest(row.rest_seconds, row.rest_display);

  if (!editing) {
    return (
      <div
        className="group cursor-text rounded-md -m-1.5 p-1.5 hover:bg-gray-50 transition"
        onClick={() => setEditing(true)}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-900">
              {labelPrefix && (
                <span className="font-mono text-xs text-gray-400 mr-1.5">
                  {labelPrefix}
                </span>
              )}
              {name}
            </p>
            <p className="mt-0.5 text-sm text-gray-600 tabular-nums">
              {setsRepsLine}
              {restLine && (
                <>
                  <span className="mx-1.5 text-gray-300">·</span>
                  <span>{restLine}</span>
                </>
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(row.id);
            }}
            className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-600 transition shrink-0"
            aria-label="Remove exercise"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-md border border-blue-200 bg-blue-50/20 p-3 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-gray-900">
          {labelPrefix && (
            <span className="font-mono text-xs text-gray-400 mr-1.5">
              {labelPrefix}
            </span>
          )}
          {name}
        </p>
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => onDelete(row.id)}
            className="text-gray-400 hover:text-red-600"
            aria-label="Remove exercise"
          >
            <Trash2 className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => {
              setEditing(false);
              setShowMore(false);
            }}
            className="text-xs text-gray-600 hover:text-gray-900 px-2 py-1"
          >
            Done
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-3 text-sm">
        <MiniField
          label="Sets"
          defaultValue={row.sets ?? ""}
          keyProp={`s-${row.id}-${row.sets ?? ""}`}
          onBlurValue={(v) => {
            const n = v === "" ? 0 : Number(v);
            if (n !== row.sets) onPatch(row.id, { sets: n });
          }}
        />
        <MiniField
          label="Reps"
          type="text"
          width="w-24"
          defaultValue={row.reps_display ?? row.reps ?? ""}
          keyProp={`r-${row.id}-${row.reps_display ?? row.reps ?? ""}`}
          placeholder="8 or 8-10"
          onBlurValue={(v) => {
            const raw = v.trim();
            const asNum = /^\d+$/.test(raw) ? Number(raw) : null;
            onPatch(row.id, {
              reps: asNum,
              reps_display: raw && asNum === null ? raw : null,
            });
          }}
        />
        {!hideRest && (
          <MiniField
            label="Rest (s)"
            defaultValue={row.rest_seconds ?? ""}
            keyProp={`rest-${row.id}-${row.rest_seconds ?? ""}`}
            onBlurValue={(v) => {
              const n = v === "" ? null : Number(v);
              if (n !== row.rest_seconds) onPatch(row.id, { rest_seconds: n });
            }}
          />
        )}
        <button
          type="button"
          onClick={() => setShowMore((v) => !v)}
          className="ml-auto text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
        >
          {showMore ? (
            <ChevronUp className="h-3 w-3" />
          ) : (
            <ChevronDown className="h-3 w-3" />
          )}
          More options
        </button>
      </div>

      {showMore && (
        <div className="pt-3 border-t border-gray-100 space-y-3">
          <label className="block">
            <span className="text-xs text-gray-500">
              Rest label (overrides seconds when shown to member)
            </span>
            <input
              type="text"
              className={adminInputClass}
              defaultValue={row.rest_display ?? ""}
              key={`rd-${row.id}-${row.rest_display ?? ""}`}
              placeholder="e.g. 90 sec, 2 min"
              onBlur={(e) => {
                const v = e.target.value.trim() || null;
                if (v !== row.rest_display)
                  onPatch(row.id, { rest_display: v });
              }}
            />
          </label>
          <label className="block">
            <span className="text-xs text-gray-500">
              Coach notes (cues, tempo like 3-1-1, RPE 7, weight guidance…)
            </span>
            <textarea
              rows={2}
              className={adminInputClass}
              defaultValue={row.notes ?? ""}
              key={`n-${row.id}-${row.notes ?? ""}`}
              placeholder="Cues, tempo, RPE, weight guidance, etc."
              onBlur={(e) => {
                const v = e.target.value.trim() || null;
                if (v !== row.notes) onPatch(row.id, { notes: v });
              }}
            />
          </label>
          <p className="text-xs text-gray-400">
            Dedicated fields for Tempo, RPE/RIR, and Duration coming — for now
            they live in coach notes.
          </p>
        </div>
      )}
    </div>
  );
}

function MiniField({
  label,
  defaultValue,
  keyProp,
  placeholder,
  type = "number",
  width = "w-16",
  onBlurValue,
}: {
  label: string;
  defaultValue: string | number;
  keyProp: string;
  placeholder?: string;
  type?: "number" | "text";
  width?: string;
  onBlurValue: (v: string) => void;
}) {
  return (
    <label className="flex flex-col gap-0.5">
      <span className="text-[10px] font-medium uppercase tracking-wide text-gray-500">
        {label}
      </span>
      <input
        type={type}
        min={type === "number" ? 0 : undefined}
        className={cn(
          "rounded-md border border-gray-200 bg-white px-2 py-1 text-sm text-gray-900 focus:border-blue-400 focus:ring-1 focus:ring-blue-200 focus:outline-none",
          width,
        )}
        defaultValue={defaultValue}
        key={keyProp}
        placeholder={placeholder}
        onBlur={(e) => onBlurValue(e.target.value)}
      />
    </label>
  );
}
