"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { AdminService } from "@/lib/services/adminService";
import type { WorkoutProgramRow } from "@/lib/types/workout-builder";
import type { WorkoutTemplateRow } from "@/lib/types/workout-builder";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { SortableWorkoutsList } from "@/components/admin/workout-builder/SortableWorkoutsList";
import {
  adminInputClass,
  adminSelectClass,
  adminShortNumberClass,
} from "@/components/admin/workout-builder/formStyles";
import {
  AdminCardSkeleton,
  AdminListSkeleton,
  AdminPageTitleSkeleton,
} from "@/components/admin/AdminLoadingSkeleton";
import { AdminProgramsTabs } from "@/components/admin/AdminSectionTabs";

export default function WorkoutProgramDetailPage() {
  const params = useParams();
  const router = useRouter();
  const planId = decodeURIComponent(String(params.planId || ""));

  const [program, setProgram] = useState<WorkoutProgramRow | null>(null);
  const [workouts, setWorkouts] = useState<WorkoutTemplateRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [newTitle, setNewTitle] = useState("");
  const [newType, setNewType] = useState<WorkoutTemplateRow["type"]>("full");
  const [newOrder, setNewOrder] = useState("0");
  const [showEquipmentAdapted, setShowEquipmentAdapted] = useState(false);
  const [equipmentSyncError, setEquipmentSyncError] = useState<string | null>(
    null,
  );
  const [equipmentSyncing, setEquipmentSyncing] = useState(false);
  const [workoutsRefreshing, setWorkoutsRefreshing] = useState(false);
  const planIdRef = useRef(planId);
  planIdRef.current = planId;

  const runEquipmentSync = useCallback(async () => {
    if (!planId) return;
    const forPlan = planId;
    setEquipmentSyncing(true);
    setEquipmentSyncError(null);
    try {
      const sync = await AdminService.recomputeProgramEquipment(forPlan);
      if (planIdRef.current !== forPlan) return;
      if (sync.success && sync.program) {
        setProgram(sync.program);
        setEquipmentSyncError(null);
      } else {
        setEquipmentSyncError(
          typeof sync.error === "string"
            ? sync.error
            : "Could not sync equipment from exercises",
        );
      }
    } finally {
      if (planIdRef.current === forPlan) {
        setEquipmentSyncing(false);
      }
    }
  }, [planId]);

  const fetchWorkoutsList = useCallback(
    async (includeAdapted: boolean) => {
      if (!planId) return;
      const forPlan = planId;
      setWorkoutsRefreshing(true);
      try {
        const wr = await AdminService.listWorkoutTemplates({
          plan_id: forPlan,
          include_equipment_adapted: includeAdapted,
        });
        if (planIdRef.current !== forPlan) return;
        if (wr.success && Array.isArray(wr.workouts)) setWorkouts(wr.workouts);
      } finally {
        if (planIdRef.current === forPlan) {
          setWorkoutsRefreshing(false);
        }
      }
    },
    [planId],
  );

  useEffect(() => {
    if (!planId) return;
    let cancelled = false;
    const forPlan = planId;
    setEquipmentSyncing(false);
    setShowEquipmentAdapted(false);
    (async () => {
      setLoading(true);
      setError(null);
      setEquipmentSyncError(null);
      const [pr, wr] = await Promise.all([
        AdminService.getWorkoutProgram(forPlan),
        AdminService.listWorkoutTemplates({
          plan_id: forPlan,
          include_equipment_adapted: false,
        }),
      ]);
      if (cancelled || planIdRef.current !== forPlan) return;
      if (wr.success && Array.isArray(wr.workouts)) setWorkouts(wr.workouts);
      if (pr.success && pr.program) {
        setProgram(pr.program);
        setError(null);
      } else {
        setProgram(null);
        setError(pr.error || "Program not found");
      }
      setLoading(false);
      if (
        !cancelled &&
        planIdRef.current === forPlan &&
        pr.success &&
        pr.program
      ) {
        void runEquipmentSync();
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [planId, runEquipmentSync]);

  const saveProgramMeta = async (patch: Record<string, unknown>) => {
    if (!planId) return;
    setSaving(true);
    const res = await AdminService.updateWorkoutProgram(planId, patch);
    setSaving(false);
    if (res.success && res.program) setProgram(res.program);
    else alert(res.error || "Save failed");
  };

  const addWorkoutToProgram = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    const res = await AdminService.createWorkoutTemplate({
      title: newTitle.trim(),
      type: newType,
      plan_id: planId,
      order_index: Number(newOrder) || 0,
    });
    if (res.success) {
      setNewTitle("");
      setNewOrder("0");
      await fetchWorkoutsList(showEquipmentAdapted);
      void runEquipmentSync();
    } else alert(res.error || "Failed to create workout");
  };

  const deleteProgram = async () => {
    if (
      !confirm(
        "Delete this program? Workouts will be unassigned (plan_id cleared), not deleted.",
      )
    )
      return;
    const res = await AdminService.deleteWorkoutProgram(planId);
    if (res.success) router.push("/admin/workout-programs");
    else alert(res.error || "Delete failed");
  };

  if (!planId) return null;

  return (
    <div className="p-8 max-w-4xl">
      <AdminProgramsTabs />
      <Link
        href="/admin/workout-programs"
        className="text-sm text-blue-600 hover:text-blue-800 mb-4 inline-block"
      >
        ← Programs
      </Link>

      {loading && (
        <div
          className="space-y-8"
          aria-busy="true"
          aria-label="Loading program"
        >
          <AdminPageTitleSkeleton />
          <AdminCardSkeleton lines={4} />
          <AdminCardSkeleton lines={2} />
          <AdminListSkeleton rows={4} />
        </div>
      )}
      {!loading && error && (
        <div className="rounded-md bg-red-50 border border-red-200 p-4 text-sm text-red-800">
          {error}
        </div>
      )}

      {!loading && program && (
        <>
          <div className="flex items-start justify-between gap-4 mb-8">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">
                {program.plan_name}
              </h1>
              <p className="text-xs font-mono text-gray-500 mt-1">
                {program.plan_id}
              </p>
            </div>
            <button
              type="button"
              onClick={deleteProgram}
              className="inline-flex items-center gap-1 text-sm text-red-600 hover:text-red-800"
            >
              <Trash2 className="h-4 w-4" />
              Delete program
            </button>
          </div>

          <section className="mb-10 rounded-lg border border-gray-200 bg-white p-4 space-y-3">
            <h2 className="text-sm font-semibold text-gray-900">Metadata</h2>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <label className="block">
                <span className="text-gray-600">Name</span>
                <input
                  className={adminInputClass}
                  defaultValue={program.plan_name}
                  key={program.plan_name}
                  onBlur={(e) => {
                    if (e.target.value !== program.plan_name)
                      saveProgramMeta({ plan_name: e.target.value });
                  }}
                />
              </label>
              <label className="block">
                <span className="text-gray-600">Days / week</span>
                <input
                  type="number"
                  min={1}
                  max={7}
                  className={adminInputClass}
                  defaultValue={program.days_per_week}
                  key={`dpw-${program.days_per_week}`}
                  onBlur={(e) =>
                    saveProgramMeta({
                      days_per_week: Number(e.target.value),
                    })
                  }
                />
              </label>
              <label className="block">
                <span className="text-gray-600">Deprecated</span>
                <select
                  className={adminSelectClass}
                  defaultValue={program.is_deprecated ? "true" : "false"}
                  key={`dep-${program.is_deprecated}`}
                  onChange={(e) =>
                    saveProgramMeta({
                      is_deprecated: e.target.value === "true",
                    })
                  }
                >
                  <option value="false">No</option>
                  <option value="true">Yes</option>
                </select>
              </label>
              <label className="block col-span-2">
                <span className="text-gray-600">Description</span>
                <textarea
                  rows={2}
                  className={adminInputClass}
                  defaultValue={program.description || ""}
                  key={program.description || ""}
                  onBlur={(e) =>
                    saveProgramMeta({ description: e.target.value || null })
                  }
                />
              </label>
            </div>
            {saving && (
              <p className="text-xs text-gray-500">Saving…</p>
            )}
          </section>

          <section className="mb-10 rounded-lg border border-gray-200 bg-white p-4 space-y-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                  Equipment required
                  {equipmentSyncing && (
                    <Loader2
                      className="h-3.5 w-3.5 animate-spin text-gray-400 shrink-0"
                      aria-hidden
                    />
                  )}
                </h2>
                <p className="text-xs text-gray-500 mt-1 max-w-xl">
                  Computed from every exercise in this program&apos;s workouts
                  (excluding equipment-adapted clone templates). Uses each
                  exercise&apos;s{" "}
                  <code className="bg-gray-100 px-1 rounded">equipment</code>{" "}
                  field when set, otherwise{" "}
                  <code className="bg-gray-100 px-1 rounded">category</code>.
                  Saved to{" "}
                  <code className="bg-gray-100 px-1 rounded">
                    workout_programs.equipment_required
                  </code>
                  .
                </p>
              </div>
              <button
                type="button"
                onClick={() => void runEquipmentSync()}
                disabled={equipmentSyncing}
                className="shrink-0 px-3 py-1.5 text-sm rounded-lg border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                {equipmentSyncing ? "Refreshing…" : "Refresh from exercises"}
              </button>
            </div>
            {equipmentSyncError && (
              <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
                {equipmentSyncError}
              </p>
            )}
            <ul
              className={`flex flex-wrap gap-2 pt-1 transition-opacity ${equipmentSyncing ? "opacity-70" : ""}`}
            >
              {(program.equipment_required ?? []).length === 0 ? (
                <li className="text-sm text-gray-500">
                  {equipmentSyncing
                    ? "Syncing from exercises…"
                    : "None listed yet. Add exercises to the workouts in this program, then refresh or open this page again."}
                </li>
              ) : (
                (program.equipment_required ?? []).map((eq) => (
                  <li
                    key={eq}
                    className="px-2.5 py-1 rounded-md bg-gray-100 text-sm text-gray-800"
                  >
                    {eq}
                  </li>
                ))
              )}
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
              Workouts in program
              {workoutsRefreshing && (
                <Loader2
                  className="h-4 w-4 animate-spin text-gray-400"
                  aria-label="Updating workout list"
                />
              )}
            </h2>
            <p className="text-sm text-gray-600 mb-3">
              Drag to set <code className="text-xs bg-gray-100 px-1 rounded">order_index</code>. Edit exercises from each workout page. Equipment-adapted copies are hidden by default.
            </p>
            <label className="flex items-center gap-2 text-sm text-gray-700 mb-4 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showEquipmentAdapted}
                disabled={workoutsRefreshing}
                onChange={(e) => {
                  const v = e.target.checked;
                  setShowEquipmentAdapted(v);
                  void fetchWorkoutsList(v);
                }}
                className="rounded border-gray-300 disabled:opacity-50"
              />
              Show equipment-adapted workouts (titles containing &quot;adapted to your equipment&quot;)
            </label>

            {workouts.length === 0 ? (
              <div className="border border-gray-200 rounded-lg bg-white mb-6 px-4 py-6 text-sm text-gray-500">
                No workouts in this list. Create one below or assign from the{" "}
                <Link href="/admin/workout-templates" className="text-blue-600">
                  library
                </Link>
                .
                {!showEquipmentAdapted && (
                  <span className="block mt-2 text-xs text-gray-500">
                    If you expect more rows, they may be equipment-adapted clones—enable the checkbox above.
                  </span>
                )}
              </div>
            ) : (
              <div
                className={`mb-6 transition-opacity ${workoutsRefreshing ? "opacity-60 pointer-events-none" : ""}`}
              >
                <SortableWorkoutsList
                  planId={planId}
                  workouts={workouts}
                  onReload={() => fetchWorkoutsList(showEquipmentAdapted)}
                />
              </div>
            )}

            <form
              onSubmit={addWorkoutToProgram}
              className="rounded-lg border border-dashed border-gray-300 p-4 space-y-3"
            >
              <h3 className="text-sm font-medium text-gray-800 flex items-center gap-2">
                <Plus className="h-4 w-4" />
                New workout in this program
              </h3>
              <div className="flex flex-wrap gap-3 items-end">
                <label className="flex-1 min-w-[160px]">
                  <span className="text-xs text-gray-600">Title</span>
                  <input
                    className={adminInputClass}
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="e.g. Push A"
                  />
                </label>
                <label>
                  <span className="text-xs text-gray-600">Type</span>
                  <select
                    className={adminSelectClass}
                    value={newType}
                    onChange={(e) =>
                      setNewType(e.target.value as WorkoutTemplateRow["type"])
                    }
                  >
                    <option value="upper">upper</option>
                    <option value="lower">lower</option>
                    <option value="full">full</option>
                    <option value="bodyweight">bodyweight</option>
                  </select>
                </label>
                <label>
                  <span className="text-xs text-gray-600">Order</span>
                  <input
                    type="number"
                    className={adminShortNumberClass}
                    value={newOrder}
                    onChange={(e) => setNewOrder(e.target.value)}
                  />
                </label>
                <button
                  type="submit"
                  className="px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
                >
                  Add workout
                </button>
              </div>
            </form>
          </section>
        </>
      )}
    </div>
  );
}
