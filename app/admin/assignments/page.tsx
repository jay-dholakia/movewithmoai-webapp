"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Search,
  Users,
  Users2,
} from "lucide-react";
import { AdminService } from "@/lib/services/adminService";
import type {
  AssignmentStats,
  FocusMoaiRef,
  ProgramAssignmentRow,
  UserRef,
} from "@/lib/types/assignments";
import {
  AdminCardSkeleton,
  AdminListSkeleton,
  AdminPageTitleSkeleton,
} from "@/components/admin/AdminLoadingSkeleton";
import { AdminProgramsTabs } from "@/components/admin/AdminSectionTabs";
import { cn } from "@/lib/utils";

const EMPTY_STATS: AssignmentStats = {
  total_programs: 0,
  programs_with_any_assignment: 0,
  total_focus_moais_assigned: 0,
  total_users_assigned: 0,
};

export default function AssignmentsPage() {
  const [rows, setRows] = useState<ProgramAssignmentRow[]>([]);
  const [stats, setStats] = useState<AssignmentStats>(EMPTY_STATS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [q, setQ] = useState("");
  const [includeUnassigned, setIncludeUnassigned] = useState(false);
  const [includeDeprecated, setIncludeDeprecated] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await AdminService.listProgramAssignments({
      includeDeprecated,
      includeUnassigned,
      q,
    });
    setLoading(false);
    if (res.success && Array.isArray(res.programs)) {
      setRows(res.programs as ProgramAssignmentRow[]);
      setStats((res.stats as AssignmentStats) ?? EMPTY_STATS);
    } else {
      setError(res.error || "Failed to load assignments");
    }
  }, [includeDeprecated, includeUnassigned, q]);

  useEffect(() => {
    const t = setTimeout(() => void load(), 250);
    return () => clearTimeout(t);
  }, [load]);

  const totalUsersInView = useMemo(
    () =>
      rows.reduce(
        (n, r) => n + r.assigned_users.length + (r.scoped_user ? 1 : 0),
        0,
      ),
    [rows],
  );
  const totalMoaisInView = useMemo(
    () =>
      rows.reduce(
        (n, r) =>
          n +
          r.focus_moais_via_workout_focus.length +
          (r.scoped_focus_moai ? 1 : 0),
        0,
      ),
    [rows],
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <AdminProgramsTabs />

      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Assignments</h1>
        <p className="mt-1 text-sm text-gray-600">
          Who&apos;s running which program. Programs are shown with every focus
          moai and member currently mapped to them.
        </p>
      </div>

      {/* Stats */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Programs" value={stats.total_programs} />
        <StatCard
          label="With assignments"
          value={stats.programs_with_any_assignment}
        />
        <StatCard
          label="Focus moais assigned"
          value={stats.total_focus_moais_assigned}
        />
        <StatCard label="Users assigned" value={stats.total_users_assigned} />
      </div>

      {/* Controls */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-55">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search programs by name…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="w-full rounded-lg border border-gray-200 bg-white pl-9 pr-3 py-2 text-sm text-gray-900 focus:border-blue-400 focus:ring-1 focus:ring-blue-200 focus:outline-none"
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={includeUnassigned}
            onChange={(e) => setIncludeUnassigned(e.target.checked)}
            className="rounded border-gray-300"
          />
          Show programs with no assignments
        </label>
        <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={includeDeprecated}
            onChange={(e) => setIncludeDeprecated(e.target.checked)}
            className="rounded border-gray-300"
          />
          Include deprecated
        </label>
      </div>

      {loading && (
        <div className="space-y-4" aria-busy="true">
          <AdminPageTitleSkeleton />
          <AdminCardSkeleton lines={2} />
          <AdminListSkeleton rows={4} />
        </div>
      )}

      {!loading && error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {error}
        </div>
      )}

      {!loading && !error && rows.length === 0 && (
        <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50/60 p-10 text-center text-sm text-gray-500">
          {q.trim()
            ? "No programs match your search."
            : includeUnassigned
              ? "No programs found."
              : "No programs currently have assignments. Toggle 'Show programs with no assignments' to see everything."}
        </div>
      )}

      {!loading && !error && rows.length > 0 && (
        <>
          <p className="text-xs text-gray-500 mb-3">
            Showing {rows.length} program{rows.length === 1 ? "" : "s"} ·{" "}
            {totalMoaisInView} focus moai{totalMoaisInView === 1 ? "" : "s"} ·{" "}
            {totalUsersInView} user{totalUsersInView === 1 ? "" : "s"} in view
          </p>
          <ul className="space-y-3">
            {rows.map((r) => (
              <ProgramAssignmentCard key={r.id} row={r} />
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

/* ---------------- Sub-components ---------------- */

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-3">
      <p className="text-xs uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums text-gray-900">
        {value}
      </p>
    </div>
  );
}

function ProgramAssignmentCard({ row }: { row: ProgramAssignmentRow }) {
  const [expanded, setExpanded] = useState(false);

  const totalMoais =
    row.focus_moais_via_workout_focus.length + (row.scoped_focus_moai ? 1 : 0);
  const totalUsers = row.assigned_users.length + (row.scoped_user ? 1 : 0);
  const hasAny = totalMoais > 0 || totalUsers > 0;

  const isPublished = row.status === "published";

  return (
    <li className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-gray-50 transition"
      >
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-gray-900 truncate">
              {row.plan_name}
            </p>
            <span className="text-xs font-mono text-gray-400">
              {row.plan_id}
            </span>
            <Badge
              className={
                isPublished
                  ? "bg-emerald-50 text-emerald-800"
                  : "bg-amber-50 text-amber-800"
              }
            >
              {isPublished ? "Published" : "Draft"}
            </Badge>
            {row.difficulty_level && (
              <Badge className="bg-blue-50 text-blue-800">
                {row.difficulty_level}
              </Badge>
            )}
            {row.is_paid && (
              <Badge className="bg-violet-50 text-violet-800">Paid</Badge>
            )}
            {row.is_deprecated && (
              <Badge className="bg-gray-100 text-gray-700">Deprecated</Badge>
            )}
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-3 text-xs text-gray-600">
            <span className="inline-flex items-center gap-1">
              <Users2 className="h-3.5 w-3.5" />
              {totalMoais} focus moai{totalMoais === 1 ? "" : "s"}
            </span>
            <span className="inline-flex items-center gap-1">
              <Users className="h-3.5 w-3.5" />
              {totalUsers} user{totalUsers === 1 ? "" : "s"}
            </span>
            {!hasAny && (
              <span className="text-gray-400 italic">No assignments</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link
            href={`/admin/workout-programs/${encodeURIComponent(row.plan_id)}`}
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800"
          >
            Open
            <ExternalLink className="h-3 w-3" />
          </Link>
          {hasAny && (
            <span className="text-gray-400">
              {expanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </span>
          )}
        </div>
      </button>

      {expanded && hasAny && (
        <div className="border-t border-gray-100 bg-gray-50/40 px-4 py-3 space-y-4">
          {(row.scoped_focus_moai ||
            row.focus_moais_via_workout_focus.length > 0) && (
            <AssignmentSection
              title="Focus moais"
              count={totalMoais}
              icon={<Users2 className="h-3.5 w-3.5 text-gray-500" />}
            >
              {row.scoped_focus_moai && (
                <FocusMoaiChip
                  moai={row.scoped_focus_moai}
                  badge="Scoped to program"
                />
              )}
              {row.focus_moais_via_workout_focus.map((fm: any) => (
                <FocusMoaiChip key={fm.id} moai={fm} />
              ))}
            </AssignmentSection>
          )}

          {(row.scoped_user || row.assigned_users.length > 0) && (
            <AssignmentSection
              title="Users"
              count={totalUsers}
              icon={<Users className="h-3.5 w-3.5 text-gray-500" />}
            >
              {row.scoped_user && (
                <UserChip user={row.scoped_user} badge="Scoped to program" />
              )}
              {row.assigned_users.map((u: any) => (
                <UserChip key={u.id} user={u} />
              ))}
            </AssignmentSection>
          )}
        </div>
      )}
    </li>
  );
}

function AssignmentSection({
  title,
  count,
  icon,
  children,
}: {
  title: string;
  count: number;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="mb-2 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-gray-600">
        {icon}
        {title}
        <span className="text-gray-400">· {count}</span>
      </p>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

function FocusMoaiChip({
  moai,
  badge,
}: {
  moai: FocusMoaiRef;
  badge?: string;
}) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1 text-xs">
      <span className="font-medium text-gray-900">{moai.name}</span>
      <span
        className={cn(
          "rounded-full px-1.5 py-0.5 text-[10px] font-medium",
          moai.status === "active"
            ? "bg-emerald-50 text-emerald-700"
            : "bg-gray-100 text-gray-600",
        )}
      >
        {moai.status}
      </span>
      {badge && (
        <span className="rounded-full bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium text-blue-700">
          {badge}
        </span>
      )}
    </div>
  );
}

function UserChip({ user, badge }: { user: UserRef; badge?: string }) {
  const displayName =
    [user.first_name, user.last_name].filter(Boolean).join(" ").trim() ||
    user.username ||
    user.email ||
    "Unknown user";

  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1 text-xs">
      <span className="font-medium text-gray-900">{displayName}</span>
      {user.email && displayName !== user.email && (
        <span className="text-gray-500">· {user.email}</span>
      )}
      {badge && (
        <span className="rounded-full bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium text-blue-700">
          {badge}
        </span>
      )}
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
        "rounded-full px-2 py-0.5 text-[10px] font-medium",
        className,
      )}
    >
      {children}
    </span>
  );
}
