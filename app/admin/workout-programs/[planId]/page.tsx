"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { AdminService } from "@/lib/services/adminService";
import type { WorkoutProgramRow } from "@/lib/types/workout-builder";
import type { WorkoutTemplateRow } from "@/lib/types/workout-builder";
import {
  ArrowLeft,
  Clock,
  Edit3,
  Loader2,
  Plus,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  adminInputClass,
  adminSelectClass,
} from "@/components/admin/workout-builder/formStyles";
import {
  AdminCardSkeleton,
  AdminListSkeleton,
  AdminPageTitleSkeleton,
} from "@/components/admin/AdminLoadingSkeleton";
import { AdminProgramsTabs } from "@/components/admin/AdminSectionTabs";
import { AddWorkoutDrawer } from "@/components/admin/workout-builder/AdminWorkoutDrawer";

type Slot = { day: number; workout: WorkoutTemplateRow | null };

type MetaDraft = {
  plan_name: string;
  difficulty_level: string; // "" = Not set
  description: string;
};

function draftFromProgram(p: WorkoutProgramRow): MetaDraft {
  return {
    plan_name: p.plan_name ?? "",
    difficulty_level: p.difficulty_level ?? "",
    description: p.description ?? "",
  };
}

function draftEquals(a: MetaDraft, b: MetaDraft) {
  return (
    a.plan_name === b.plan_name &&
    a.difficulty_level === b.difficulty_level &&
    a.description === b.description
  );
}

