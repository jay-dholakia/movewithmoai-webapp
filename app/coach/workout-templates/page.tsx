"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { CoachService } from "@/lib/services/coachService";
import type { WorkoutTemplateRow } from "@/lib/types/workout-builder";
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  Lock,
  Plus,
  Search,
} from "lucide-react";
import {
  adminInputClass,
  adminSelectClass,
} from "@/components/admin/workout-builder/formStyles";
import { AdminListSkeleton } from "@/components/admin/AdminLoadingSkeleton";
import { CoachProgramsTabs } from "@/components/coach/CoachSectionTabs/CoachSectionTabs";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 10;

type OwnershipFilter = "all" | "mine";

type CoachWorkoutTemplateRow = WorkoutTemplateRow & {
  is_mine?: boolean;
  can_edit?: boolean;
};

export default function CoachWorkoutTemplatesLibraryPage() {
  const [workouts, setWorkouts] = useState<CoachWorkoutTemplateRow[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);

  const [bootstrapping, setBootstrapping] = useState(true);
  const [listRefreshing, setListRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showEquipmentAdapted, setShowEquipmentAdapted] = useState(false);
  const [ownership, setOwnership] = useState<OwnershipFilter>("all");
  const hasLoadedOnce = useRef(false);
  const reqIdRef = useRef(0);

  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [type, setType] = useState<WorkoutTemplateRow["type"]>("full");
  const [filterQ, setFilterQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(filterQ.trim()), 300);
    return () => clearTimeout(t);
  }, [filterQ]);

  useEffect(() => {
    setPage(1);
  }, [debouncedQ, showEquipmentAdapted, ownership]);

  const load = useCallback(async () => {
    const first = !hasLoadedOnce.current;
    if (first) setBootstrapping(true);
    else setListRefreshing(true);
    setError(null);

    const reqId = ++reqIdRef.current;
    const res = await CoachService.listWorkoutTemplates({
      unassigned_only: false,
      include_equipment_adapted: showEquipmentAdapted,
      page,
      page_size: PAGE_SIZE,
      q: debouncedQ || undefined,
      // Server-side filter — otherwise "Only mine" would only filter the
      // currently visible page and hide workouts that live on later pages.
      mine_only: ownership === "mine",
    } as unknown as Parameters<typeof CoachService.listWorkoutTemplates>[0]);
    if (reqId !== reqIdRef.current) return;

    if (res.success && Array.isArray(res.workouts)) {
      setWorkouts(res.workouts as CoachWorkoutTemplateRow[]);
      setTotal(res.count ?? res.workouts.length);
      setTotalPages(res.pagination?.total_pages ?? 1);
    } else {
      setError(res.error || "Failed to load");
    }

    if (first) {
      setBootstrapping(false);
      hasLoadedOnce.current = true;
    } else {
      setListRefreshing(false);
    }
  }, [showEquipmentAdapted, page, debouncedQ, ownership]);

  useEffect(() => {
    load();
  }, [load]);

  const createUnassigned = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setCreating(true);
    const res = await CoachService.createWorkoutTemplate({
      title: title.trim(),
      type,
      plan_id: null,
    });
    setCreating(false);
    if (res.success) {
      setTitle("");
      setPage(1);
      load();
    } else alert(res.error || "Failed");
  };

  const rangeStart = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(page * PAGE_SIZE, total);

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <CoachProgramsTabs />
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            Workout library
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Workouts you&apos;ve built plus everything in the shared library.
            Only your own workouts are editable.
          </p>
        </div>
        <Link
          href="/coach/workout-programs"
          className="text-sm text-blue-600 hover:text-blue-800"
        >
          Programs →
        </Link>
      </div>

      <form
        onSubmit={createUnassigned}
        className="mb-8 rounded-lg border border-gray-200 bg-white p-4 flex flex-wrap gap-3 items-end"
      >
        <h2 className="w-full text-sm font-semibold text-gray-800 flex items-center gap-2">
          <Plus className="h-4 w-4" />
          New workout (no program yet)
        </h2>
        <label className="flex-1 min-w-50">
          <span className="text-xs text-gray-600">Title</span>
          <input
            className={adminInputClass}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </label>
        <label>
          <span className="text-xs text-gray-600">Type</span>
          <select
            className={adminSelectClass}
            value={type}
            onChange={(e) =>
              setType(e.target.value as WorkoutTemplateRow["type"])
            }
          >
            <option value="upper">upper</option>
            <option value="lower">lower</option>
            <option value="full">full</option>
            <option value="bodyweight">bodyweight</option>
          </select>
        </label>
        <button
          type="submit"
          disabled={creating}
          className="px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {creating ? "Creating…" : "Create"}
        </button>
      </form>

      {/* Ownership filter */}
      <div className="flex flex-wrap gap-2 mb-4">
        <button
          type="button"
          onClick={() => setOwnership("all")}
          className={cn(
            "rounded-full px-3 py-1.5 text-xs font-medium border transition-colors",
            ownership === "all"
              ? "bg-blue-600 text-white border-blue-600"
              : "bg-white text-gray-700 border-gray-200 hover:border-gray-300",
          )}
        >
          All workouts
        </button>
        <button
          type="button"
          onClick={() => setOwnership("mine")}
          className={cn(
            "rounded-full px-3 py-1.5 text-xs font-medium border transition-colors",
            ownership === "mine"
              ? "bg-blue-600 text-white border-blue-600"
              : "bg-white text-gray-700 border-gray-200 hover:border-gray-300",
          )}
        >
          Only mine
        </button>
      </div>

      <label className="flex items-center gap-2 text-sm text-gray-700 mb-4 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={showEquipmentAdapted}
          disabled={listRefreshing}
          onChange={(e) => setShowEquipmentAdapted(e.target.checked)}
          className="rounded border-gray-300 disabled:opacity-50"
        />
        Show equipment-adapted workouts
        {listRefreshing && (
          <Loader2
            className="h-3.5 w-3.5 animate-spin text-gray-400"
            aria-hidden
          />
        )}
      </label>

      <div className="mb-4">
        <label className="block">
          <span className="text-xs font-medium text-gray-600 flex items-center gap-1.5 mb-1">
            <Search className="h-3.5 w-3.5 text-gray-500" aria-hidden />
            Filter workouts
          </span>
          <input
            type="search"
            className={adminInputClass}
            value={filterQ}
            onChange={(e) => setFilterQ(e.target.value)}
            placeholder="Search by title or type…"
            autoComplete="off"
          />
        </label>
        {!bootstrapping && (
          <p className="text-xs text-gray-500 mt-1">
            {total === 0
              ? "No results"
              : `Showing ${rangeStart}–${rangeEnd} of ${total}`}
          </p>
        )}
      </div>

      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-800 mb-4">
          {error}
        </div>
      )}

      {bootstrapping ? (
        <AdminListSkeleton rows={6} />
      ) : (
        <>
          <ul
            className={`border border-gray-200 rounded-lg divide-y bg-white transition-opacity ${listRefreshing ? "opacity-60" : ""}`}
            aria-busy={listRefreshing}
          >
            {workouts.map((w) => {
              const mine = w.is_mine ?? true;
              return (
                <li
                  key={w.id}
                  className="flex items-center justify-between px-4 py-3"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-gray-900 truncate">
                        {w.title}
                      </p>
                      {mine ? (
                        <span className="inline-flex items-center rounded-full bg-blue-100 px-1.5 py-0.5 text-[10px] font-semibold text-blue-800">
                          Yours
                        </span>
                      ) : (
                        <span
                          className="inline-flex items-center gap-0.5 rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-600"
                          title="Read-only workout from the shared library."
                        >
                          <Lock className="h-2.5 w-2.5" />
                          Read-only
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500">{w.type}</p>
                  </div>
                  <Link
                    href={`/coach/workout-templates/${w.id}`}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    {mine ? "Edit →" : "View →"}
                  </Link>
                </li>
              );
            })}
            {workouts.length === 0 && (
              <li className="px-4 py-8 text-sm text-gray-500 text-center">
                {debouncedQ
                  ? `No workouts match "${debouncedQ}". Try a different search.`
                  : ownership === "mine"
                    ? "You haven't created any workouts yet."
                    : "No workouts found."}
              </li>
            )}
          </ul>

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(p - 1, 1))}
                disabled={page <= 1 || listRefreshing}
                className="inline-flex items-center gap-1 px-3 py-2 text-sm rounded-lg border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="h-4 w-4" aria-hidden />
                Previous
              </button>
              <span className="text-sm text-gray-600">
                Page {page} of {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                disabled={page >= totalPages || listRefreshing}
                className="inline-flex items-center gap-1 px-3 py-2 text-sm rounded-lg border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next
                <ChevronRight className="h-4 w-4" aria-hidden />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
