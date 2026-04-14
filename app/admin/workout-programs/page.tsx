"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AdminService } from "@/lib/services/adminService";
import type { EnrichedWorkoutProgramRow } from "@/lib/types/workout-builder";
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  Layers,
  Plus,
  Target,
  UserCircle,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Shimmer } from "@/components/admin/AdminLoadingSkeleton";
import { AdminProgramsTabs } from "@/components/admin/AdminSectionTabs";

function ProgramsGridSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="rounded-xl border border-gray-200 bg-white p-5 space-y-4"
        >
          <div className="flex justify-between gap-3">
            <Shimmer className="h-6 flex-1 max-w-[70%]" />
            <Shimmer className="h-5 w-5 shrink-0 rounded" />
          </div>
          <Shimmer className="h-4 w-full max-w-[90%]" />
          <div className="flex flex-wrap gap-2">
            <Shimmer className="h-6 w-20 rounded-full" />
            <Shimmer className="h-6 w-16 rounded-full" />
            <Shimmer className="h-6 w-24 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

function ProgramCard({
  program: p,
  onMoaiPillClick,
}: {
  program: EnrichedWorkoutProgramRow;
  onMoaiPillClick: (focusMoaiId: string) => void;
}) {
  const href = `/admin/workout-programs/${encodeURIComponent(p.plan_id)}`;
  const deprecated = Boolean(p.is_deprecated);

  return (
    <li className="h-full min-h-0">
      <div
        className={cn(
          "flex h-full min-h-[220px] flex-col rounded-xl border bg-white p-5 shadow-sm transition-all duration-200",
          deprecated
            ? "border-amber-200/80"
            : "border-gray-200 hover:border-blue-200 hover:shadow-md",
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <Link
              href={href}
              className={cn(
                "group/title inline-flex items-start gap-2 text-lg font-semibold leading-snug transition-colors",
                deprecated
                  ? "text-gray-700 hover:text-amber-900"
                  : "text-gray-900 hover:text-blue-700",
              )}
            >
              <span>{p.plan_name}</span>
              <ArrowRight
                className={cn(
                  "h-5 w-5 shrink-0 mt-0.5 opacity-0 transition-all group-hover/title:opacity-100 group-hover/title:translate-x-0.5",
                  deprecated
                    ? "text-amber-500"
                    : "text-gray-400 group-hover/title:text-blue-500",
                )}
                aria-hidden
              />
            </Link>
            {deprecated && (
              <span className="mt-1.5 inline-block rounded-md bg-amber-100 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-amber-900">
                Deprecated
              </span>
            )}
          </div>
        </div>

        <Link
          href={href}
          className="mt-2 truncate font-mono text-xs text-gray-500 hover:text-blue-600 hover:underline"
          title={p.plan_id}
        >
          {p.plan_id}
        </Link>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2.5 py-1 text-xs font-medium text-violet-800 border border-violet-100">
            <Users className="h-3.5 w-3.5 text-violet-600" aria-hidden />
            {p.assigned_user_count} user
            {p.assigned_user_count === 1 ? "" : "s"} assigned
          </span>
        </div>

        {p.focus_moais.length > 0 && (
          <div className="mt-3">
            <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500 mb-1.5">
              Focus Moais
            </p>
            <div className="flex flex-wrap gap-1.5">
              {p.focus_moais.map((fm) => (
                <button
                  key={fm.id}
                  type="button"
                  onClick={() => onMoaiPillClick(fm.id)}
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium border transition-colors",
                    fm.status === "active"
                      ? "bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100"
                      : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100",
                  )}
                  title="Filter programs by this Focus Moai"
                >
                  <Target className="h-3 w-3 shrink-0 opacity-70" aria-hidden />
                  {fm.name}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700">
            <CalendarDays className="h-3.5 w-3.5 text-gray-500" aria-hidden />
            {p.days_per_week} days/wk
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700">
            <UserCircle className="h-3.5 w-3.5 text-gray-500" aria-hidden />
            {p.gender}
          </span>
          <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700">
            Ages {p.min_age}–{p.max_age}
          </span>
          {p.difficulty_level ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-800">
              <Layers className="h-3.5 w-3.5 text-blue-600" aria-hidden />
              {p.difficulty_level}
            </span>
          ) : null}
        </div>

        <div className="mt-4 min-h-[2.75rem] flex-1">
          {p.description ? (
            <Link href={href} className="block">
              <p className="line-clamp-2 text-sm leading-relaxed text-gray-600 hover:text-gray-900">
                {p.description}
              </p>
            </Link>
          ) : null}
        </div>

        <Link
          href={href}
          className="mt-4 border-t border-gray-100 pt-4 text-sm font-medium text-blue-600 hover:text-blue-700"
        >
          Open program →
        </Link>
      </div>
    </li>
  );
}

export default function WorkoutProgramsPage() {
  const [programs, setPrograms] = useState<EnrichedWorkoutProgramRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterMoaiId, setFilterMoaiId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await AdminService.listWorkoutProgramsEnriched(true);
    if (res.success && Array.isArray(res.programs)) {
      setPrograms(res.programs as EnrichedWorkoutProgramRow[]);
    } else {
      setError(
        (res as { error?: string }).error || "Failed to load programs",
      );
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

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
          <ProgramsGridSkeleton />
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
              <span className="font-semibold text-gray-900">
                {programs.length}
              </span>{" "}
              program{programs.length === 1 ? "" : "s"}
              {deprecatedCount > 0 ? (
                <>
                  {" "}
                  ·{" "}
                  <span className="text-gray-500">
                    {activeCount} active
                    {deprecatedCount > 0
                      ? `, ${deprecatedCount} deprecated`
                      : ""}
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
                      setFilterMoaiId((cur) =>
                        cur === opt.id ? null : opt.id,
                      )
                    }
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium border transition-colors",
                      filterMoaiId === opt.id
                        ? "bg-emerald-600 text-white border-emerald-600"
                        : "bg-white text-gray-800 border-gray-200 hover:border-emerald-300",
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
            <ul className="grid gap-4 sm:grid-cols-2">
              {visiblePrograms.map((p) => (
                <ProgramCard
                  key={p.plan_id}
                  program={p}
                  onMoaiPillClick={(id) => setFilterMoaiId(id)}
                />
              ))}
            </ul>
          )}
        </div>
      )}

      {!loading && !error && programs.length === 0 && (
        <div className="mt-12 rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50/60 px-6 py-14 text-center sm:px-12">
          <Layers
            className="mx-auto h-10 w-10 text-gray-400"
            aria-hidden
          />
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
