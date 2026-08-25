"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Users,
  UserCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AdminService } from "@/lib/services/adminService";

type AssignType = "focus_moai" | "user";
export type PaidAssignment = {
  type: AssignType;
  id: string;
  label: string;
} | null;

type FocusMoai = {
  id: string;
  name: string;
  status: string;
  max_members: number;
};

type AssignableUser = {
  id: string;
  display_name: string | null;
  first_name: string;
  last_name: string;
  email: string;
};

const PAGE_SIZE = 8;

async function fetchJSON(url: string) {
  const h = await (AdminService as any).workoutBuilderHeaders();
  const res = await fetch(url, { headers: h ?? {} });
  return res.json();
}

export function PaidAssignmentSection({
  value,
  onChange,
}: {
  value: PaidAssignment;
  onChange: (v: PaidAssignment) => void;
}) {
  const [assignType, setAssignType] = useState<AssignType | null>(
    value?.type ?? null,
  );

  // Focus moai state
  const [moais, setMoais] = useState<FocusMoai[]>([]);
  const [moaiTotal, setMoaiTotal] = useState(0);
  const [moaiPage, setMoaiPage] = useState(1);
  const [moaiLoading, setMoaiLoading] = useState(false);

  // User state
  const [users, setUsers] = useState<AssignableUser[]>([]);
  const [userTotal, setUserTotal] = useState(0);
  const [userPage, setUserPage] = useState(1);
  const [userLoading, setUserLoading] = useState(false);
  const [userSearch, setUserSearch] = useState("");

  // Load focus moais
  const loadMoais = useCallback(async () => {
    setMoaiLoading(true);
    try {
      const res = await fetchJSON(
        `/api/admin/focus-moais?page=${moaiPage}&page_size=${PAGE_SIZE}`,
      );
      if (res.success) {
        setMoais(res.focus_moais ?? []);
        setMoaiTotal(res.total ?? 0);
      }
    } catch {
      /* ignore */
    } finally {
      setMoaiLoading(false);
    }
  }, [moaiPage]);

  // Load paid users
  const loadUsers = useCallback(async () => {
    setUserLoading(true);
    try {
      const q = new URLSearchParams({
        page: String(userPage),
        page_size: String(PAGE_SIZE),
      });
      if (userSearch.trim()) q.set("search", userSearch.trim());
      const res = await fetchJSON(`/api/admin/paid-users?${q}`);
      if (res.success) {
        setUsers(res.users ?? []);
        setUserTotal(res.total ?? 0);
      }
    } catch {
      /* ignore */
    } finally {
      setUserLoading(false);
    }
  }, [userPage, userSearch]);

  useEffect(() => {
    if (assignType === "focus_moai") loadMoais();
  }, [assignType, loadMoais]);

  useEffect(() => {
    if (assignType === "user") loadUsers();
  }, [assignType, loadUsers]);

  // Reset page when search changes
  useEffect(() => {
    setUserPage(1);
  }, [userSearch]);

  const handleTypeChange = (t: AssignType) => {
    setAssignType(t);
    onChange(null); // clear selection when switching
  };

  const moaiPages = Math.max(1, Math.ceil(moaiTotal / PAGE_SIZE));
  const userPages = Math.max(1, Math.ceil(userTotal / PAGE_SIZE));

  return (
    <div className="rounded-lg border border-blue-200 bg-blue-50/40 p-4 space-y-4">
      <div>
        <p className="text-sm font-medium text-gray-700">
          Assign to{" "}
          <span className="text-xs font-normal text-gray-500">(optional)</span>
        </p>
        <p className="text-xs text-gray-500 mt-0.5">
          You can also assign later from the program editor.
        </p>
      </div>

      {/* Type picker */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => handleTypeChange("focus_moai")}
          className={cn(
            "cursor-pointer inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
            assignType === "focus_moai"
              ? "border-blue-600 bg-blue-600 text-white"
              : "border-gray-200 bg-white text-gray-700 hover:border-gray-300",
          )}
        >
          <Users className="h-3.5 w-3.5" />
          Focus Moai
        </button>
        <button
          type="button"
          onClick={() => handleTypeChange("user")}
          className={cn(
            "cursor-pointer inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
            assignType === "user"
              ? "border-blue-600 bg-blue-600 text-white"
              : "border-gray-200 bg-white text-gray-700 hover:border-gray-300",
          )}
        >
          <UserCircle className="h-3.5 w-3.5" />
          Individual User
        </button>

        {value && (
          <button
            type="button"
            onClick={() => {
              setAssignType(null);
              onChange(null);
            }}
            className="cursor-pointer ml-auto text-xs text-gray-500 hover:text-gray-700"
          >
            Clear
          </button>
        )}
      </div>

      {/* Focus Moai picker */}
      {assignType === "focus_moai" && (
        <div className="rounded-lg border border-gray-200 bg-white divide-y divide-gray-100 overflow-hidden">
          {moaiLoading ? (
            <LoadingRow />
          ) : moais.length === 0 ? (
            <EmptyRow text="No focus moais found." />
          ) : (
            moais.map((m) => (
              <PickerRow
                key={m.id}
                selected={value?.id === m.id}
                onClick={() =>
                  onChange(
                    value?.id === m.id
                      ? null
                      : { type: "focus_moai", id: m.id, label: m.name },
                  )
                }
                title={m.name}
                subtitle={`${m.status} · ${m.max_members} max members`}
              />
            ))
          )}
          {moaiPages > 1 && (
            <PaginationRow
              page={moaiPage}
              totalPages={moaiPages}
              onPrev={() => setMoaiPage((p) => p - 1)}
              onNext={() => setMoaiPage((p) => p + 1)}
            />
          )}
        </div>
      )}

      {/* User picker */}
      {assignType === "user" && (
        <div className="space-y-2">
          <input
            type="text"
            placeholder="Search by name or email…"
            className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            value={userSearch}
            onChange={(e) => setUserSearch(e.target.value)}
          />
          <div className="rounded-lg border border-gray-200 bg-white divide-y divide-gray-100 overflow-hidden">
            {userLoading ? (
              <LoadingRow />
            ) : users.length === 0 ? (
              <EmptyRow text="No paid users found." />
            ) : (
              users.map((u) => {
                const name =
                  u.display_name ||
                  [u.first_name, u.last_name].filter(Boolean).join(" ") ||
                  u.email;
                return (
                  <PickerRow
                    key={u.id}
                    selected={value?.id === u.id}
                    onClick={() =>
                      onChange(
                        value?.id === u.id
                          ? null
                          : { type: "user", id: u.id, label: name },
                      )
                    }
                    title={name}
                    subtitle={u.email}
                  />
                );
              })
            )}
            {userPages > 1 && (
              <PaginationRow
                page={userPage}
                totalPages={userPages}
                onPrev={() => setUserPage((p) => p - 1)}
                onNext={() => setUserPage((p) => p + 1)}
              />
            )}
          </div>
        </div>
      )}

      {/* Selection summary */}
      {value && (
        <p className="text-xs text-blue-700">
          Will assign to <span className="font-medium">{value.label}</span>{" "}
          after creation.
        </p>
      )}
    </div>
  );
}

