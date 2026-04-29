"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { AdminService } from "@/lib/services/adminService";
import type { WorkoutProgramRow } from "@/lib/types/workout-builder";
import type { WorkoutTemplateRow } from "@/lib/types/workout-builder";
import { Trash2, Search } from "lucide-react";
import {
  SortableExerciseTable,
  type ExRow,
} from "@/components/admin/workout-builder/SortableExerciseTable";
import {
  adminControlClass,
  adminInputClass,
  adminSelectClass,
} from "@/components/admin/workout-builder/formStyles";
import { AdminTemplateEditorSkeleton } from "@/components/admin/AdminLoadingSkeleton";
import { AdminProgramsTabs } from "@/components/admin/AdminSectionTabs";

export default function WorkoutTemplateEditorPage() {
  const params = useParams();
  const id = String(params.id || "");
  const workoutIdRef = useRef(id);
  workoutIdRef.current = id;

  const [workout, setWorkout] = useState<WorkoutTemplateRow | null>(null);
  const [programs, setPrograms] = useState<WorkoutProgramRow[]>([]);
  const [rows, setRows] = useState<ExRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingMeta, setSavingMeta] = useState(false);

  const [meta, setMeta] = useState({
    title: "",
    type: "full" as WorkoutTemplateRow["type"],
    plan_id: "",
    order_index: "",
    description: "",
    is_circuit: false,
  });

  const [searchQ, setSearchQ] = useState("");
  const [searchHits, setSearchHits] = useState<
    { id: string; name: string }[]
  >([]);
  const [searching, setSearching] = useState(false);
  const [pickExerciseId, setPickExerciseId] = useState<string | null>(null);
  const [addForm, setAddForm] = useState({
    order_index: "1",
    sets: "3",
    reps: "",
    reps_display: "",
    rest_seconds: "",
    group_type: "",
    group_id: "",
    notes: "",
  });

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    const [w, p, ex] = await Promise.all([
      AdminService.getWorkoutTemplate(id),
      AdminService.listWorkoutPrograms(true),
      AdminService.listTemplateExercises(id),
    ]);
    if (w.success && w.workout) {
      setWorkout(w.workout);
      const wo = w.workout;
      setMeta({
        title: wo.title || "",
        type: (wo.type as WorkoutTemplateRow["type"]) || "full",
        plan_id: wo.plan_id || "",
        order_index:
          wo.order_index !== null && wo.order_index !== undefined
            ? String(wo.order_index)
            : "",
        description: wo.description || "",
        is_circuit: Boolean(wo.is_circuit),
      });
    } else {
      setError(w.error || "Workout not found");
    }
    if (p.success && Array.isArray(p.programs)) setPrograms(p.programs);
    if (ex.success && Array.isArray(ex.exercises))
      setRows(ex.exercises as ExRow[]);
    setLoading(false);
  }, [id]);

  const reloadExercises = useCallback(async () => {
    const wid = workoutIdRef.current;
    if (!wid) return;
    const ex = await AdminService.listTemplateExercises(wid);
    if (workoutIdRef.current !== wid) return;
    if (ex.success && Array.isArray(ex.exercises))
      setRows(ex.exercises as ExRow[]);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const saveMeta = async () => {
    setSavingMeta(true);
    const body: Record<string, unknown> = {
      title: meta.title.trim(),
      type: meta.type,
      description: meta.description.trim() || null,
      is_circuit: meta.is_circuit,
    };
    if (meta.plan_id === "") body.plan_id = null;
    else body.plan_id = meta.plan_id;
    if (meta.order_index === "") body.order_index = null;
    else body.order_index = Number(meta.order_index);

    const res = await AdminService.updateWorkoutTemplate(id, body);
    setSavingMeta(false);
    if (res.success && res.workout) {
      setWorkout(res.workout);
      alert("Saved workout");
    } else alert(res.error || "Save failed");
  };

  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (!searchQ.trim()) {
      setSearchHits([]);
      return;
    }
    searchTimer.current = setTimeout(async () => {
      setSearching(true);
      const res = await AdminService.searchExercisesCatalog(searchQ, 60);
      setSearching(false);
      if (res.success && Array.isArray(res.exercises)) {
        setSearchHits(res.exercises);
      } else setSearchHits([]);
    }, 300);
    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, [searchQ]);

  const addExercise = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pickExerciseId) {
      alert("Pick an exercise from search");
      return;
    }
    const res = await AdminService.addTemplateExercise(id, {
      exercise_id: pickExerciseId,
      order_index: Number(addForm.order_index) || 1,
      sets: Number(addForm.sets) || 1,
      reps: addForm.reps === "" ? null : Number(addForm.reps),
      reps_display: addForm.reps_display.trim() || null,
      rest_seconds:
        addForm.rest_seconds === "" ? null : Number(addForm.rest_seconds),
      group_type: addForm.group_type || null,
      group_id: addForm.group_id === "" ? null : Number(addForm.group_id),
      notes: addForm.notes.trim() || null,
    });
    if (res.success) {
      setPickExerciseId(null);
      setSearchQ("");
      setSearchHits([]);
      await reloadExercises();
    } else alert(res.error || "Failed to add");
  };

  const saveRow = async (row: ExRow) => {
    const res = await AdminService.updateWorkoutExerciseRow(row.id, {
      order_index: row.order_index,
      sets: row.sets,
      reps: row.reps,
      reps_display: row.reps_display,
      rest_seconds: row.rest_seconds,
      notes: row.notes,
      group_id: row.group_id,
      group_type: row.group_type === "" ? null : row.group_type,
    });
    if (res.success) await reloadExercises();
    else alert(res.error || "Update failed");
  };

  const deleteRow = async (rowId: string) => {
    if (!confirm("Remove this exercise from the workout?")) return;
    const res = await AdminService.deleteWorkoutExerciseRow(rowId);
    if (res.success) await reloadExercises();
    else alert(res.error || "Delete failed");
  };

  const deleteWorkout = async () => {
    if (!confirm("Delete this workout template and all its exercises?")) return;
    const res = await AdminService.deleteWorkoutTemplate(id);
    if (res.success) {
      window.location.href = "/admin/workout-templates";
    } else alert(res.error || "Delete failed");
  };

  if (!id) return null;

  return (
    <div className="p-8 max-w-5xl">
      <AdminProgramsTabs />
      <div className="flex gap-4 mb-6">
        <Link
          href="/admin/workout-templates"
          className="text-sm text-blue-600 hover:text-blue-800"
        >
          ← Library
        </Link>
        <Link
          href="/admin/workout-programs"
          className="text-sm text-blue-600 hover:text-blue-800"
        >
          Programs
        </Link>
      </div>

      {loading && (
        <div aria-busy="true" aria-label="Loading workout template">
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
          <div className="flex justify-between items-start mb-6">
            <h1 className="text-2xl font-semibold text-gray-900">
              Edit workout
            </h1>
            <button
              type="button"
              onClick={deleteWorkout}
              className="text-sm text-red-600 hover:text-red-800 inline-flex items-center gap-1"
            >
              <Trash2 className="h-4 w-4" />
              Delete workout
            </button>
          </div>

          <section className="rounded-lg border border-gray-200 bg-white p-4 mb-8 space-y-3">
            <h2 className="text-sm font-semibold text-gray-900">Template</h2>
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
                  className={adminSelectClass}
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
                  className={adminSelectClass}
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
                <span className="text-gray-600">Order in program</span>
                <input
                  className={adminInputClass}
                  value={meta.order_index}
                  onChange={(e) =>
                    setMeta({ ...meta, order_index: e.target.value })
                  }
                  placeholder="e.g. 0, 1, 2…"
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
              <label className="flex items-center gap-2 md:col-span-2">
                <input
                  type="checkbox"
                  checked={meta.is_circuit}
                  onChange={(e) =>
                    setMeta({ ...meta, is_circuit: e.target.checked })
                  }
                />
                <span className="text-gray-700">Circuit workout</span>
              </label>
            </div>
            <button
              type="button"
              onClick={saveMeta}
              disabled={savingMeta}
              className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {savingMeta ? "Saving…" : "Save template"}
            </button>
          </section>

          <section className="mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              Exercises
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              Each line is a row in{" "}
              <code className="text-xs bg-gray-100 px-1 rounded">workout_exercises</code>
              : <strong>order_index</strong>, <strong>sets</strong>,{" "}
              <strong>reps</strong> (optional when not applicable),{" "}
              <strong>group_type</strong> (circuit / superset) and optional{" "}
              <strong>group_id</strong> to pair movements.
            </p>

            <div className="overflow-x-auto border border-gray-200 rounded-lg">
              <SortableExerciseTable
                workoutId={id}
                rows={rows}
                onSave={saveRow}
                onDelete={deleteRow}
                onReload={reloadExercises}
              />
            </div>
          </section>

          <section className="rounded-lg border border-dashed border-gray-300 p-4">
            <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2 mb-3">
              <Search className="h-4 w-4" />
              Add exercise
            </h3>
            <input
              type="text"
              placeholder="Search exercise name…"
              className={`max-w-md mb-2 ${adminControlClass}`}
              value={searchQ}
              onChange={(e) => setSearchQ(e.target.value)}
            />
            {searching && (
              <p className="text-xs text-gray-500 mb-2">Searching…</p>
            )}
            <ul className="max-h-40 overflow-y-auto border rounded mb-3 divide-y">
              {searchHits.map((h) => (
                <li key={h.id}>
                  <button
                    type="button"
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 ${
                      pickExerciseId === h.id ? "bg-blue-50" : ""
                    }`}
                    onClick={() => setPickExerciseId(h.id)}
                  >
                    {h.name}
                  </button>
                </li>
              ))}
            </ul>
            <form
              onSubmit={addExercise}
              className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm"
            >
              <label>
                <span className="text-gray-600 text-xs">Order</span>
                <input
                  className={adminInputClass}
                  value={addForm.order_index}
                  onChange={(e) =>
                    setAddForm({ ...addForm, order_index: e.target.value })
                  }
                />
              </label>
              <label>
                <span className="text-gray-600 text-xs">Sets *</span>
                <input
                  className={adminInputClass}
                  value={addForm.sets}
                  onChange={(e) =>
                    setAddForm({ ...addForm, sets: e.target.value })
                  }
                />
              </label>
              <label>
                <span className="text-gray-600 text-xs">Reps</span>
                <input
                  className={adminInputClass}
                  value={addForm.reps}
                  onChange={(e) =>
                    setAddForm({ ...addForm, reps: e.target.value })
                  }
                  placeholder="optional"
                />
              </label>
              <label>
                <span className="text-gray-600 text-xs">Reps display</span>
                <input
                  className={adminInputClass}
                  value={addForm.reps_display}
                  onChange={(e) =>
                    setAddForm({ ...addForm, reps_display: e.target.value })
                  }
                  placeholder="e.g. 30s"
                />
              </label>
              <label>
                <span className="text-gray-600 text-xs">Group type</span>
                <select
                  className={adminSelectClass}
                  value={addForm.group_type}
                  onChange={(e) =>
                    setAddForm({ ...addForm, group_type: e.target.value })
                  }
                >
                  <option value="">—</option>
                  <option value="circuit">circuit</option>
                  <option value="superset">superset</option>
                </select>
              </label>
              <label>
                <span className="text-gray-600 text-xs">Group id</span>
                <input
                  className={adminInputClass}
                  value={addForm.group_id}
                  onChange={(e) =>
                    setAddForm({ ...addForm, group_id: e.target.value })
                  }
                  placeholder="e.g. 1"
                />
              </label>
              <label>
                <span className="text-gray-600 text-xs">Rest (s)</span>
                <input
                  className={adminInputClass}
                  value={addForm.rest_seconds}
                  onChange={(e) =>
                    setAddForm({ ...addForm, rest_seconds: e.target.value })
                  }
                />
              </label>
              <label className="col-span-2 md:col-span-4">
                <span className="text-gray-600 text-xs">Notes</span>
                <input
                  className={adminInputClass}
                  value={addForm.notes}
                  onChange={(e) =>
                    setAddForm({ ...addForm, notes: e.target.value })
                  }
                />
              </label>
              <div className="col-span-2 md:col-span-4">
                <button
                  type="submit"
                  className="px-4 py-2 bg-gray-900 text-white text-sm rounded-lg hover:bg-gray-800"
                >
                  Add to workout
                </button>
              </div>
            </form>
          </section>
        </>
      )}
    </div>
  );
}
