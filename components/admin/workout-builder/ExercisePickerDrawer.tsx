"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Check, Filter, Loader2, Plus, Search, X } from "lucide-react";
import { AdminService } from "@/lib/services/adminService";
import type { AdminCatalogExercise } from "@/lib/types/workout-builder";
import { cn } from "@/lib/utils";
import {
  adminControlClass,
  adminInputClass,
  adminSelectClass,
} from "./formStyles";

export type PickerMode = "individual" | "superset" | "circuit";

type Props = {
  open: boolean;
  mode: PickerMode;
  onClose: () => void;
  onConfirm: (exercises: AdminCatalogExercise[]) => Promise<void> | void;
};

const PAGE_SIZE = 15;

const EQUIPMENT_OPTIONS = [
  "Bodyweight",
  "Dumbbells",
  "Barbell + Plates",
  "Kettlebells",
  "Bench",
  "Pull-Up Bar",
  "Cable Machine / Functional Trainer",
  "Machines",
];

const MUSCLE_OPTIONS = [
  "Chest",
  "Back",
  "Delts",
  "Biceps",
  "Triceps",
  "Quads",
  "Glutes",
  "Hamstrings",
  "Calves",
  "Core",
];

export function ExercisePickerDrawer({
  open,
  mode,
  onClose,
  onConfirm,
}: Props) {
  const isMulti = mode !== "individual";

  const [q, setQ] = useState("");
  const [equipment, setEquipment] = useState<string | null>(null);
  const [muscle, setMuscle] = useState<string | null>(null);

  const [hits, setHits] = useState<AdminCatalogExercise[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [searching, setSearching] = useState(false);

  // Ordered selection so supersets/circuits keep the coach's intended sequence.
  const [selected, setSelected] = useState<AdminCatalogExercise[]>([]);
  const [confirming, setConfirming] = useState(false);

  const [createOpen, setCreateOpen] = useState(false);

  // Reset when drawer opens
  useEffect(() => {
    if (open) {
      setQ("");
      setEquipment(null);
      setMuscle(null);
      setSelected([]);
      setPage(1);
      setCreateOpen(false);
    }
  }, [open, mode]);

  // Debounced search
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const runSearch = useCallback(
    async (opts: {
      q: string;
      equipment: string | null;
      muscle: string | null;
      page: number;
    }) => {
      setSearching(true);
      const res = await AdminService.searchExercisesCatalog(opts.q, {
        page: opts.page,
        pageSize: PAGE_SIZE,
        equipment: opts.equipment,
        muscle: opts.muscle,
      });
      setSearching(false);
      if (res.success && Array.isArray(res.exercises)) {
        setHits(res.exercises as AdminCatalogExercise[]);
        setTotal(res.total ?? res.exercises.length);
      } else {
        setHits([]);
        setTotal(0);
      }
    },
    [],
  );

  useEffect(() => {
    if (!open) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      void runSearch({ q, equipment, muscle, page });
    }, 250);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [open, q, equipment, muscle, page, runSearch]);

  // Reset to page 1 whenever a filter/query changes
  useEffect(() => {
    setPage(1);
  }, [q, equipment, muscle]);

  const isSelected = (id: string) => selected.some((e) => e.id === id);

  const toggleSelect = (ex: AdminCatalogExercise) => {
    if (isMulti) {
      setSelected((prev) =>
        prev.some((e) => e.id === ex.id)
          ? prev.filter((e) => e.id !== ex.id)
          : [...prev, ex],
      );
    } else {
      setSelected([ex]);
    }
  };

  const handleConfirm = async () => {
    if (selected.length === 0) return;
    if (isMulti && selected.length < 2) {
      alert(
        `A ${mode} needs at least 2 exercises. Pick another, or start over with an individual block.`,
      );
      return;
    }
    setConfirming(true);
    try {
      await onConfirm(selected);
      // Parent closes the drawer on success
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to add exercises");
    } finally {
      setConfirming(false);
    }
  };

  const handleCreated = (created: AdminCatalogExercise) => {
    // Auto-select and prepend to results
    setHits((prev) => [created, ...prev.filter((e) => e.id !== created.id)]);
    setSelected((prev) => (isMulti ? [...prev, created] : [created]));
    setCreateOpen(false);
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const title =
    mode === "individual"
      ? "Add exercise"
      : mode === "superset"
        ? "Build superset"
        : "Build circuit";

  const subtitle = isMulti
    ? "Pick 2 or more exercises. They'll be grouped in the order you pick them."
    : "Pick one exercise.";

  return (
    <>
      <div
        className={cn(
          "fixed inset-0 z-40 bg-black/30 transition-opacity",
          open ? "opacity-100" : "opacity-0 pointer-events-none",
        )}
        onClick={onClose}
        aria-hidden={!open}
      />

      <aside
        className={cn(
          "fixed inset-y-0 right-0 z-50 w-full sm:w-130 bg-white shadow-2xl flex flex-col transition-transform",
          open ? "translate-x-0" : "translate-x-full",
        )}
        role="dialog"
        aria-label={title}
      >
        <div className="px-5 py-4 border-b border-gray-200 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
            <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {createOpen ? (
          <CreateExerciseForm
            onCancel={() => setCreateOpen(false)}
            onCreated={handleCreated}
          />
        ) : (
          <>
            {/* Search + filters */}
            <div className="px-5 py-3 border-b border-gray-100 space-y-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  autoFocus
                  placeholder="Search exercises…"
                  className={cn(adminControlClass, "pl-9")}
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                />
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="inline-flex items-center gap-1 text-gray-500">
                  <Filter className="h-3 w-3" /> Filters
                </span>
                <FilterPill
                  label="Equipment"
                  value={equipment}
                  options={EQUIPMENT_OPTIONS}
                  onChange={setEquipment}
                />
                <FilterPill
                  label="Muscle"
                  value={muscle}
                  options={MUSCLE_OPTIONS}
                  onChange={setMuscle}
                />
                {(equipment || muscle) && (
                  <button
                    type="button"
                    onClick={() => {
                      setEquipment(null);
                      setMuscle(null);
                    }}
                    className="text-gray-500 hover:text-gray-800 underline"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            {/* Results */}
            <div className="flex-1 overflow-y-auto">
              {searching && hits.length === 0 && (
                <div className="p-8 flex items-center justify-center text-sm text-gray-500">
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Searching…
                </div>
              )}
              {!searching && hits.length === 0 && (
                <div className="p-8 text-center text-sm text-gray-500">
                  No exercises match.
                  <button
                    type="button"
                    onClick={() => setCreateOpen(true)}
                    className="ml-1 text-blue-600 hover:text-blue-800 underline"
                  >
                    Create one?
                  </button>
                </div>
              )}
              <ul className="divide-y divide-gray-100">
                {hits.map((ex) => (
                  <ExerciseResultRow
                    key={ex.id}
                    exercise={ex}
                    selected={isSelected(ex.id)}
                    multi={isMulti}
                    onToggle={() => toggleSelect(ex)}
                  />
                ))}
              </ul>
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-5 py-3 text-xs text-gray-500 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1 || searching}
                    className="rounded-md border border-gray-200 px-2 py-1 disabled:opacity-40"
                  >
                    Prev
                  </button>
                  <span>
                    Page {page} of {totalPages}
                  </span>
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages || searching}
                    className="rounded-md border border-gray-200 px-2 py-1 disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-5 py-3 border-t border-gray-200 bg-gray-50/60 space-y-3">
              <button
                type="button"
                onClick={() => setCreateOpen(true)}
                className="w-full inline-flex items-center justify-center gap-1.5 py-2 rounded-lg border border-dashed border-gray-300 text-sm text-gray-700 hover:border-blue-400 hover:text-blue-700 transition"
              >
                <Plus className="h-4 w-4" />
                Create new exercise
              </button>
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs text-gray-600">
                  {selected.length === 0
                    ? "Nothing selected"
                    : isMulti
                      ? `${selected.length} selected`
                      : selected[0].name}
                </p>
                <button
                  type="button"
                  onClick={handleConfirm}
                  disabled={
                    selected.length === 0 ||
                    confirming ||
                    (isMulti && selected.length < 2)
                  }
                  className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {confirming ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Adding…
                    </>
                  ) : isMulti ? (
                    `Add ${selected.length} to ${mode}`
                  ) : (
                    "Add to workout"
                  )}
                </button>
              </div>
            </div>
          </>
        )}
      </aside>
    </>
  );
}