export default function WorkoutProgramDetailPage() {
  const params = useParams();
  const router = useRouter();
  const planId = decodeURIComponent(String(params.planId || ""));
  const planIdRef = useRef(planId);
  planIdRef.current = planId;

  const [program, setProgram] = useState<WorkoutProgramRow | null>(null);
  const [workouts, setWorkouts] = useState<WorkoutTemplateRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);

  // Controlled metadata draft — no auto-save
  const [draft, setDraft] = useState<MetaDraft | null>(null);

  const [equipmentSyncError, setEquipmentSyncError] = useState<string | null>(
    null,
  );
  const [equipmentSyncing, setEquipmentSyncing] = useState(false);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerDay, setDrawerDay] = useState(1);

  // Sync draft whenever program loads / changes from the server
  useEffect(() => {
    if (program) setDraft(draftFromProgram(program));
  }, [program]);

  const dirty =
    !!program && !!draft && !draftEquals(draft, draftFromProgram(program));

  const runEquipmentSync = useCallback(async () => {
    if (!planId) return;
    setEquipmentSyncing(true);
    setEquipmentSyncError(null);
    try {
      const sync = await AdminService.recomputeProgramEquipment(planId);
      if (planIdRef.current !== planId) return;
      if (sync.success && sync.program) setProgram(sync.program);
      else
        setEquipmentSyncError(
          typeof sync.error === "string"
            ? sync.error
            : "Could not sync equipment",
        );
    } finally {
      if (planIdRef.current === planId) setEquipmentSyncing(false);
    }
  }, [planId]);

  const fetchWorkouts = useCallback(async () => {
    if (!planId) return;
    const wr = await AdminService.listWorkoutTemplates({
      plan_id: planId,
      include_equipment_adapted: false,
      page: 1,
      page_size: 10,
    });
    if (planIdRef.current !== planId) return;
    if (wr.success && Array.isArray(wr.workouts)) setWorkouts(wr.workouts);
  }, [planId]);

  useEffect(() => {
    if (!planId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      const [pr, wr] = await Promise.all([
        AdminService.getWorkoutProgram(planId),
        AdminService.listWorkoutTemplates({
          plan_id: planId,
          include_equipment_adapted: false,
          page: 1,
          page_size: 10,
        }),
      ]);
      if (cancelled || planIdRef.current !== planId) return;
      if (wr.success && Array.isArray(wr.workouts)) setWorkouts(wr.workouts);
      if (pr.success && pr.program) setProgram(pr.program);
      else setError(pr.error || "Program not found");
      setLoading(false);
      if (!cancelled && pr.success && pr.program) void runEquipmentSync();
    })();
    return () => {
      cancelled = true;
    };
  }, [planId, runEquipmentSync]);

  // Warn on navigation with unsaved changes
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (dirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  const slots: Slot[] = [1, 2, 3, 4, 5].map((day) => ({
    day,
    workout: workouts.find((w) => w.order_index === day) ?? null,
  }));
  const filledCount = slots.filter((s) => s.workout !== null).length;
  const canPublish = filledCount === 5;
  const isPublished = program?.status === "published";

  const buildPatch = (extra: Record<string, unknown> = {}) => {
    if (!draft) return extra;
    return {
      plan_name: draft.plan_name.trim(),
      difficulty_level: draft.difficulty_level || null,
      description: draft.description.trim() || null,
      ...extra,
    };
  };

  const handleSave = async () => {
    if (!planId || !draft || !dirty) return;
    if (!draft.plan_name.trim()) {
      alert("Name is required.");
      return;
    }
    setSaving(true);
    const res = await AdminService.updateWorkoutProgram(planId, buildPatch());
    setSaving(false);
    if (res.success && res.program) setProgram(res.program);
    else alert(res.error || "Save failed");
  };

  const togglePublish = async () => {
    if (!planId || !program) return;
    const nextStatus = isPublished ? "draft" : "published";
    if (nextStatus === "published" && !canPublish) return;

    const verb = nextStatus === "published" ? "Publish" : "Unpublish";
    if (!confirm(`${verb} this program?`)) return;

    if (dirty && !draft?.plan_name.trim()) {
      alert("Name is required.");
      return;
    }

    setPublishing(true);
    // Merge any pending metadata edits with the status change in one request
    const patch = dirty
      ? buildPatch({ status: nextStatus })
      : { status: nextStatus };
    const res = await AdminService.updateWorkoutProgram(planId, patch);
    setPublishing(false);
    if (res.success && res.program) setProgram(res.program);
    else alert(res.error || `${verb} failed`);
  };

  const deleteProgram = async () => {
    if (
      !confirm("Delete this program? Workouts will be unassigned, not deleted.")
    )
      return;
    const res = await AdminService.deleteWorkoutProgram(planId);
    if (res.success) router.push("/admin/workout-programs");
    else alert(res.error || "Delete failed");
  };

  if (!planId) return null;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <AdminProgramsTabs />
      <Link
        href="/admin/workout-programs"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 mb-6"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Programs
      </Link>

      {loading && (
        <div className="space-y-8" aria-busy="true">
          <AdminPageTitleSkeleton />
          <AdminCardSkeleton lines={3} />
          <AdminListSkeleton rows={5} />
        </div>
      )}

      {!loading && error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {error}
        </div>
      )}

      {!loading && program && draft && (
        <div className="space-y-8">
          {/* Header */}
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 space-y-1">
                <h1 className="text-2xl font-semibold tracking-tight text-gray-900">
                  {program.plan_name}
                </h1>
                <div className="flex flex-wrap items-center gap-2">
                  {program.difficulty_level && (
                    <Badge className="bg-blue-50 text-blue-800">
                      {program.difficulty_level}
                    </Badge>
                  )}
                  <Badge
                    className={
                      isPublished
                        ? "bg-emerald-50 text-emerald-800"
                        : "bg-amber-50 text-amber-800"
                    }
                  >
                    {isPublished ? "Published" : "Draft"}
                  </Badge>
                  {program.is_paid && (
                    <Badge className="bg-violet-50 text-violet-800">Paid</Badge>
                  )}
                  {dirty && (
                    <Badge className="bg-orange-50 text-orange-800">
                      Unsaved changes
                    </Badge>
                  )}
                  <span className="text-xs font-mono text-gray-400">
                    {program.plan_id}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={!dirty || saving || publishing}
                  className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50 transition disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {saving ? "Saving…" : "Save"}
                </button>
                <button
                  type="button"
                  onClick={togglePublish}
                  disabled={
                    publishing || saving || (!isPublished && !canPublish)
                  }
                  className={cn(
                    "rounded-lg px-4 py-2 text-sm font-semibold shadow-sm transition disabled:opacity-50 disabled:cursor-not-allowed",
                    isPublished
                      ? "border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                      : "bg-blue-600 text-white hover:bg-blue-700",
                  )}
                >
                  {publishing ? "…" : isPublished ? "Unpublish" : "Publish"}
                </button>
                <button
                  type="button"
                  onClick={deleteProgram}
                  className="rounded-lg border border-gray-200 p-2 text-gray-400 hover:text-red-600 hover:border-red-200 transition"
                  title="Delete program"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Progress */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-600">
                  <span className="font-semibold text-gray-900">
                    {filledCount}
                  </span>{" "}
                  of 5 workouts complete
                </span>
                {!canPublish && (
                  <span className="text-amber-700">
                    Complete{" "}
                    {slots
                      .filter((s) => !s.workout)
                      .map((s) => `Day ${s.day}`)
                      .join(", ")}{" "}
                    before publishing.
                  </span>
                )}
              </div>
              <div className="h-1.5 w-full rounded-full bg-gray-100 overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-500",
                    canPublish ? "bg-emerald-500" : "bg-blue-500",
                  )}
                  style={{ width: `${(filledCount / 5) * 100}%` }}
                />
              </div>
            </div>
          </div>

          {/* Metadata — controlled, no auto-save */}
          <section className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-900">
                Program info
              </h2>
              {dirty && (
                <span className="text-xs text-orange-700">
                  Unsaved changes — click Save to apply.
                </span>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <label className="block">
                <span className="text-gray-600">Name</span>
                <input
                  className={adminInputClass}
                  value={draft.plan_name}
                  onChange={(e) =>
                    setDraft((d) =>
                      d ? { ...d, plan_name: e.target.value } : d,
                    )
                  }
                />
              </label>
              <label className="block">
                <span className="text-gray-600">Level</span>
                <select
                  className={adminSelectClass}
                  value={draft.difficulty_level}
                  onChange={(e) =>
                    setDraft((d) =>
                      d ? { ...d, difficulty_level: e.target.value } : d,
                    )
                  }
                >
                  <option value="">Not set</option>
                  <option value="Beginner">Beginner</option>
                  <option value="Intermediate">Intermediate</option>
                  <option value="Advanced">Advanced</option>
                </select>
              </label>
              <label className="block col-span-2">
                <span className="text-gray-600">Description</span>
                <textarea
                  rows={2}
                  className={adminInputClass}
                  value={draft.description}
                  onChange={(e) =>
                    setDraft((d) =>
                      d ? { ...d, description: e.target.value } : d,
                    )
                  }
                />
              </label>
            </div>
          </section>

          {/* 5 Workout Slots */}
          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-gray-900">Workouts</h2>
            {slots.map((slot) => (
              <WorkoutSlot
                key={slot.day}
                slot={slot}
                onAdd={() => {
                  setDrawerDay(slot.day);
                  setDrawerOpen(true);
                }}
              />
            ))}
          </section>

          {/* Equipment */}
          <section className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                  Equipment required
                  {equipmentSyncing && (
                    <Loader2
                      className="h-3.5 w-3.5 animate-spin text-gray-400"
                      aria-hidden
                    />
                  )}
                </h2>
                <p className="text-xs text-gray-500 mt-1 max-w-xl">
                  Computed from exercises in this program&apos;s workouts.
                </p>
              </div>
              <button
                type="button"
                onClick={() => void runEquipmentSync()}
                disabled={equipmentSyncing}
                className="shrink-0 px-3 py-1.5 text-sm rounded-lg border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                {equipmentSyncing ? "Refreshing…" : "Refresh"}
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
                    ? "Syncing…"
                    : "None yet — add exercises then refresh."}
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
        </div>
      )}

      <AddWorkoutDrawer
        open={drawerOpen}
        day={drawerDay}
        planId={planId}
        onClose={() => setDrawerOpen(false)}
        onAdded={() => {
          setDrawerOpen(false);
          void fetchWorkouts();
          void runEquipmentSync();
        }}
      />
    </div>
  );
}

