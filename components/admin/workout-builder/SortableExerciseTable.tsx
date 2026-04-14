"use client";

import { useEffect, useState } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { AdminService } from "@/lib/services/adminService";

export type ExRow = {
  id: string;
  workout_template_id: string | null;
  exercise_id: string | null;
  order_index: number;
  sets: number;
  reps: number | null;
  reps_display: string | null;
  rest_seconds: number | null;
  rest_display: string | null;
  notes: string | null;
  group_id: number | null;
  group_type: string | null;
  exercises?: { id: string; name: string } | null;
};

function SortableExerciseRow({
  row,
  onSave,
  onDelete,
  compactSelectClass,
}: {
  row: ExRow;
  onSave: (r: ExRow) => void;
  onDelete: (id: string) => void;
  compactSelectClass: string;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: row.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.55 : 1,
  };

  const [local, setLocal] = useState({ ...row });

  useEffect(() => {
    setLocal({ ...row });
  }, [row]);

  const name = row.exercises?.name || row.exercise_id || "—";

  return (
    <tr ref={setNodeRef} style={style} className="border-t">
      <td className="px-1 py-1 w-10 align-middle">
        <button
          type="button"
          className="touch-none text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing p-1 rounded"
          aria-label="Drag to reorder"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </button>
      </td>
      <td className="px-2 py-1">
        <input
          className="w-14 rounded border border-gray-300 px-1 py-0.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          type="number"
          value={local.order_index}
          onChange={(e) =>
            setLocal({
              ...local,
              order_index: Number(e.target.value),
            })
          }
        />
      </td>
      <td
        className="px-2 py-1 text-gray-800 max-w-[180px] truncate"
        title={name}
      >
        {name}
      </td>
      <td className="px-2 py-1">
        <input
          className="w-12 rounded border border-gray-300 px-1 py-0.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          type="number"
          min={1}
          value={local.sets}
          onChange={(e) =>
            setLocal({ ...local, sets: Number(e.target.value) })
          }
        />
      </td>
      <td className="px-2 py-1">
        <input
          className="w-12 rounded border border-gray-300 px-1 py-0.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          type="number"
          value={local.reps ?? ""}
          onChange={(e) =>
            setLocal({
              ...local,
              reps: e.target.value === "" ? null : Number(e.target.value),
            })
          }
        />
      </td>
      <td className="px-2 py-1">
        <input
          className="w-20 rounded border border-gray-300 px-1 py-0.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          value={local.reps_display || ""}
          onChange={(e) =>
            setLocal({ ...local, reps_display: e.target.value || null })
          }
        />
      </td>
      <td className="px-2 py-1">
        <select
          className={compactSelectClass}
          value={local.group_type || ""}
          onChange={(e) =>
            setLocal({ ...local, group_type: e.target.value || null })
          }
        >
          <option value="">—</option>
          <option value="circuit">circuit</option>
          <option value="superset">superset</option>
        </select>
      </td>
      <td className="px-2 py-1">
        <input
          className="w-12 rounded border border-gray-300 px-1 py-0.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          type="number"
          value={local.group_id ?? ""}
          onChange={(e) =>
            setLocal({
              ...local,
              group_id:
                e.target.value === "" ? null : Number(e.target.value),
            })
          }
        />
      </td>
      <td className="px-2 py-1">
        <input
          className="w-14 rounded border border-gray-300 px-1 py-0.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          type="number"
          value={local.rest_seconds ?? ""}
          onChange={(e) =>
            setLocal({
              ...local,
              rest_seconds:
                e.target.value === "" ? null : Number(e.target.value),
            })
          }
        />
      </td>
      <td className="px-2 py-1 whitespace-nowrap">
        <button
          type="button"
          className="text-blue-600 text-xs mr-2"
          onClick={() => onSave(local)}
        >
          Save
        </button>
        <button
          type="button"
          className="text-red-600 text-xs"
          onClick={() => onDelete(row.id)}
        >
          Remove
        </button>
      </td>
    </tr>
  );
}

const compactSelectClass =
  "max-w-[110px] rounded border border-gray-300 px-1 py-0.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500";

export function SortableExerciseTable({
  workoutId,
  rows,
  onSave,
  onDelete,
  onReload,
}: {
  workoutId: string;
  rows: ExRow[];
  onSave: (r: ExRow) => void;
  onDelete: (id: string) => void;
  onReload: () => void;
}) {
  const [items, setItems] = useState(rows);
  const [persisting, setPersisting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    setItems(rows);
  }, [rows]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const onDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = items.findIndex((r) => r.id === active.id);
    const newIndex = items.findIndex((r) => r.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;

    const next = arrayMove(items, oldIndex, newIndex);
    setItems(next);
    setPersisting(true);
    setErr(null);
    const res = await AdminService.reorderTemplateExercises(
      workoutId,
      next.map((r) => r.id),
    );
    setPersisting(false);
    if (!res.success) {
      setErr(res.error || "Failed to save order");
      setItems(rows);
      return;
    }
    onReload();
  };

  const ids = items.map((r) => r.id);

  return (
    <div>
      {err && (
        <p className="text-sm text-red-600 mb-2" role="alert">
          {err}
        </p>
      )}
      {persisting && (
        <p className="text-xs text-gray-500 mb-2">Saving order…</p>
      )}
      {items.length === 0 ? (
        <p className="p-4 text-sm text-gray-500">No exercises yet.</p>
      ) : (
        <>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={onDragEnd}
          >
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-left">
                <tr>
                  <th className="px-1 py-2 w-10" aria-label="Reorder" />
                  <th className="px-2 py-2">Order</th>
                  <th className="px-2 py-2">Exercise</th>
                  <th className="px-2 py-2">Sets</th>
                  <th className="px-2 py-2">Reps</th>
                  <th className="px-2 py-2">Reps display</th>
                  <th className="px-2 py-2">Group type</th>
                  <th className="px-2 py-2">Group #</th>
                  <th className="px-2 py-2">Rest (s)</th>
                  <th className="px-2 py-2" />
                </tr>
              </thead>
              <tbody>
                <SortableContext
                  items={ids}
                  strategy={verticalListSortingStrategy}
                >
                  {items.map((r) => (
                    <SortableExerciseRow
                      key={r.id}
                      row={r}
                      onSave={onSave}
                      onDelete={onDelete}
                      compactSelectClass={compactSelectClass}
                    />
                  ))}
                </SortableContext>
              </tbody>
            </table>
          </DndContext>
          <p className="text-xs text-gray-500 px-2 pb-2">
            Drag the grip to reorder. Order is saved as{" "}
            <code className="bg-gray-100 px-1 rounded">order_index</code> (0,
            1, 2…).
          </p>
        </>
      )}
    </div>
  );
}