/* ---------------- Sub-components ---------------- */

function FilterPill({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string | null;
  options: string[];
  onChange: (v: string | null) => void;
}) {
  return (
    <select
      className={cn(
        adminSelectClass,
        "text-xs py-1 px-2 h-auto",
        value && "border-blue-300 bg-blue-50 text-blue-800",
      )}
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value || null)}
    >
      <option value="">{label}: any</option>
      {options.map((o) => (
        <option key={o} value={o}>
          {label}: {o}
        </option>
      ))}
    </select>
  );
}

function ExerciseResultRow({
  exercise,
  selected,
  multi,
  onToggle,
}: {
  exercise: AdminCatalogExercise;
  selected: boolean;
  multi: boolean;
  onToggle: () => void;
}) {
  const equipmentText = Array.isArray(exercise.equipment)
    ? (exercise.equipment as string[]).join(" · ")
    : "—";
  const muscleText = exercise.muscle_group || exercise.category || "—";

  return (
    <li>
      <button
        type="button"
        onClick={onToggle}
        className={cn(
          "w-full flex items-center gap-3 px-5 py-3 text-left hover:bg-gray-50 transition",
          selected && "bg-blue-50/60",
        )}
      >
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">
            {exercise.name}
          </p>
          <p className="text-xs text-gray-500 truncate">
            {equipmentText}
            {muscleText && (
              <>
                <span className="mx-1.5 text-gray-300">·</span>
                {muscleText}
              </>
            )}
          </p>
        </div>
        {selected ? (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 shrink-0">
            <Check className="h-4 w-4" />
            {multi ? "Selected" : "Picked"}
          </span>
        ) : (
          <span className="text-xs font-medium text-blue-600 shrink-0">
            {multi ? "Add" : "Pick"}
          </span>
        )}
      </button>
    </li>
  );
}

