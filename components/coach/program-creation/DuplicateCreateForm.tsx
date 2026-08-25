"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { CoachService } from "@/lib/services/coachService";
import { cn } from "@/lib/utils";
import {
  CoachAssignmentSection,
  type CoachAssignment,
} from "./CoachAssignmentSection";

type ProgramSummary = {
  id: string;
  plan_id: string;
  plan_name: string;
  difficulty_level: string | null;
  days_per_week: number;
};

function slugify(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 50);
}

const PAGE_SIZE = 10;

export function DuplicateCreateForm() {
  const router = useRouter();

  // Program list
  const [programs, setPrograms] = useState<ProgramSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [listLoading, setListLoading] = useState(true);

  // Selection & form
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [newPlanId, setNewPlanId] = useState("");
  const [planIdEdited, setPlanIdEdited] = useState(false);
  const [assignment, setAssignment] = useState<CoachAssignment>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPrograms = useCallback(async () => {
    setListLoading(true);
    try {
      // Coach sees their own programs plus the shared library via enriched endpoint.
      const res = await CoachService.listWorkoutProgramsEnriched(
        false,
        page,
        PAGE_SIZE,
      );
      if (res.success && Array.isArray(res.programs)) {
        setPrograms(res.programs as ProgramSummary[]);
        setTotal(res.total ?? res.programs.length);
      }
    } catch {
      /* ignore */
    } finally {
      setListLoading(false);
    }
  }, [page]);

  useEffect(() => {
    loadPrograms();
  }, [loadPrograms]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const handleSelect = (p: ProgramSummary) => {
    setSelectedId(p.id);
    const copyName = `${p.plan_name} (Copy)`;
    setNewName(copyName);
    if (!planIdEdited) setNewPlanId(slugify(copyName));
  };

  const handleNameChange = (name: string) => {
    setNewName(name);
    if (!planIdEdited) setNewPlanId(slugify(name));
  };

  const canSubmit =
    !!selectedId &&
    newName.trim().length > 0 &&
    newPlanId.trim().length > 0 &&
    !!assignment &&
    !loading;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit || !selectedId || !assignment) return;

    setLoading(true);
    setError(null);

    try {
      const res = await CoachService.duplicateWorkoutProgram({
        source_program_id: selectedId,
        new_plan_name: newName.trim(),
        new_plan_id: newPlanId.trim(),
        assign_type: assignment.type,
        assign_to_id: assignment.id,
      } as unknown as Parameters<
        typeof CoachService.duplicateWorkoutProgram
      >[0]);

      if (res.success && res.program?.plan_id) {
        router.push(
          `/coach/workout-programs/${encodeURIComponent(res.program.plan_id)}`,
        );
      } else {
        setError(res.error || "Failed to duplicate program");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {/* Program picker */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Select a program to duplicate
        </label>

        <div className="rounded-lg border border-gray-200 divide-y divide-gray-100 overflow-hidden">
          {listLoading ? (
            <div className="flex items-center justify-center py-8 text-sm text-gray-500">
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Loading programs…
            </div>
          ) : programs.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-500">
              No programs found.
            </p>
          ) : (
            programs.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => handleSelect(p)}
                className={cn(
                  "flex w-full items-center justify-between px-4 py-3 text-left transition-colors",
                  selectedId === p.id ? "bg-blue-50" : "hover:bg-gray-50",
                )}
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {p.plan_name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {p.days_per_week}d/wk
                    {p.difficulty_level ? ` · ${p.difficulty_level}` : ""}
                  </p>
                </div>
                {selectedId === p.id && (
                  <Check className="h-4 w-4 shrink-0 text-blue-600" />
                )}
              </button>
            ))
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-2 flex items-center justify-between">
            <p className="text-xs text-gray-500">
              Page {page} of {totalPages}
            </p>
            <div className="flex gap-1">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="rounded border border-gray-200 p-1 text-gray-500 disabled:opacity-30"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="rounded border border-gray-200 p-1 text-gray-500 disabled:opacity-30"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Rest — shown after a program is picked */}
      {selectedId && (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              New program name
            </label>
            <input
              required
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              value={newName}
              onChange={(e) => handleNameChange(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              New Plan ID
            </label>
            <input
              required
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 font-mono text-sm shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              value={newPlanId}
              onChange={(e) => {
                setPlanIdEdited(true);
                setNewPlanId(e.target.value);
              }}
            />
            <p className="mt-1 text-xs text-gray-500">
              Auto-generated from name. Edit if needed.
            </p>
          </div>

          {/* Assignment (required for coach) */}
          <CoachAssignmentSection value={assignment} onChange={setAssignment} />

          <button
            type="submit"
            disabled={!canSubmit}
            className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Duplicating…
              </>
            ) : (
              "Duplicate program"
            )}
          </button>

          {!assignment && !loading && (
            <p className="text-center text-xs text-gray-500">
              Pick a focus moai or user above to enable duplication.
            </p>
          )}
        </>
      )}
    </form>
  );
}