function Badge({
  children,
  className,
}: {
  children: React.ReactNode;
  className: string;
}) {
  return (
    <span
      className={cn(
        "rounded-full px-2.5 py-0.5 text-xs font-medium",
        className,
      )}
    >
      {children}
    </span>
  );
}

function WorkoutSlot({ slot, onAdd }: { slot: Slot; onAdd: () => void }) {
  return (
    <div
      className={cn(
        "rounded-xl border transition-all",
        slot.workout
          ? "border-gray-200 bg-white shadow-sm"
          : "border-dashed border-gray-300 bg-gray-50/60",
      )}
    >
      <div className="flex items-stretch">
        <div
          className={cn(
            "flex w-16 shrink-0 flex-col items-center justify-center rounded-l-xl border-r px-2 py-4",
            slot.workout
              ? "border-gray-200 bg-gray-50"
              : "border-gray-300 bg-gray-100/60",
          )}
        >
          <span className="text-[11px] font-medium uppercase tracking-wide text-gray-500">
            Day
          </span>
          <span className="text-xl font-bold text-gray-900">{slot.day}</span>
        </div>

        {slot.workout ? (
          <div className="flex flex-1 items-center justify-between gap-4 px-5 py-4">
            <div className="min-w-0 space-y-1">
              <p className="text-sm font-semibold text-gray-900 truncate">
                {slot.workout.title}
              </p>
              <div className="flex items-center gap-3 text-xs text-gray-500">
                <span>{slot.workout.type}</span>
                {slot.workout.estimated_duration_minutes && (
                  <span className="inline-flex items-center gap-1">
                    <Clock className="h-3 w-3" />~
                    {slot.workout.estimated_duration_minutes} min
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <Link
                href={`/admin/workout-templates/${slot.workout.id}`}
                className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition"
              >
                <Edit3 className="h-3 w-3" />
                Edit
              </Link>
              <button
                type="button"
                onClick={onAdd}
                className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition"
              >
                <RefreshCw className="h-3 w-3" />
                Replace
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-1 items-center justify-between px-5 py-6">
            <p className="text-sm text-gray-400">No workout added</p>
            <button
              type="button"
              onClick={onAdd}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 transition"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Workout
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
