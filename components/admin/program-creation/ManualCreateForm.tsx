// app/admin/workout-programs/new/_components/ManualCreateForm.tsx

"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AdminService } from "@/lib/services/adminService";
import {
  PaidAssignmentSection,
  type PaidAssignment,
} from "./PaidAssignmentSection";

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
    is_paid: false,
  });

  const [assignment, setAssignment] = useState<PaidAssignment>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await AdminService.listWorkoutPrograms(true);
        const list = Array.isArray(res) ? res : (res?.programs ?? []);
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

  // Auto-generate plan_id from name unless manually edited
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
    !loading;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

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
      is_paid: form.is_paid,
      status: "draft",
    };
    if (form.difficulty_level) body.difficulty_level = form.difficulty_level;
    if (form.is_paid && assignment) {
      body.assign_type = assignment.type;
      body.assign_to_id = assignment.id;
    }

    const res = await AdminService.createWorkoutProgram(body);
    setLoading(false);

    if (res.success && res.program?.plan_id) {
      router.push(
        `/admin/workout-programs/${encodeURIComponent(res.program.plan_id)}`,
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

      {/* Paid toggle */}
      <div className="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-3">
        <div>
          <p className="text-sm font-medium text-gray-700">Paid program</p>
          <p className="text-xs text-gray-500">
            Paid programs are for Focus Moai or individually assigned users.
            Free programs are available to everyone.
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={form.is_paid}
          onClick={() => {
            setForm((f) => ({ ...f, is_paid: !f.is_paid }));
            if (form.is_paid) setAssignment(null); // clear when toggling off
          }}
          className={`cursor-pointer relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
            form.is_paid ? "bg-blue-600" : "bg-gray-300"
          }`}
        >
          <span
            className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${
              form.is_paid ? "translate-x-5" : "translate-x-0.5"
            }`}
          />
        </button>
      </div>

      {form.is_paid && (
        <PaidAssignmentSection value={assignment} onChange={setAssignment} />
      )}

      <button
        type="submit"
        disabled={!canSubmit}
        className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? "Creating…" : "Create program"}
      </button>
    </form>
  );
}
