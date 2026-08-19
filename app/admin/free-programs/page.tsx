"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  Search,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AdminService } from "@/lib/services/adminService";
import {
  AdminFocusTabs,
  AdminProgramsTabs,
} from "@/components/admin/AdminSectionTabs";

type FreeLibraryProgram = {
  id: string;
  plan_id: string;
  plan_name: string;
  difficulty_level: string | null;
  description: string | null;
  status: string;
  is_free_library: boolean;
};

const PAGE_SIZE = 20;

async function apiFetch(url: string, opts?: RequestInit) {
  const h = await (AdminService as any).workoutBuilderHeaders();
  const res = await fetch(url, {
    ...opts,
    headers: {
      ...h,
      "Content-Type": "application/json",
      ...(opts?.headers ?? {}),
    },
  });
  return res.json();
}

export default function FreeLibraryPage() {
  const [programs, setPrograms] = useState<FreeLibraryProgram[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [onlySelected, setOnlySelected] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      page: String(page),
      page_size: String(PAGE_SIZE),
    });
    if (search.trim()) params.set("q", search.trim());
    if (onlySelected) params.set("only_selected", "true");

    const res = await apiFetch(`/api/admin/free-library?${params}`);
    if (res.success) {
      setPrograms(res.programs ?? []);
      setTotal(res.total ?? 0);
    }
    setLoading(false);
  }, [page, search, onlySelected]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [search, onlySelected]);

  const toggle = async (program: FreeLibraryProgram) => {
    setTogglingId(program.id);
    const next = !program.is_free_library;

    setPrograms((prev) =>
      prev.map((p) =>
        p.id === program.id ? { ...p, is_free_library: next } : p,
      ),
    );

    const res = await apiFetch(
      `/api/admin/free-library/${encodeURIComponent(program.plan_id)}`,
      { method: "PATCH", body: JSON.stringify({ is_free_library: next }) },
    );

    setTogglingId(null);

    if (!res.success) {
      setPrograms((prev) =>
        prev.map((p) =>
          p.id === program.id ? { ...p, is_free_library: !next } : p,
        ),
      );
      alert(res.error || "Failed to update");
    } else if (onlySelected && !next) {
      setPrograms((prev) => prev.filter((p) => p.id !== program.id));
      setTotal((t) => Math.max(0, t - 1));
    }
  };

  const selectedCount = programs.filter((p) => p.is_free_library).length;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <AdminProgramsTabs />

      <header className="mb-6 space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900">
          Free Library
        </h1>
        <p className="text-sm text-gray-500">
          Choose which free programs are shown to free-tier users in the app.
          Only non-paid programs are eligible.
        </p>
      </header>

      {/* Controls */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-55">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search programs…"
            className="block w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            className="cursor-pointer rounded border-gray-300"
            checked={onlySelected}
            onChange={(e) => setOnlySelected(e.target.checked)}
          />
          Show only selected
        </label>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50/80 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
              <th className="py-3 pl-5 pr-3">Program</th>
              <th className="px-3 py-3">Level</th>
              <th className="px-3 py-3">Status</th>
              <th className="px-3 py-3">Plan ID</th>
              <th className="py-3 pl-3 pr-5 text-right">In Free Library</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td
                  colSpan={5}
                  className="py-10 text-center text-sm text-gray-500"
                >
                  <Loader2 className="h-4 w-4 animate-spin inline mr-2" />
                  Loading…
                </td>
              </tr>
            ) : programs.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="py-10 text-center text-sm text-gray-500"
                >
                  No eligible free programs found.
                </td>
              </tr>
            ) : (
              programs.map((p) => (
                <tr
                  key={p.id}
                  className="hover:bg-gray-50/60 transition-colors"
                >
                  <td className="py-3 pl-5 pr-3">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/admin/workout-programs/${encodeURIComponent(p.plan_id)}`}
                        className="cursor-pointer font-medium text-gray-900 hover:text-blue-700 transition-colors"
                      >
                        {p.plan_name}
                      </Link>
                      <Link
                        href={`/admin/workout-programs/${encodeURIComponent(p.plan_id)}`}
                        className="cursor-pointer text-gray-300 hover:text-blue-500"
                      >
                        <ExternalLink className="h-3 w-3" />
                      </Link>
                    </div>
                    {p.description && (
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">
                        {p.description}
                      </p>
                    )}
                  </td>
                  <td className="px-3 py-3 text-xs text-gray-600">
                    {p.difficulty_level ?? "—"}
                  </td>
                  <td className="px-3 py-3">
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[11px] font-medium",
                        p.status === "published"
                          ? "bg-emerald-50 text-emerald-800"
                          : "bg-amber-50 text-amber-800",
                      )}
                    >
                      {p.status === "published" ? "Published" : "Draft"}
                    </span>
                  </td>
                  <td className="px-3 py-3 font-mono text-xs text-gray-400">
                    {p.plan_id}
                  </td>
                  <td className="py-3 pl-3 pr-5 text-right">
                    <button
                      type="button"
                      role="switch"
                      aria-checked={p.is_free_library}
                      disabled={togglingId === p.id}
                      onClick={() => toggle(p)}
                      className={cn(
                        "relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
                        p.is_free_library ? "bg-blue-600" : "bg-gray-300",
                      )}
                    >
                      <span
                        className={cn(
                          "inline-block h-5 w-5 rounded-full bg-white shadow transition-transform",
                          p.is_free_library
                            ? "translate-x-5"
                            : "translate-x-0.5",
                        )}
                      />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-xs text-gray-500">
            Page {page} of {totalPages} · {total} program
            {total === 1 ? "" : "s"}
            {!onlySelected && ` · ${selectedCount} selected on this page`}
          </p>
          <div className="flex gap-1">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="cursor-pointer rounded-md border border-gray-200 p-1.5 text-gray-500 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-30"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="cursor-pointer rounded-md border border-gray-200 p-1.5 text-gray-500 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-30"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
