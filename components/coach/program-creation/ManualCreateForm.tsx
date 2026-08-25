"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CoachService } from "@/lib/services/coachService";
import {
  CoachAssignmentSection,
  type CoachAssignment,
} from "./CoachAssignmentSection";

function slugify(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 50);
}

export function ManualCreateForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [existingIds, setExistingIds] = useState<Set<string>>(new Set());
  const [idsLoaded, setIdsLoaded] = useState(false);
  const [planIdEdited, setPlanIdEdited] = useState(false);

  const [form, setForm] = useState({
    plan_name: "",
    plan_id: "",
    difficulty_level: "",
    description: "",
  });

  const [assignment, setAssignment] = useState<CoachAssignment>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // Coach only sees programs in their scope — using enriched list.
        const res = await CoachService.listWorkoutProgramsEnriched(
          true,
          1,
          1000,
        );
        const list = Array.isArray(res?.programs) ? res.programs : [];
        if (cancelled) return;
        setExistingIds(
          new Set(
            list
              .map((p: { plan_id?: string }) => String(p.plan_id ?? "").trim())
              .filter(Boolean),
          ),
        );
      } catch {
        /* duplicate check disabled */
      } finally {
        if (!cancelled) setIdsLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleNameChange = (name: string) => {
    const update: Partial<typeof form> = { plan_name: name };
    if (!planIdEdited) update.plan_id = slugify(name);
    setForm((f) => ({ ...f, ...update }));
  };

  const trimmedId = form.plan_id.trim();
  const idExists =
    idsLoaded && trimmedId.length > 0 && existingIds.has(trimmedId);
  const idAvailable =
    idsLoaded && trimmedId.length > 0 && !existingIds.has(trimmedId);

  const canSubmit =
    form.plan_name.trim().length > 0 &&
    trimmedId.length > 0 &&
    !idExists &&
    !!assignment &&
    !loading;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit || !assignment) return;

    setLoading(true);
    setError(null);

    const body: Record<string, unknown> = {
      plan_id: trimmedId,
      plan_name: form.plan_name.trim(),
      gender: "All",
      min_age: 0,
      max_age: 120,
      days_per_week: 5,
      description: form.description.trim() || null,
      equipment_required: [],
      status: "draft",
      assign_type: assignment.type,
      assign_to_id: assignment.id,
    };
    if (form.difficulty_level) body.difficulty_level = form.difficulty_level;

    const res = await CoachService.createWorkoutProgram(body);
    setLoading(false);

    if (res.success && res.program?.plan_id) {
      router.push(
        `/coach/workout-programs/${encodeURIComponent(res.program.plan_id)}`,
      );
    } else {
      setError(res.error || "Failed to create program");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {/* Program name */}
      <div>
        <label className="block text-sm font-medium text-gray-700">
          Program name
        </label>
        <input
          required
          className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          placeholder="e.g. Push Pull Legs"
          value={form.plan_name}
          onChange={(e) => handleNameChange(e.target.value)}
        />
      </div>

      {/* Plan ID */}
      <div>
        <label className="block text-sm font-medium text-gray-700">
          Plan ID
        </label>
        <input
          required
          className={`mt-1 block w-full rounded-lg border px-3 py-2 font-mono text-sm shadow-sm focus:ring-1 ${
            idExists
              ? "border-red-400 focus:border-red-500 focus:ring-red-500"
              : "border-gray-300 focus:border-blue-500 focus:ring-blue-500"
          }`}
          value={form.plan_id}
          onChange={(e) => {
            setPlanIdEdited(true);
            setForm((f) => ({ ...f, plan_id: e.target.value }));
          }}
        />
        <p className="mt-1 text-xs text-gray-500">
          Auto-generated from name. Edit if you prefer a different ID.
        </p>
        {idExists && (
          <p className="mt-1 text-xs text-red-600">
            This Plan ID is already in use.
          </p>
        )}
        {idAvailable && (
          <p className="mt-1 text-xs text-emerald-600">Available</p>
        )}
      </div>

      {/* Difficulty */}
      <div>
        <label className="block text-sm font-medium text-gray-700">Level</label>
        <select
          className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          value={form.difficulty_level}
          onChange={(e) =>
            setForm((f) => ({ ...f, difficulty_level: e.target.value }))
          }
        >
          <option value="">Not set</option>
          <option value="Beginner">Beginner</option>
          <option value="Intermediate">Intermediate</option>
          <option value="Advanced">Advanced</option>
        </select>
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-gray-700">
          Description
        </label>
        <textarea
          rows={3}
          className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          placeholder="Optional — what this program is about"
          value={form.description}
          onChange={(e) =>
            setForm((f) => ({ ...f, description: e.target.value }))
          }
        />
      </div>

      {/* Assignment (required for coach) */}
      <CoachAssignmentSection value={assignment} onChange={setAssignment} />

      <button
        type="submit"
        disabled={!canSubmit}
        className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? "Creating…" : "Create program"}
      </button>
      {!assignment && !loading && (
        <p className="text-center text-xs text-gray-500">
          Pick a focus moai or user above to enable creation.
        </p>
      )}
    </form>
  );
}
