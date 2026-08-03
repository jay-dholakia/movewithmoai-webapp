"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AdminService } from "@/lib/services/adminService";
import { AdminProgramsTabs } from "@/components/admin/AdminSectionTabs";

export default function NewWorkoutProgramPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Existing plan_ids for duplicate detection
  const [existingIds, setExistingIds] = useState<Set<string>>(new Set());
  const [idsLoaded, setIdsLoaded] = useState(false);

  const [form, setForm] = useState({
    plan_id: "",
    plan_name: "",
    gender: "All",
    min_age: "0",
    max_age: "120",
    days_per_week: "3",
    description: "",
    difficulty_level: "",
    is_paid: false,
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await AdminService.listWorkoutPrograms();
        const list = Array.isArray(res) ? res : (res?.programs ?? []);
        if (cancelled) return;
        setExistingIds(
          new Set(
            list
              .map((p: { plan_id?: string | null }) =>
                String(p.plan_id ?? "").trim(),
              )
              .filter(Boolean),
          ),
        );
        setIdsLoaded(true);
      } catch (err) {
        console.error("Failed to load plan_ids for duplicate check:", err);
        if (!cancelled) {
          setIdsLoaded(true);
          setError(
            "Could not load existing plan IDs — duplicate check is disabled.",
          );
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const trimmedPlanId = form.plan_id.trim();
  const planIdExists =
    idsLoaded && trimmedPlanId.length > 0 && existingIds.has(trimmedPlanId);
  const planIdAvailable =
    idsLoaded && trimmedPlanId.length > 0 && !existingIds.has(trimmedPlanId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (planIdExists) {
      setError("A program with this Plan ID already exists.");
      return;
    }
    setLoading(true);
    setError(null);
    const body: Record<string, unknown> = {
      plan_id: trimmedPlanId,
      plan_name: form.plan_name.trim(),
      gender: form.gender,
      min_age: Number(form.min_age),
      max_age: Number(form.max_age),
      days_per_week: Number(form.days_per_week),
      description: form.description.trim() || null,
      equipment_required: [],
      is_paid: form.is_paid,
    };
    if (form.difficulty_level) {
      body.difficulty_level = form.difficulty_level;
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
    <div className="p-8 max-w-xl">
      <AdminProgramsTabs />
      <Link
        href="/admin/workout-programs"
        className="text-sm text-blue-600 hover:text-blue-800 mb-6 inline-block"
      >
        ← Programs
      </Link>
      <h1 className="text-2xl font-semibold text-gray-900 mb-2">
        New workout program
      </h1>
      <p className="text-sm text-gray-600 mb-6">
        <code className="text-xs bg-gray-100 px-1 rounded">plan_id</code> must
        be unique and stable (used by workouts and assignments). Required
        equipment is filled in automatically from the exercises in this
        program&apos;s workouts once you add them.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-800">
            {error}
          </div>
        )}
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Plan ID *
          </label>
          <input
            required
            className={`mt-1 block w-full rounded-md border px-3 py-2 text-sm ${
              planIdExists
                ? "border-red-400 focus:border-red-500 focus:ring-red-500"
                : "border-gray-300"
            }`}
            value={form.plan_id}
            onChange={(e) => setForm({ ...form, plan_id: e.target.value })}
            placeholder="e.g. strength_v2_jan"
            aria-invalid={planIdExists}
          />
          {planIdExists && (
            <p className="mt-1 text-sm text-red-600">
              A program with this Plan ID already exists. Choose a different
              one.
            </p>
          )}
          {planIdAvailable && (
            <p className="mt-1 text-sm text-green-600">Plan ID is available.</p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Plan name *
          </label>
          <input
            required
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            value={form.plan_name}
            onChange={(e) => setForm({ ...form, plan_name: e.target.value })}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Gender
            </label>
            <select
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              value={form.gender}
              onChange={(e) => setForm({ ...form, gender: e.target.value })}
            >
              <option value="All">All</option>
              <option value="M">M</option>
              <option value="F">F</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Days / week *
            </label>
            <input
              type="number"
              min={1}
              max={7}
              required
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              value={form.days_per_week}
              onChange={(e) =>
                setForm({ ...form, days_per_week: e.target.value })
              }
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Min age
            </label>
            <input
              type="number"
              min={0}
              max={120}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              value={form.min_age}
              onChange={(e) => setForm({ ...form, min_age: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Max age
            </label>
            <input
              type="number"
              min={0}
              max={120}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              value={form.max_age}
              onChange={(e) => setForm({ ...form, max_age: e.target.value })}
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Difficulty (optional)
          </label>
          <select
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            value={form.difficulty_level}
            onChange={(e) =>
              setForm({ ...form, difficulty_level: e.target.value })
            }
          >
            <option value="">—</option>
            <option value="Beginner">Beginner</option>
            <option value="Intermediate">Intermediate</option>
            <option value="Advanced">Advanced</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Description
          </label>
          <textarea
            rows={3}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </div>

        {/* Paid toggle */}
        <div className="flex items-center justify-between rounded-md border border-gray-200 px-3 py-3">
          <div>
            <span className="block text-sm font-medium text-gray-700">
              Paid program
            </span>
            <span className="block text-xs text-gray-500">
              Sets <code className="bg-gray-100 px-1 rounded">is_paid</code> on
              the program.
            </span>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={form.is_paid}
            onClick={() => setForm({ ...form, is_paid: !form.is_paid })}
            className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
              form.is_paid ? "bg-blue-600" : "bg-gray-300"
            }`}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                form.is_paid ? "translate-x-5" : "translate-x-0.5"
              }`}
            />
          </button>
        </div>

        <button
          type="submit"
          disabled={loading || planIdExists}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "Creating…" : "Create program"}
        </button>
      </form>
    </div>
  );
}
