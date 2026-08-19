"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AdminService } from "@/lib/services/adminService";
import type { EnrichedWorkoutProgramRow } from "@/lib/types/workout-builder";
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Layers,
  Plus,
  Target,
  UserCircle,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Shimmer } from "@/components/admin/AdminLoadingSkeleton";
import { AdminProgramsTabs } from "@/components/admin/AdminSectionTabs";

function TableSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
      <div className="border-b border-gray-100 bg-gray-50/60 px-5 py-3">
        <Shimmer className="h-4 w-full max-w-[60%]" />
      </div>
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 border-b border-gray-100 px-5 py-3.5 last:border-b-0"
        >
          <Shimmer className="h-4 flex-[2] max-w-[200px]" />
          <Shimmer className="h-4 flex-1 max-w-[120px]" />
          <Shimmer className="h-4 w-14" />
          <Shimmer className="h-4 w-10" />
          <Shimmer className="h-5 w-16 rounded-full" />
          <Shimmer className="h-4 w-12" />
        </div>
      ))}
    </div>
  );
}

const PAGE_SIZE_OPTIONS = [10, 20, 50] as const;

export default function WorkoutProgramsPage() {
  const [programs, setPrograms] = useState<EnrichedWorkoutProgramRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterMoaiId, setFilterMoaiId] = useState<string | null>(null);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(20);
  const [total, setTotal] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await AdminService.listWorkoutProgramsEnriched(
      true,
      page,
      pageSize,
    );
    if (res.success && Array.isArray(res.programs)) {
      setPrograms(res.programs as EnrichedWorkoutProgramRow[]);
      setTotal(res.total ?? res.programs.length);
    } else {
      setError((res as { error?: string }).error || "Failed to load programs");
    }
    setLoading(false);
  }, [page, pageSize]);

  useEffect(() => {
    load();
  }, [load]);

  // Reset to page 1 when page size changes
  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    setPage(1);
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const sortedPrograms = useMemo(() => {
    return [...programs].sort((a, b) => {
      const da = a.is_deprecated ? 1 : 0;
      const db = b.is_deprecated ? 1 : 0;
      if (da !== db) return da - db;
      return a.plan_name.localeCompare(b.plan_name, undefined, {
        sensitivity: "base",
      });
    });
  }, [programs]);

  const filterMoaiOptions = useMemo(() => {
    const m = new Map<string, string>();
    for (const p of programs) {
      for (const fm of p.focus_moais) {
        m.set(fm.id, fm.name);
      }
    }
    return [...m.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
      );
  }, [programs]);

  const visiblePrograms = useMemo(() => {
    if (!filterMoaiId) return sortedPrograms;
    return sortedPrograms.filter((p) =>
      p.focus_moais.some((fm) => fm.id === filterMoaiId),
    );
  }, [sortedPrograms, filterMoaiId]);

  const activeCount = useMemo(
    () => programs.filter((p) => !p.is_deprecated).length,
    [programs],
  );
  const deprecatedCount = programs.length - activeCount;

  const rangeStart = (page - 1) * pageSize + 1;
  const rangeEnd = Math.min(page * pageSize, total);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <AdminProgramsTabs />
      <header className="flex flex-col gap-6 border-b border-gray-200 pb-8 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl space-y-3">
          <h1 className="text-3xl font-semibold tracking-tight text-gray-900">
            Workout programs
          </h1>
          <p className="text-sm leading-relaxed text-gray-600">
            Create and maintain training programs. Each program has a stable{" "}
            <code className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-xs text-gray-800">
              plan_id
            </code>
            ; workouts link to it via{" "}
            <code className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-xs text-gray-800">
              workoutss.plan_id
            </code>
            . Focus Moais link through{" "}
            <code className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-xs text-gray-800">
              workout_focus
            </code>
            .
          </p>
        </div>
        <Link
          href="/admin/workout-programs/new"
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          <Plus className="h-4 w-4" aria-hidden />
          New program
        </Link>
      </header>

      {loading && (
        <div className="mt-10 space-y-8" aria-busy="true" aria-label="Loading">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <Shimmer className="h-8 w-48" />
            <Shimmer className="h-10 w-32 rounded-lg" />
          </div>
          <TableSkeleton />
        </div>
      )}

      {!loading && error && (
        <div
          className="mt-8 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
          role="alert"
        >
          {error}
        </div>
      )}

      {!loading && !error && programs.length > 0 && (
        <div className="mt-8 space-y-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-gray-600">
              <span className="font-semibold text-gray-900">{total}</span>{" "}
              program{total === 1 ? "" : "s"}
              {deprecatedCount > 0 ? (
                <>
                  {" "}
                  ·{" "}
                  <span className="text-gray-500">
                    {activeCount} active, {deprecatedCount} deprecated
                  </span>
                </>
              ) : null}
            </p>
            <Link
              href="/admin/workout-templates"
              className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-800"
            >
              <BookOpen className="h-4 w-4" aria-hidden />
              Workout library
            </Link>
          </div>

          {filterMoaiOptions.length > 0 && (
            <div className="rounded-xl border border-gray-200 bg-gray-50/80 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">
                Filter by Focus Moai
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setFilterMoaiId(null)}
                  className={cn(
                    "rounded-full px-3 py-1.5 text-xs font-medium border transition-colors",
                    filterMoaiId === null
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-white text-gray-700 border-gray-200 hover:border-gray-300",
                  )}
                >
                  All programs
                </button>
                {filterMoaiOptions.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() =>
                      setFilterMoaiId((cur) => (cur === opt.id ? null : opt.id))
                    }
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium border transition-colors",
                      filterMoaiId === opt.id
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-white text-gray-700 border-gray-200 hover:border-gray-300",
                    )}
                  >
                    <Target className="h-3 w-3" aria-hidden />
                    {opt.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {visiblePrograms.length === 0 ? (
            <p className="text-sm text-gray-500 py-8 text-center border border-dashed border-gray-200 rounded-xl">
              No programs use this Focus Moai.{" "}
              <button
                type="button"
                className="text-blue-600 font-medium hover:underline"
                onClick={() => setFilterMoaiId(null)}
              >
                Clear filter
              </button>
            </p>
          ) : (
            <>
              {/* ── Table ── */}
              <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50/80 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      <th className="py-3 pl-5 pr-3">Program</th>
                      <th className="px-3 py-3 hidden md:table-cell">
                        Plan ID
                      </th>
                      <th className="px-3 py-3 hidden lg:table-cell">
                        Schedule
                      </th>
                      <th className="px-3 py-3 hidden sm:table-cell">Gender</th>
                      <th className="px-3 py-3 hidden lg:table-cell">Ages</th>
                      <th className="px-3 py-3">Level</th>
                      <th className="px-3 py-3">Users</th>
                      <th className="px-3 py-3 hidden lg:table-cell">
                        Equipment
                      </th>
                      <th className="px-3 py-3 hidden md:table-cell">
                        Focus Moais
                      </th>
                      <th className="py-3 pl-3 pr-5">
                        <span className="sr-only">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {visiblePrograms.map((p) => {
                      const deprecated = Boolean(p.is_deprecated);
                      const href = `/admin/workout-programs/${encodeURIComponent(p.plan_id)}`;

                      return (
                        <tr
                          key={p.plan_id}
                          className={cn(
                            "group transition-colors",
                            deprecated
                              ? "bg-amber-50/40"
                              : "hover:bg-gray-50/60",
                          )}
                        >
                          {/* Program name */}
                          <td className="py-3 pl-5 pr-3">
                            <div className="flex flex-col gap-1">
                              <Link
                                href={href}
                                className={cn(
                                  "font-medium transition-colors",
                                  deprecated
                                    ? "text-gray-600 hover:text-amber-900"
                                    : "text-gray-900 hover:text-blue-700",
                                )}
                              >
                                {p.plan_name}
                              </Link>
                              {deprecated && (
                                <span className="inline-block w-fit rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-amber-800">
                                  Deprecated
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Plan ID */}
                          <td className="px-3 py-3 hidden md:table-cell">
                            <Link
                              href={href}
                              className="font-mono text-xs text-gray-500 hover:text-blue-600 hover:underline"
                              title={p.plan_id}
                            >
                              <span className="inline-block max-w-[160px] truncate">
                                {p.plan_id}
                              </span>
                            </Link>
                          </td>

                          {/* Schedule */}
                          <td className="px-3 py-3 hidden lg:table-cell">
                            <span className="inline-flex items-center gap-1 text-xs text-gray-600">
                              <CalendarDays
                                className="h-3.5 w-3.5 text-gray-400"
                                aria-hidden
                              />
                              {p.days_per_week}d/wk
                            </span>
                          </td>

                          {/* Gender */}
                          <td className="px-3 py-3 hidden sm:table-cell">
                            <span className="inline-flex items-center gap-1 text-xs text-gray-600">
                              <UserCircle
                                className="h-3.5 w-3.5 text-gray-400"
                                aria-hidden
                              />
                              {p.gender}
                            </span>
                          </td>

                          {/* Ages */}
                          <td className="px-3 py-3 hidden lg:table-cell whitespace-nowrap text-xs text-gray-600">
                            {p.min_age}–{p.max_age}
                          </td>

                          {/* Difficulty */}
                          <td className="px-3 py-3">
                            {p.difficulty_level ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-800">
                                <Layers
                                  className="h-3 w-3 text-blue-500"
                                  aria-hidden
                                />
                                {p.difficulty_level}
                              </span>
                            ) : (
                              <span className="text-xs text-gray-400">—</span>
                            )}
                          </td>

                          {/* Users */}
                          <td className="px-3 py-3">
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-700">
                              <Users
                                className="h-3.5 w-3.5 text-violet-500"
                                aria-hidden
                              />
                              {p.assigned_user_count}
                            </span>
                          </td>

                          {/* Equipment */}
                          <td className="px-3 py-3 hidden lg:table-cell">
                            {Array.isArray(p.equipment_required) &&
                            p.equipment_required.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {p.equipment_required.map((eq: string) => (
                                  <span
                                    key={eq}
                                    className="inline-block rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600"
                                  >
                                    {eq}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-xs text-gray-400">—</span>
                            )}
                          </td>

                          {/* Focus Moais */}
                          <td className="px-3 py-3 hidden md:table-cell">
                            {p.focus_moais.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {p.focus_moais.map((fm) => (
                                  <button
                                    key={fm.id}
                                    type="button"
                                    onClick={() => setFilterMoaiId(fm.id)}
                                    className={cn(
                                      "inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[11px] font-medium border transition-colors",
                                      fm.status === "active"
                                        ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                                        : "bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100",
                                    )}
                                    title="Filter by this Focus Moai"
                                  >
                                    <Target
                                      className="h-2.5 w-2.5 opacity-60"
                                      aria-hidden
                                    />
                                    {fm.name}
                                  </button>
                                ))}
                              </div>
                            ) : (
                              <span className="text-xs text-gray-400">—</span>
                            )}
                          </td>

                          {/* Action */}
                          <td className="py-3 pl-3 pr-5">
                            <Link
                              href={href}
                              className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100"
                            >
                              Open
                              <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* ── Pagination ── */}
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-gray-500">
                  Showing {rangeStart}–{rangeEnd} of {total}
                </p>

                <div className="flex items-center gap-3">
                  {/* Page size select */}
                  <label className="flex items-center gap-1.5 text-xs text-gray-500">
                    Rows
                    <select
                      value={pageSize}
                      onChange={(e) =>
                        handlePageSizeChange(Number(e.target.value))
                      }
                      className="rounded-md border border-gray-200 bg-white py-1 pl-2 pr-6 text-xs text-gray-700 shadow-sm focus:border-blue-300 focus:outline-none focus:ring-1 focus:ring-blue-300"
                    >
                      {PAGE_SIZE_OPTIONS.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </label>

                  {/* Page buttons */}
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={page <= 1}
                      onClick={() => setPage(1)}
                      className="rounded-md border border-gray-200 p-1.5 text-gray-500 transition-colors hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed"
                      aria-label="First page"
                    >
                      <ChevronsLeft className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={page <= 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      className="rounded-md border border-gray-200 p-1.5 text-gray-500 transition-colors hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed"
                      aria-label="Previous page"
                    >
                      <ChevronLeft className="h-3.5 w-3.5" />
                    </button>

                    <span className="px-2 text-xs tabular-nums text-gray-700">
                      {page}
                      <span className="text-gray-400"> / </span>
                      {totalPages}
                    </span>

                    <button
                      type="button"
                      disabled={page >= totalPages}
                      onClick={() =>
                        setPage((p) => Math.min(totalPages, p + 1))
                      }
                      className="rounded-md border border-gray-200 p-1.5 text-gray-500 transition-colors hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed"
                      aria-label="Next page"
                    >
                      <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={page >= totalPages}
                      onClick={() => setPage(totalPages)}
                      className="rounded-md border border-gray-200 p-1.5 text-gray-500 transition-colors hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed"
                      aria-label="Last page"
                    >
                      <ChevronsRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {!loading && !error && programs.length === 0 && (
        <div className="mt-12 rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50/60 px-6 py-14 text-center sm:px-12">
          <Layers className="mx-auto h-10 w-10 text-gray-400" aria-hidden />
          <h2 className="mt-4 text-lg font-semibold text-gray-900">
            No programs yet
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-gray-600">
            Create your first program to attach workouts and define training
            blocks for your users.
          </p>
          <Link
            href="/admin/workout-programs/new"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" aria-hidden />
            Create program
          </Link>
          <p className="mt-8">
            <Link
              href="/admin/workout-templates"
              className="text-sm font-medium text-blue-600 hover:text-blue-800"
            >
              Or browse the workout library →
            </Link>
          </p>
        </div>
      )}
    </div>
  );
}
