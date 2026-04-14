"use client";

import { Fragment, useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { FocusMoai } from "./components/types";
import { ConfirmationModal } from "@/components/global/ConfirmationModal";
import { FocusMoaiModal } from "./components/FocusMoaiModal";
import { AdminService } from "@/lib/services/adminService";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

type FocusMoaiMemberRow = {
  id: string;
  user_id: string;
  users: {
    first_name?: string | null;
    last_name?: string | null;
    username?: string | null;
    email?: string | null;
  } | null;
};

const FocusMoaiPage = () => {
  const [supabase, setSupabase] = useState<any>(null);
  const [moais, setMoais] = useState<FocusMoai[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<"create" | "edit" | null>(null);
  const [editTarget, setEditTarget] = useState<FocusMoai | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<FocusMoai | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [expandedMoaiId, setExpandedMoaiId] = useState<string | null>(null);
  const [membersByMoai, setMembersByMoai] = useState<
    Record<string, FocusMoaiMemberRow[]>
  >({});
  const [loadingMembers, setLoadingMembers] = useState<Record<string, boolean>>(
    {},
  );
  const [memberLoadErrors, setMemberLoadErrors] = useState<
    Record<string, string>
  >({});

  useEffect(() => {
    import("@/lib/supabase").then(({ supabase }) => setSupabase(supabase));
  }, []);

  const fetchMoais = useCallback(async () => {
    if (!supabase) return;
    setLoading(true);

    const { data, error } = await supabase
      .from("focus_moais")
      .select(
        `
        *,
        workout_focus(id, name),
        coaches(id, name, first_name, last_name)
      `,
      )
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching focus moais:", error);
      setLoading(false);
      return;
    }

    // Get member counts for each moai
    const moaisWithCounts = await Promise.all(
      (data || []).map(async (moai: FocusMoai) => {
        const { count } = await supabase
          .from("focus_moai_members")
          .select("id", { count: "exact", head: true })
          .eq("focus_moai_id", moai.id)
          .eq("status", "active");

        // Calculate revenue: member_count * price_monthly
        const memberCount = count || 0;
        const revenue = memberCount * moai.price_monthly;

        return { ...moai, member_count: memberCount, revenue };
      }),
    );

    setMoais(moaisWithCounts);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchMoais();
  }, [fetchMoais]);

  const filtered = moais.filter(
    (m) =>
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      (m.description || "").toLowerCase().includes(search.toLowerCase()) ||
      (m.workout_focus?.name || "")
        .toLowerCase()
        .includes(search.toLowerCase()),
  );

  const handleEdit = (moai: FocusMoai) => {
    setEditTarget(moai);
    setModal("edit");
  };

  const closeModal = () => {
    setModal(null);
    setEditTarget(null);
  };

  const handleSaved = () => {
    closeModal();
    fetchMoais();
  };

  const handleDelete = async () => {
    if (!deleteTarget || !supabase) return;
    setDeleting(true);
    await supabase.from("focus_moais").delete().eq("id", deleteTarget.id);
    setDeleting(false);
    setDeleteTarget(null);
    fetchMoais();
  };

  const toggleStatus = async (moai: FocusMoai) => {
    const newStatus = moai.status === "active" ? "inactive" : "active";
    await supabase
      .from("focus_moais")
      .update({ status: newStatus })
      .eq("id", moai.id);
    fetchMoais();
  };

  const toggleMoaiMembers = async (moaiId: string) => {
    if (expandedMoaiId === moaiId) {
      setExpandedMoaiId(null);
      return;
    }
    setExpandedMoaiId(moaiId);
    if (membersByMoai[moaiId] || loadingMembers[moaiId]) return;
    setLoadingMembers((prev) => ({ ...prev, [moaiId]: true }));
    const res = await AdminService.getFocusMoaiMembers(moaiId);
    setLoadingMembers((prev) => ({ ...prev, [moaiId]: false }));
    if (res.success && Array.isArray(res.members)) {
      setMembersByMoai((prev) => ({
        ...prev,
        [moaiId]: res.members as FocusMoaiMemberRow[],
      }));
      setMemberLoadErrors((prev) => {
        const next = { ...prev };
        delete next[moaiId];
        return next;
      });
    } else {
      setMemberLoadErrors((prev) => ({
        ...prev,
        [moaiId]:
          (res as { error?: string }).error || "Failed to load members",
      }));
    }
  };

  const totalRevenue = moais.reduce((sum, m) => sum + (m.revenue || 0), 0);
  const totalMembers = moais.reduce((sum, m) => sum + (m.member_count || 0), 0);
  const activeMoais = moais.filter((m) => m.status === "active").length;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Focus Moais</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {moais.length} total · {activeMoais} active
          </p>
        </div>
        <button
          onClick={() => setModal("create")}
          className="flex items-center gap-2 px-4 py-2 bg-[#1e3a8a] text-white rounded-lg text-sm font-medium hover:bg-[#1e40af] transition-colors shadow-sm"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
          New Focus Moai
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: "Total Members", value: totalMembers },
          { label: "Active Moais", value: activeMoais },
          {
            label: "Monthly Revenue",
            value: `$${totalRevenue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="bg-white border border-slate-200 rounded-xl px-5 py-4 shadow-sm"
          >
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">
              {stat.label}
            </p>
            <p className="text-2xl font-bold text-slate-800 mt-1">
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        <input
          type="text"
          placeholder="Search by name, description, or focus..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]/20 focus:border-[#1e3a8a] bg-white"
        />
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1e3a8a]" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg
                className="w-6 h-6 text-slate-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            </div>
            <p className="text-slate-500 text-sm">
              {search
                ? "No Focus Moais match your search"
                : "No Focus Moais yet"}
            </p>
            {!search && (
              <button
                onClick={() => setModal("create")}
                className="mt-3 text-sm text-[#1e3a8a] hover:underline font-medium"
              >
                Create your first Focus Moai →
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  {[
                    "Name",
                    "Workout Focus",
                    "Coach",
                    "Members",
                    "Price / mo",
                    "Revenue",
                    "Status",
                    "Created",
                    "",
                  ].map((h) => (
                    <th
                      key={h}
                      className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((moai) => {
                  const isOpen = expandedMoaiId === moai.id;
                  const members = membersByMoai[moai.id];
                  const loadingM = loadingMembers[moai.id];
                  return (
                    <Fragment key={moai.id}>
                  <tr
                    className="hover:bg-slate-50 transition-colors"
                  >
                    {/* Name — expand members in-page */}
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => toggleMoaiMembers(moai.id)}
                        className="w-full text-left rounded-lg -m-1 p-1 hover:bg-slate-100/80 transition-colors focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]/25"
                        aria-expanded={isOpen}
                      >
                        <span className="flex items-start gap-2">
                          <ChevronDown
                            className={cn(
                              "h-4 w-4 text-slate-400 shrink-0 mt-0.5 transition-transform",
                              isOpen && "rotate-180",
                            )}
                            aria-hidden
                          />
                          <span className="min-w-0">
                            <span className="font-medium text-slate-800 block">
                              {moai.name}
                            </span>
                            {moai.description && (
                              <span className="text-xs text-slate-400 truncate block max-w-[14rem]">
                                {moai.description}
                              </span>
                            )}
                            <span className="text-[11px] text-[#1e3a8a] font-medium mt-0.5 inline-block">
                              {isOpen ? "Hide members" : "Show members"}
                            </span>
                          </span>
                        </span>
                      </button>
                    </td>

                    {/* Workout Focus */}
                    <td className="px-4 py-3">
                      {moai.workout_focus?.name ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-50 text-purple-700 border border-purple-100">
                          {moai.workout_focus.name}
                        </span>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>

                    {/* Coach */}
                    <td className="px-4 py-3 text-slate-600 text-sm whitespace-nowrap">
                      {moai.coaches ? (
                        moai.coaches.name ||
                        `${moai.coaches.first_name} ${moai.coaches.last_name}`.trim()
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>

                    {/* Members */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-slate-800 font-medium">
                          {moai.member_count ?? 0}
                        </span>
                        <span className="text-slate-400">/</span>
                        <span className="text-slate-500">
                          {moai.max_members}
                        </span>
                      </div>
                      <div className="mt-1 h-1.5 w-20 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#1e3a8a] rounded-full transition-all"
                          style={{
                            width: `${Math.min(((moai.member_count ?? 0) / moai.max_members) * 100, 100)}%`,
                          }}
                        />
                      </div>
                    </td>

                    {/* Price */}
                    <td className="px-4 py-3 text-slate-700 font-medium whitespace-nowrap">
                      ${moai.price_monthly.toFixed(2)}
                    </td>

                    {/* Revenue */}
                    <td className="px-4 py-3 text-slate-700 font-medium whitespace-nowrap">
                      ${(moai.revenue ?? 0).toFixed(2)}
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => toggleStatus(moai)}
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border transition-colors ${
                          moai.status === "active"
                            ? "bg-green-50 text-green-700 border-green-100 hover:bg-green-100"
                            : "bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        {moai.status === "active" ? "Active" : "Inactive"}
                      </button>
                    </td>

                    {/* Created */}
                    <td className="px-4 py-3 text-slate-400 text-xs whitespace-nowrap">
                      {new Date(moai.created_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 justify-end">
                        <button
                          type="button"
                          onClick={() => handleEdit(moai)}
                          className="p-1.5 text-slate-400 hover:text-[#1e3a8a] hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                            />
                          </svg>
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(moai)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                  {isOpen && (
                    <tr className="bg-slate-50/90 border-b border-slate-100">
                      <td colSpan={9} className="px-4 py-3">
                        {loadingM ? (
                          <p className="text-sm text-slate-500 py-2">
                            Loading members…
                          </p>
                        ) : memberLoadErrors[moai.id] ? (
                          <p className="text-sm text-red-600 py-2">
                            {memberLoadErrors[moai.id]}
                          </p>
                        ) : !members || members.length === 0 ? (
                          <p className="text-sm text-slate-500 py-2">
                            No active members in this Focus Moai.
                          </p>
                        ) : (
                          <ul className="divide-y divide-slate-200/80 rounded-lg border border-slate-200 bg-white overflow-hidden max-h-64 overflow-y-auto">
                            {members.map((m) => {
                              const u = m.users;
                              const label =
                                u?.first_name || u?.last_name
                                  ? `${u?.first_name || ""} ${u?.last_name || ""}`.trim()
                                  : u?.username || u?.email || m.user_id;
                              return (
                                <li key={m.id}>
                                  <Link
                                    href={`/admin/users/${encodeURIComponent(m.user_id)}`}
                                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 px-3 py-2.5 text-sm hover:bg-blue-50/60 transition-colors"
                                  >
                                    <span className="font-medium text-slate-800">
                                      {label}
                                    </span>
                                    <span className="text-xs text-slate-500 font-mono">
                                      {u?.email || m.user_id}
                                    </span>
                                  </Link>
                                </li>
                              );
                            })}
                          </ul>
                        )}
                      </td>
                    </tr>
                  )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modals */}
      {modal && supabase && (
        <FocusMoaiModal
          mode={modal}
          initial={modal === "edit" ? (editTarget ?? undefined) : undefined}
          onClose={closeModal}
          onSave={handleSaved}
          supabase={supabase}
        />
      )}

      {deleteTarget && (
        <ConfirmationModal
          title="Delete Focus Moai"
          message={
            <>
              Are you sure you want to delete{" "}
              <span className="font-medium text-slate-700">
                "{deleteTarget.name}"
              </span>
              ? This will not cancel active Stripe subscriptions automatically.
            </>
          }
          confirmLabel="Delete"
          variant="danger"
          loading={deleting}
          onConfirm={handleDelete}
          onClose={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
};

export default FocusMoaiPage;
