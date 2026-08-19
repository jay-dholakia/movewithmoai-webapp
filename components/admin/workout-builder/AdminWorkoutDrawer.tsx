// app/admin/workout-programs/[planId]/_components/AddWorkoutDrawer.tsx

"use client";

import { useEffect, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Copy,
  Loader2,
  Pencil,
  Search,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AdminService } from "@/lib/services/adminService";
import type { WorkoutTemplateRow } from "@/lib/types/workout-builder";

const PAGE_SIZE = 10;

export function AddWorkoutDrawer({
  open,
  day,
  planId,
  onClose,
  onAdded,
}: {
  open: boolean;
  day: number;
  planId: string;
  onClose: () => void;
  onAdded: () => void;
}) {
  const [method, setMethod] = useState<"new" | "duplicate" | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [newTitle, setNewTitle] = useState("");
  const [newType, setNewType] = useState("full");

  const [searchQ, setSearchQ] = useState("");
  const [hits, setHits] = useState<WorkoutTemplateRow[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  useEffect(() => {
    if (open) {
      setMethod(null);
      setError(null);
      setNewTitle("");
      setSearchQ("");
      setHits([]);
      setSelectedId(null);
      setPage(1);
      setTotal(0);
    }
  }, [open]);

  // Reset to page 1 whenever the search query changes
  useEffect(() => {
    setPage(1);
  }, [searchQ]);

  // Fetch whenever method, page, or query changes
  useEffect(() => {
    if (method !== "duplicate") return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      setSearching(true);
      const res = await AdminService.listWorkoutTemplates({
        q: searchQ.trim() || undefined,
        page,
        page_size: PAGE_SIZE,
      });
      setSearching(false);
      if (res.success && Array.isArray(res.workouts)) {
        setHits(res.workouts);
        setTotal(res.count ?? res.workouts.length);
      }
    }, 300);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [method, searchQ, page]);

  const submit = async () => {
    setLoading(true);
    setError(null);
    const res =
      method === "new"
        ? await AdminService.createWorkoutTemplate({
            title: newTitle.trim(),
            type: newType,
            plan_id: planId,
            order_index: day,
          })
        : await AdminService.duplicateWorkoutTemplate({
            source_workout_id: selectedId!,
            target_plan_id: planId,
            order_index: day,
          });
    setLoading(false);
    if (res.success) onAdded();
    else setError(res.error || "Failed to add workout");
  };

  if (!open) return null;

  const canSubmit =
    (method === "new" && newTitle.trim().length > 0) ||
    (method === "duplicate" && selectedId != null);

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm cursor-pointer"
        onClick={onClose}
      />
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-lg bg-white shadow-xl flex flex-col">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Add workout — Day {day}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-lg p-1.5 text-gray-400 hover:bg-gray-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {error && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              {error}
            </div>
          )}

          {!method && (
            <div className="grid gap-3 sm:grid-cols-2">
              <MethodCard
                icon={Pencil}
                title="Create new"
                desc="Build from scratch, add exercises after"
                onClick={() => setMethod("new")}
              />
              <MethodCard
                icon={Copy}
                title="Duplicate existing"
                desc="Copy a workout from the library"
                onClick={() => setMethod("duplicate")}
              />
            </div>
          )}

          {method === "new" && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Workout title
                </label>
                <input
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  placeholder="e.g. Push A"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Type
                </label>
                <select
                  className="mt-1 block w-full cursor-pointer rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  value={newType}
                  onChange={(e) => setNewType(e.target.value)}
                >
                  <option value="full">Full body</option>
                  <option value="upper">Upper</option>
                  <option value="lower">Lower</option>
                  <option value="push">Push</option>
                  <option value="pull">Pull</option>
                  <option value="legs">Legs</option>
                  <option value="bodyweight">Bodyweight</option>
                </select>
              </div>
              <p className="text-xs text-gray-500">
                Created as Day {day}. Add exercises using the workout editor
                after creation.
              </p>
            </div>
          )}

          {method === "duplicate" && (
            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search workouts…"
                  className="block w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  value={searchQ}
                  onChange={(e) => setSearchQ(e.target.value)}
                />
              </div>
              <div className="rounded-lg border border-gray-200 divide-y divide-gray-100 overflow-hidden max-h-72 overflow-y-auto">
                {searching ? (
                  <div className="flex items-center justify-center py-8 text-sm text-gray-500">
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Loading…
                  </div>
                ) : hits.length === 0 ? (
                  <p className="py-8 text-center text-sm text-gray-500">
                    No workouts found.
                  </p>
                ) : (
                  hits.map((w) => (
                    <button
                      key={w.id}
                      type="button"
                      onClick={() =>
                        setSelectedId(selectedId === w.id ? null : w.id)
                      }
                      className={cn(
                        "flex w-full cursor-pointer items-center justify-between px-4 py-3 text-left transition-colors",
                        selectedId === w.id ? "bg-blue-50" : "hover:bg-gray-50",
                      )}
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {w.title}
                        </p>
                        <p className="text-xs text-gray-500">
                          {w.type}
                          {w.plan_id ? ` · plan: ${w.plan_id}` : ""}
                        </p>
                      </div>
                      {selectedId === w.id && (
                        <span className="text-blue-600 text-sm">✓</span>
                      )}
                    </button>
                  ))
                )}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">
                    Page {page} of {totalPages} · {total} workout
                    {total === 1 ? "" : "s"}
                  </span>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      disabled={page <= 1 || searching}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      className="cursor-pointer rounded border border-gray-200 p-1 text-gray-500 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-30"
                    >
                      <ChevronLeft className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={page >= totalPages || searching}
                      onClick={() =>
                        setPage((p) => Math.min(totalPages, p + 1))
                      }
                      className="cursor-pointer rounded border border-gray-200 p-1 text-gray-500 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-30"
                    >
                      <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              )}

              <p className="text-xs text-gray-500">
                Creates an independent copy with all its exercises.
              </p>
            </div>
          )}
        </div>

        {method && (
          <div className="border-t border-gray-200 px-6 py-4 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setMethod(null)}
              className="cursor-pointer rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Back
            </button>
            <button
              type="button"
              disabled={loading || !canSubmit}
              onClick={submit}
              className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {method === "new" ? "Create workout" : `Duplicate to Day ${day}`}
            </button>
          </div>
        )}
      </div>
    </>
  );
}

function MethodCard({
  icon: Icon,
  title,
  desc,
  onClick,
}: {
  icon: typeof Pencil;
  title: string;
  desc: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex cursor-pointer flex-col items-start gap-2 rounded-xl border border-gray-200 p-4 text-left hover:border-blue-200 hover:bg-blue-50/40 transition-all"
    >
      <Icon className="h-5 w-5 text-gray-400" />
      <div>
        <p className="text-sm font-semibold text-gray-900">{title}</p>
        <p className="text-xs text-gray-500">{desc}</p>
      </div>
    </button>
  );
}