/* ── Small helpers ── */

function PickerRow({
  selected,
  onClick,
  title,
  subtitle,
}: {
  selected: boolean;
  onClick: () => void;
  title: string;
  subtitle: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "cursor-pointer flex w-full items-center justify-between px-4 py-2.5 text-left transition-colors",
        selected ? "bg-blue-100" : "hover:bg-gray-100",
      )}
    >
      <div className="min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">{title}</p>
        <p className="text-xs text-gray-500 truncate">{subtitle}</p>
      </div>
      {selected && <Check className="h-4 w-4 shrink-0 text-blue-600" />}
    </button>
  );
}

function LoadingRow() {
  return (
    <div className="flex items-center justify-center py-6 text-sm text-gray-500">
      <Loader2 className="h-4 w-4 animate-spin mr-2" />
      Loading…
    </div>
  );
}

function EmptyRow({ text }: { text: string }) {
  return <p className="py-6 text-center text-sm text-gray-500">{text}</p>;
}

function PaginationRow({
  page,
  totalPages,
  onPrev,
  onNext,
}: {
  page: number;
  totalPages: number;
  onPrev: () => void;
  onNext: () => void;
}) {
  return (
    <div className="flex items-center justify-between px-4 py-2 bg-gray-50/60">
      <span className="text-xs text-gray-500">
        {page} / {totalPages}
      </span>
      <div className="flex gap-1">
        <button
          type="button"
          disabled={page <= 1}
          onClick={onPrev}
          className="cursor-pointer rounded border border-gray-200 p-1 text-gray-500 disabled:opacity-30"
        >
          <ChevronLeft className="h-3 w-3" />
        </button>
        <button
          type="button"
          disabled={page >= totalPages}
          onClick={onNext}
          className="cursor-pointer rounded border border-gray-200 p-1 text-gray-500 disabled:opacity-30"
        >
          <ChevronRight className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}
