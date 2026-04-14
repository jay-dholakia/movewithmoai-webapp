"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
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
import { GripVertical, ExternalLink } from "lucide-react";
import { AdminService } from "@/lib/services/adminService";
import type { WorkoutTemplateRow } from "@/lib/types/workout-builder";

function SortableWorkoutRow({
  workout,
}: {
  workout: WorkoutTemplateRow;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: workout.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.55 : 1,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 last:border-b-0 bg-white"
    >
      <button
        type="button"
        className="touch-none text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing p-1 rounded"
        aria-label="Drag to reorder"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-5 w-5" />
      </button>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-gray-900 truncate">{workout.title}</p>
        <p className="text-xs text-gray-500">
          {workout.type} · order {workout.order_index ?? "—"}
        </p>
      </div>
      <Link
        href={`/admin/workout-templates/${workout.id}`}
        className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 shrink-0"
      >
        Edit / exercises
        <ExternalLink className="h-3 w-3" />
      </Link>
    </li>
  );
}

export function SortableWorkoutsList({
  planId,
  workouts,
  onReload,
}: {
  planId: string;
  workouts: WorkoutTemplateRow[];
  onReload: () => void;
}) {
  const [items, setItems] = useState(workouts);
  const [persisting, setPersisting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    setItems(workouts);
  }, [workouts]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const onDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = items.findIndex((w) => w.id === active.id);
    const newIndex = items.findIndex((w) => w.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;

    const next = arrayMove(items, oldIndex, newIndex);
    setItems(next);
    setPersisting(true);
    setErr(null);
    const res = await AdminService.reorderWorkoutsInProgram(
      planId,
      next.map((w) => w.id),
    );
    setPersisting(false);
    if (!res.success) {
      setErr(res.error || "Failed to save order");
      setItems(workouts);
      return;
    }
    onReload();
  };

  const ids = items.map((w) => w.id);

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
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={onDragEnd}
      >
        <SortableContext items={ids} strategy={verticalListSortingStrategy}>
          <ul className="border border-gray-200 rounded-lg overflow-hidden shadow-sm">
            {items.map((w) => (
              <SortableWorkoutRow key={w.id} workout={w} />
            ))}
          </ul>
        </SortableContext>
      </DndContext>
      <p className="text-xs text-gray-500 mt-2">
        Drag the handle to reorder. Order is saved as{" "}
        <code className="bg-gray-100 px-1 rounded">order_index</code> (0, 1, 2…).
      </p>
    </div>
  );
}
