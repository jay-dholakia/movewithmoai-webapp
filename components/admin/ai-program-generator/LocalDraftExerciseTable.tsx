"use client";

import { useEffect, useRef, useState } from "react";
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
import { ChevronDown, ChevronRight, GripVertical, Search } from "lucide-react";
import { AdminService } from "@/lib/services/adminService";
import type { EditorExerciseLine } from "./draftEditorMappers";

const compactSelectClass =
  "max-w-[110px] rounded border border-gray-300 px-1 py-0.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500";

function newClientId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `row-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function renumberOrders(lines: EditorExerciseLine[]): EditorExerciseLine[] {
  return lines.map((r, i) => ({ ...r, order_index: i + 1 }));
}

function SortableDraftRow({
  row,
  nameById,
  onUpdate,
  onRemove,
  onExerciseNameResolved,
}: {
  row: EditorExerciseLine;
  nameById: Record<string, string>;
  onUpdate: (next: EditorExerciseLine) => void;
  onRemove: () => void;
  onExerciseNameResolved?: (id: string, name: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: row.clientId });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.55 : 1,
  };

  const [local, setLocal] = useState({ ...row });
  const [swapOpen, setSwapOpen] = useState(false);
  const [searchQ, setSearchQ] = useState("");
  const [hits, setHits] = useState<{ id: string; name: string }[]>([]);
  const [searching, setSearching] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setLocal({ ...row });
  }, [row]);

  const displayName =
    nameById[row.exercise_id] || row.exercise_id.slice(0, 8) + "…";

  useEffect(() => {
    if (!swapOpen) {
      setSearchQ("");
      setHits([]);
      return;
    }
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (!searchQ.trim()) {
      setHits([]);
      return;
    }
    searchTimer.current = setTimeout(async () => {
      setSearching(true);
      const res = await AdminService.searchExercisesCatalog(searchQ, 50);
      setSearching(false);
      if (res.success && Array.isArray(res.exercises)) {
        setHits(res.exercises);
      } else setHits([]);
    }, 280);
    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, [searchQ, swapOpen]);

  const pickExercise = (id: string, name: string) => {
    onExerciseNameResolved?.(id, name);
    const next = { ...local, exercise_id: id };
    setLocal(next);
    onUpdate(next);
    setSwapOpen(false);
    setSearchQ("");
    setHits([]);
  };

  return (
    <tr ref={setNodeRef} style={style} className="border-t align-top">
      <td className="px-1 py-1 w-10">
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
          min={1}
          value={local.order_index}
          onChange={(e) => {
            const n = { ...local, order_index: Number(e.target.value) || 1 };
            setLocal(n);
            onUpdate(n);
          }}
        />
      </td>
      <td className="px-2 py-1 max-w-[200px]">
        <div className="text-sm text-gray-800 truncate" title={displayName}>
          {displayName}
        </div>
        <button
          type="button"
          className="text-xs text-blue-600 hover:underline mt-0.5 inline-flex items-center gap-0.5"
          onClick={() => setSwapOpen((o) => !o)}
        >
          {swapOpen ? (
            <ChevronDown className="h-3 w-3" />
          ) : (
            <ChevronRight className="h-3 w-3" />
          )}
          Change exercise
        </button>
        {swapOpen && (
          <div className="mt-2 space-y-1 border border-gray-200 rounded p-2 bg-gray-50">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
              <input
                className="w-full pl-8 pr-2 py-1 text-xs rounded border border-gray-300"
                placeholder="Search catalog…"
                value={searchQ}
                onChange={(e) => setSearchQ(e.target.value)}
              />
            </div>
            {searching && (
              <p className="text-xs text-gray-500">Searching…</p>
            )}
            <ul className="max-h-32 overflow-y-auto text-xs space-y-0.5">
              {hits.map((h) => (
                <li key={h.id}>
                  <button
                    type="button"
                    className="text-left w-full hover:bg-white rounded px-1 py-0.5"
                    onClick={() => pickExercise(h.id, h.name)}
                  >
                    {h.name}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </td>
      <td className="px-2 py-1">
        <input
          className="w-12 rounded border border-gray-300 px-1 py-0.5 text-sm"
          type="number"
          min={1}
          value={local.sets}
          onChange={(e) => {
            const n = { ...local, sets: Number(e.target.value) || 1 };
            setLocal(n);
            onUpdate(n);
          }}
        />
      </td>
      <td className="px-2 py-1">
        <input
          className="w-12 rounded border border-gray-300 px-1 py-0.5 text-sm"
          type="number"
          value={local.reps ?? ""}
          onChange={(e) => {
            const n = {
              ...local,
              reps: e.target.value === "" ? null : Number(e.target.value),
            };
            setLocal(n);
            onUpdate(n);
          }}
        />
      </td>
      <td className="px-2 py-1">
        <input
          className="w-20 rounded border border-gray-300 px-1 py-0.5 text-sm"
          value={local.reps_display || ""}
          onChange={(e) => {
            const n = {
              ...local,
              reps_display: e.target.value || null,
            };
            setLocal(n);
            onUpdate(n);
          }}
        />
      </td>
      <td className="px-2 py-1">
        <select
          className={compactSelectClass}
          value={local.group_type || ""}
          onChange={(e) => {
            const v = e.target.value;
            const n = {
              ...local,
              group_type: (v === "" ? null : v) as EditorExerciseLine["group_type"],
              group_id: v === "" ? null : local.group_id,
            };
            setLocal(n);
            onUpdate(n);
          }}
        >
          <option value="">—</option>
          <option value="circuit">circuit</option>
          <option value="superset">superset</option>
        </select>
      </td>
      <td className="px-2 py-1">
        <input
          className="w-12 rounded border border-gray-300 px-1 py-0.5 text-sm"
          type="number"
          value={local.group_id ?? ""}
          onChange={(e) => {
            const n = {
              ...local,
              group_id:
                e.target.value === "" ? null : Number(e.target.value),
            };
            setLocal(n);
            onUpdate(n);
          }}
        />
      </td>
      <td className="px-2 py-1">
        <input
          className="w-14 rounded border border-gray-300 px-1 py-0.5 text-sm"
          type="number"
          min={0}
          value={local.rest_seconds ?? ""}
          onChange={(e) => {
            const n = {
              ...local,
              rest_seconds:
                e.target.value === "" ? null : Number(e.target.value),
            };
            setLocal(n);
            onUpdate(n);
          }}
        />
      </td>
      <td className="px-2 py-1">
        <button
          type="button"
          className="text-red-600 text-xs"
          onClick={onRemove}
        >
          Remove
        </button>
      </td>
    </tr>
  );
}

export function LocalDraftExerciseTable({
  exercises,
  onChange,
  nameById,
  onExerciseNameResolved,
}: {
  exercises: EditorExerciseLine[];
  onChange: (next: EditorExerciseLine[]) => void;
  nameById: Record<string, string>;
  onExerciseNameResolved?: (id: string, name: string) => void;
}) {
  const [items, setItems] = useState(exercises);

  useEffect(() => {
    setItems(exercises);
  }, [exercises]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setItems((prev) => {
      const oldIndex = prev.findIndex((r) => r.clientId === active.id);
      const newIndex = prev.findIndex((r) => r.clientId === over.id);
      if (oldIndex < 0 || newIndex < 0) return prev;
      const moved = arrayMove(prev, oldIndex, newIndex);
      const next = renumberOrders(moved);
      onChange(next);
      return next;
    });
  };

  const updateRow = (clientId: string, next: EditorExerciseLine) => {
    setItems((prev) => {
      const mapped = prev.map((r) => (r.clientId === clientId ? next : r));
      onChange(mapped);
      return mapped;
    });
  };

  const removeRow = (clientId: string) => {
    setItems((prev) => {
      const next = renumberOrders(prev.filter((r) => r.clientId !== clientId));
      onChange(next);
      return next;
    });
  };

  const [addQ, setAddQ] = useState("");
  const [addHits, setAddHits] = useState<{ id: string; name: string }[]>([]);
  const [addSearching, setAddSearching] = useState(false);
  const addTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (addTimer.current) clearTimeout(addTimer.current);
    if (!addQ.trim()) {
      setAddHits([]);
      return;
    }
    addTimer.current = setTimeout(async () => {
      setAddSearching(true);
      const res = await AdminService.searchExercisesCatalog(addQ, 50);
      setAddSearching(false);
      if (res.success && Array.isArray(res.exercises)) {
        setAddHits(res.exercises);
      } else setAddHits([]);
    }, 280);
    return () => {
      if (addTimer.current) clearTimeout(addTimer.current);
    };
  }, [addQ]);

  const appendExercise = (id: string, name: string) => {
    onExerciseNameResolved?.(id, name);
    setItems((prev) => {
      const line: EditorExerciseLine = {
        clientId: newClientId(),
        exercise_id: id,
        order_index: prev.length + 1,
        sets: 3,
        reps: null,
        reps_display: null,
        rest_seconds: 60,
        rest_display: null,
        notes: null,
        group_type: null,
        group_id: null,
      };
      const next = [...prev, line];
      onChange(next);
      return next;
    });
    setAddQ("");
    setAddHits([]);
  };

  const ids = items.map((r) => r.clientId);

  return (
    <div>
      {items.length === 0 ? (
        <p className="p-3 text-sm text-gray-500">No exercises in this workout.</p>
      ) : (
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
                  <SortableDraftRow
                    key={r.clientId}
                    row={r}
                    nameById={nameById}
                    onUpdate={(u) => updateRow(r.clientId, u)}
                    onRemove={() => removeRow(r.clientId)}
                    onExerciseNameResolved={onExerciseNameResolved}
                  />
                ))}
              </SortableContext>
            </tbody>
          </table>
        </DndContext>
      )}
      <p className="text-xs text-gray-500 px-2 py-2">
        Drag the grip to reorder. Order updates <code className="bg-gray-100 px-1 rounded">order_index</code>{" "}
        automatically.
      </p>
      <div className="border-t border-gray-100 pt-3 mt-1 space-y-2">
        <p className="text-xs font-medium text-gray-700">Add exercise</p>
        <div className="relative max-w-md">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            className="w-full pl-9 pr-3 py-1.5 text-sm rounded-lg border border-gray-300"
            placeholder="Search catalog to add…"
            value={addQ}
            onChange={(e) => setAddQ(e.target.value)}
          />
        </div>
        {addSearching && (
          <p className="text-xs text-gray-500">Searching…</p>
        )}
        {addHits.length > 0 && (
          <ul className="max-h-36 overflow-y-auto text-sm border border-gray-200 rounded-md divide-y divide-gray-100">
            {addHits.map((h) => (
              <li key={h.id}>
                <button
                  type="button"
                  className="w-full text-left px-3 py-2 hover:bg-gray-50"
                  onClick={() => appendExercise(h.id, h.name)}
                >
                  {h.name}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
