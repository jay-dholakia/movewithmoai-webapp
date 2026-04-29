"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AdminService } from "@/lib/services/adminService";
import type { AdminCatalogExercise } from "@/lib/types/workout-builder";
import {
  EXERCISE_CATEGORY_OPTIONS,
  EXERCISE_EQUIPMENT_CHIPS,
  EXERCISE_LOG_TYPE_OPTIONS,
  exerciseCategoryLabel,
  exerciseLogTypeLabel,
} from "@/lib/exercise-catalog-options";
import { Loader2, Plus, Search } from "lucide-react";
import {
  adminInputClass,
  adminSelectClass,
} from "@/components/admin/workout-builder/formStyles";
import { AdminProgramsTabs } from "@/components/admin/AdminSectionTabs";
import { cn } from "@/lib/utils";

function formatEquipment(eq: unknown): string {
  if (Array.isArray(eq))
    return eq.map((x) => String(x).trim()).filter(Boolean).join(", ");
  if (typeof eq === "string" && eq.trim()) return eq.trim();
  return "—";
}

function truncate(s: string | null | undefined, max: number): string {
  if (!s) return "—";
  const t = s.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max)}…`;
}

export default function AdminExercisesLibraryPage() {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [logType, setLogType] = useState("");
  const [muscleGroup, setMuscleGroup] = useState("");
  const [equipmentIds, setEquipmentIds] = useState<string[]>([]);
  const [instructions, setInstructions] = useState("");
  const [formVideoUrl, setFormVideoUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [lastCreated, setLastCreated] = useState<AdminCatalogExercise | null>(
    null,
  );

  const [searchQ, setSearchQ] = useState("");
  const [searching, setSearching] = useState(false);
  const [hits, setHits] = useState<AdminCatalogExercise[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);

  const equipmentLabels = useMemo(
    () =>
      equipmentIds
        .map((id) => EXERCISE_EQUIPMENT_CHIPS.find((c) => c.id === id)?.label)
        .filter(Boolean) as string[],
    [equipmentIds],
  );

  const runSearch = useCallback(async (q: string) => {
    setSearching(true);
    setSearchError(null);
    const res = await AdminService.searchExercisesCatalog(q, 100);
    setSearching(false);
    if (res.success && Array.isArray(res.exercises)) {
      setHits(res.exercises as AdminCatalogExercise[]);
    } else {
      setHits([]);
      setSearchError(res.error || "Search failed");
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      void runSearch(searchQ);
    }, 280);
    return () => clearTimeout(t);
  }, [searchQ, runSearch]);

  const toggleEquipment = (id: string) => {
    setEquipmentIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const resetForm = () => {
    setName("");
    setCategory("");
    setLogType("");
    setMuscleGroup("");
    setEquipmentIds([]);
    setInstructions("");
    setFormVideoUrl("");
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    setSaving(true);
    const res = await AdminService.createExercise({
      name: trimmed,
      category: category.trim() || null,
      log_type: logType.trim() || null,
      muscle_group: muscleGroup.trim() || null,
      instructions: instructions.trim() || null,
      equipment: equipmentLabels.length > 0 ? equipmentLabels : null,
      form_video_url: formVideoUrl.trim() || null,
    });
    setSaving(false);
    if (res.success && res.exercise) {
      const ex = res.exercise as AdminCatalogExercise;
      setLastCreated(ex);
      resetForm();
      void runSearch(searchQ);
    } else {
      alert(res.error || "Could not create exercise");
    }
  };

  return (
    <div className="p-8 max-w-4xl">
      <AdminProgramsTabs />
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            Exercise library
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Add moves to the global <code className="text-xs bg-gray-100 px-1 rounded">exercises</code>{" "}
            table. Category and log type use fixed lists; equipment uses catalog tags only.
          </p>
        </div>
        <Link
          href="/admin/workout-templates"
          className="text-sm text-blue-600 hover:text-blue-800"
        >
          Workout library →
        </Link>
      </div>

      {lastCreated && (
        <div className="mb-6 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-900">
          <p className="font-medium">Saved: {lastCreated.name}</p>
          <p className="mt-1 font-mono text-xs text-green-800 break-all">
            id: {lastCreated.id}
          </p>
          <button
            type="button"
            className="mt-2 text-xs text-green-800 underline hover:no-underline"
            onClick={() => setLastCreated(null)}
          >
            Dismiss
          </button>
        </div>
      )}

      <form
        onSubmit={(e) => void handleCreate(e)}
        className="mb-10 rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-4"
      >
        <h2 className="text-lg font-medium text-gray-900 flex items-center gap-2">
          <Plus className="h-5 w-5 text-blue-600" />
          New exercise
        </h2>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Name <span className="text-red-600">*</span>
          </label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={adminInputClass}
            placeholder="e.g. Barbell Romanian deadlift"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className={adminSelectClass}
            >
              <option value="">— None —</option>
              {EXERCISE_CATEGORY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Log type
            </label>
            <select
              value={logType}
              onChange={(e) => setLogType(e.target.value)}
              className={adminSelectClass}
            >
              <option value="">— None —</option>
              {EXERCISE_LOG_TYPE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              How clients log this movement (reps, weight, time, etc.).
            </p>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Muscle group
          </label>
          <input
            type="text"
            value={muscleGroup}
            onChange={(e) => setMuscleGroup(e.target.value)}
            className={adminInputClass}
            placeholder="e.g. hamstrings, shoulders"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Equipment{" "}
            <span className="text-gray-500 font-normal">
              (tap tags; only catalog values are saved)
            </span>
          </label>
          <div className="mt-2 flex flex-wrap gap-2">
            {EXERCISE_EQUIPMENT_CHIPS.map((chip) => {
              const on = equipmentIds.includes(chip.id);
              return (
                <button
                  key={chip.id}
                  type="button"
                  onClick={() => toggleEquipment(chip.id)}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                    on
                      ? "border-blue-600 bg-blue-50 text-blue-900"
                      : "border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50",
                  )}
                >
                  {chip.label}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Instructions
          </label>
          <textarea
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            rows={5}
            className={adminInputClass}
            placeholder="Setup, range of motion, tempo, safety cues…"
          />
          <p className="text-xs text-gray-500 mt-1">
            Stored on the exercise row for coaches / future member UI.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Form / video URL
          </label>
          <input
            type="url"
            value={formVideoUrl}
            onChange={(e) => setFormVideoUrl(e.target.value)}
            className={adminInputClass}
            placeholder="https://…"
          />
          <p className="text-xs text-gray-500 mt-1">
            <code className="text-xs bg-gray-100 px-1 rounded">form_video_url</code>
          </p>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={saving || !name.trim()}
            className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving…
              </>
            ) : (
              "Save exercise"
            )}
          </button>
        </div>
      </form>

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center gap-3">
          <h2 className="text-lg font-medium text-gray-900 flex items-center gap-2">
            <Search className="h-5 w-5 text-gray-500" />
            Browse catalog
          </h2>
          <div className="flex-1 min-w-0">
            <input
              type="search"
              value={searchQ}
              onChange={(e) => setSearchQ(e.target.value)}
              className={adminInputClass}
              placeholder="Filter by name…"
            />
          </div>
        </div>
        {searchError && (
          <p className="px-4 py-2 text-sm text-red-600">{searchError}</p>
        )}
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-left text-gray-600">
              <tr>
                <th className="px-4 py-2 font-medium">Name</th>
                <th className="px-4 py-2 font-medium">Category</th>
                <th className="px-4 py-2 font-medium">Log type</th>
                <th className="px-4 py-2 font-medium">Muscle</th>
                <th className="px-4 py-2 font-medium">Equipment</th>
                <th className="px-4 py-2 font-medium">Instructions</th>
                <th className="px-4 py-2 font-medium">Video / form</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {searching && hits.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                    <Loader2 className="h-6 w-6 animate-spin inline text-blue-600" />
                  </td>
                </tr>
              ) : hits.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-8 text-center text-gray-500"
                  >
                    No exercises match this filter.
                  </td>
                </tr>
              ) : (
                hits.map((row) => (
                  <tr key={row.id} className="hover:bg-gray-50/80">
                    <td className="px-4 py-2 font-medium text-gray-900">
                      {row.name}
                    </td>
                    <td className="px-4 py-2 text-gray-600">
                      {exerciseCategoryLabel(row.category)}
                    </td>
                    <td className="px-4 py-2 text-gray-600">
                      {exerciseLogTypeLabel(row.log_type)}
                    </td>
                    <td className="px-4 py-2 text-gray-600">
                      {row.muscle_group ?? "—"}
                    </td>
                    <td
                      className="px-4 py-2 text-gray-600 max-w-[180px] truncate"
                      title={formatEquipment(row.equipment)}
                    >
                      {formatEquipment(row.equipment)}
                    </td>
                    <td
                      className="px-4 py-2 text-gray-600 max-w-[200px]"
                      title={row.instructions ?? undefined}
                    >
                      {truncate(row.instructions, 72)}
                    </td>
                    <td className="px-4 py-2">
                      {row.form_video_url ? (
                        <a
                          href={row.form_video_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline truncate max-w-[120px] inline-block align-bottom"
                        >
                          Link
                        </a>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