function CreateExerciseForm({
  onCancel,
  onCreated,
}: {
  onCancel: () => void;
  onCreated: (ex: AdminCatalogExercise) => void;
}) {
  const [form, setForm] = useState({
    name: "",
    category: "",
    muscle_group: "",
    log_type: "weight_reps",
    equipment: "",
    instructions: "",
  });
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      alert("Exercise name is required.");
      return;
    }
    setSaving(true);
    const res = await AdminService.createExercise({
      name: form.name.trim(),
      category: form.category.trim() || null,
      muscle_group: form.muscle_group.trim() || null,
      log_type: form.log_type || null,
      equipment: form.equipment
        ? form.equipment
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
        : null,
      instructions: form.instructions.trim() || null,
      progressive_overload: false,
    });
    setSaving(false);
    if (res.success && res.exercise) {
      onCreated(res.exercise as AdminCatalogExercise);
    } else {
      alert(res.error || "Failed to create exercise");
    }
  };

  return (
    <form
      onSubmit={submit}
      className="flex-1 overflow-y-auto px-5 py-4 space-y-3"
    >
      <h3 className="text-sm font-semibold text-gray-900">
        Create new exercise
      </h3>
      <label className="block text-sm">
        <span className="text-gray-600">Name *</span>
        <input
          className={adminInputClass}
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="e.g. Barbell Overhead Press"
          autoFocus
        />
      </label>
      <div className="grid grid-cols-2 gap-3 text-sm">
        <label className="block">
          <span className="text-gray-600">Muscle group</span>
          <input
            className={adminInputClass}
            value={form.muscle_group}
            onChange={(e) => setForm({ ...form, muscle_group: e.target.value })}
            placeholder="e.g. Delts"
          />
        </label>
        <label className="block">
          <span className="text-gray-600">Category</span>
          <input
            className={adminInputClass}
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
            placeholder="e.g. Strength - Upper Body"
          />
        </label>
        <label className="block">
          <span className="text-gray-600">Log type</span>
          <select
            className={`cursor-pointer ${adminSelectClass}`}
            value={form.log_type}
            onChange={(e) => setForm({ ...form, log_type: e.target.value })}
          >
            <option value="weight_reps">weight_reps</option>
            <option value="reps">reps</option>
            <option value="duration">duration</option>
            <option value="distance">distance</option>
          </select>
        </label>
        <label className="block">
          <span className="text-gray-600">Equipment (comma-separated)</span>
          <input
            className={adminInputClass}
            value={form.equipment}
            onChange={(e) => setForm({ ...form, equipment: e.target.value })}
            placeholder="Barbell + Plates, Bench"
          />
        </label>
      </div>
      <label className="block text-sm">
        <span className="text-gray-600">Instructions</span>
        <textarea
          rows={3}
          className={adminInputClass}
          value={form.instructions}
          onChange={(e) => setForm({ ...form, instructions: e.target.value })}
        />
      </label>
      <div className="flex items-center justify-end gap-2 pt-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-40"
        >
          {saving ? "Creating…" : "Create & add"}
        </button>
      </div>
    </form>
  );
}
