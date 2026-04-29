"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AdminService } from "@/lib/services/adminService";
import type { AdminCoachWithStatus } from "@/lib/types/admin";
import {
  Users,
  CheckCircle,
  XCircle,
  Edit2,
  UserPlus,
  Mail,
  Clock,
  Trash2,
} from "lucide-react";
import CreateCoachModal from "./CreateCoachModal";

export default function AdminCoachesPage() {
  const [coaches, setCoaches] = useState<AdminCoachWithStatus[]>([]);
  const [resendingFor, setResendingFor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingCoach, setEditingCoach] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [deletingCoach, setDeletingCoach] = useState<AdminCoachWithStatus | null>(null);
  const [deleteActiveCounts, setDeleteActiveCounts] = useState<{ activeClients: number; activeMoais: number } | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleteInProgress, setDeleteInProgress] = useState(false);
  const [editForm, setEditForm] = useState({
    is_available: false,
    max_clients: 50,
    max_moais: 10,
  });

  useEffect(() => {
    loadCoaches();
  }, []);

  const loadCoaches = async () => {
    try {
      const coachesData = await AdminService.getCoachesWithStatus();
      setCoaches(coachesData);
    } catch (error) {
      console.error("Error loading coaches:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleResendInvite = async (coach: AdminCoachWithStatus) => {
    if (resendingFor) return;
    setResendingFor(coach.email);
    try {
      const result = await AdminService.resendCoachInvite(coach.email);
      if (result.success) {
        alert("Invite email sent successfully!");
      } else {
        alert(result.error || "Failed to send invite");
      }
    } catch {
      alert("Failed to send invite");
    } finally {
      setResendingFor(null);
    }
  };

  const handleToggleAvailability = async (
    coachId: string,
    currentStatus: boolean,
  ) => {
    try {
      const success = await AdminService.updateCoachAvailability(
        coachId,
        !currentStatus,
      );
      if (success) {
        await loadCoaches();
      } else {
        alert("Failed to update coach availability");
      }
    } catch (error) {
      console.error("Error updating availability:", error);
      alert("Error updating coach availability");
    }
  };

  const handleSaveCapacity = async (coachId: string) => {
    try {
      const success = await AdminService.updateCoachCapacity(
        coachId,
        editForm.max_clients,
        editForm.max_moais,
      );
      if (success) {
        setEditingCoach(null);
        await loadCoaches();
      } else {
        alert("Failed to update coach capacity");
      }
    } catch (error) {
      console.error("Error updating capacity:", error);
      alert("Error updating coach capacity");
    }
  };

  const startEditing = (coach: AdminCoachWithStatus) => {
    setEditingCoach(coach.id);
    setEditForm({
      is_available: coach.is_available,
      max_clients: coach.max_clients,
      max_moais: coach.max_moais,
    });
  };

  const startDelete = async (coach: AdminCoachWithStatus) => {
    setDeletingCoach(coach);
    setDeleteConfirmText("");
    setDeleteActiveCounts(null);
    const counts = await AdminService.getCoachActiveCounts(coach.id);
    setDeleteActiveCounts(counts);
  };

  const handleDeleteCoach = async () => {
    if (!deletingCoach || deleteConfirmText !== deletingCoach.name) return;
    setDeleteInProgress(true);
    try {
      const result = await AdminService.deleteCoach(deletingCoach.id);
      if (result.success) {
        setDeletingCoach(null);
        setDeleteConfirmText("");
        setDeleteActiveCounts(null);
        if (result.warnings?.length) {
          alert("Coach deleted with warnings:\n" + result.warnings.join("\n"));
        }
        await loadCoaches();
      } else {
        alert(result.error || "Failed to delete coach");
      }
    } catch {
      alert("Failed to delete coach");
    } finally {
      setDeleteInProgress(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading coaches...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Coach Management</h1>
          <p className="mt-2 text-sm text-gray-600">
            Manage coaches, their availability, and capacity
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          <UserPlus className="h-5 w-5" />
          <span>Create Coach</span>
        </button>
      </div>

      <CreateCoachModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={() => {
          loadCoaches();
        }}
      />

      {/* Summary Stats */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-4 mb-8">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-blue-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">
                  Total Coaches
                </p>
                <p className="text-2xl font-semibold text-gray-900">
                  {coaches.length}
                </p>
              </div>
            </div>
          </div>
        </div>
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <CheckCircle className="h-8 w-8 text-green-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Available</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {coaches.filter((c) => c.is_available).length}
                </p>
              </div>
            </div>
          </div>
        </div>
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <XCircle className="h-8 w-8 text-gray-400" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Unavailable</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {coaches.filter((c) => !c.is_available).length}
                </p>
              </div>
            </div>
          </div>
        </div>
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <Clock className="h-8 w-8 text-amber-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">
                  Pending Signup
                </p>
                <p className="text-2xl font-semibold text-gray-900">
                  {coaches.filter((c) => !c.signup_confirmed).length}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Coaches Table */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {coaches.map((coach) => (
            <li key={coach.id}>
              <div className="px-4 py-4 sm:px-6">
                <div className="flex items-center justify-between">
                  <Link
                    href={`/admin/coaches/${coach.id}`}
                    className="flex items-center min-w-0 flex-1 rounded-lg -m-2 p-2 hover:bg-gray-50 transition-colors group"
                  >
                    <div className="flex-shrink-0 h-10 w-10">
                      {coach.profile_image_url ? (
                        <img
                          className="h-10 w-10 rounded-full"
                          src={coach.profile_image_url}
                          alt={coach.name}
                        />
                      ) : (
                        <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                          <span className="text-gray-600 font-medium">
                            {coach.first_name?.[0] || coach.name[0]}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="ml-4 min-w-0">
                      <div className="flex items-center flex-wrap gap-2">
                        <p className="text-sm font-medium text-gray-900 group-hover:text-blue-700">
                          {coach.name}
                        </p>
                        {coach.is_available ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Available
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            Unavailable
                          </span>
                        )}
                        {coach.signup_confirmed ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            <CheckCircle className="h-3 w-3" />
                            Confirmed
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                            <Clock className="h-3 w-3" />
                            Pending
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 truncate">
                        {coach.email}
                      </p>
                      <p className="text-xs text-blue-600 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        View profile & photo →
                      </p>
                    </div>
                  </Link>
                  <div className="flex items-center space-x-4 shrink-0">
                    <div className="text-right">
                      <p className="text-sm text-gray-900">
                        {coach.current_clients} / {coach.max_clients} clients
                      </p>
                      <p className="text-sm text-gray-500">
                        {coach.current_moais} / {coach.max_moais} Moais
                      </p>
                    </div>
                    {editingCoach === coach.id ? (
                      <div className="flex items-center space-x-2">
                        <input
                          type="number"
                          value={editForm.max_clients}
                          onChange={(e) =>
                            setEditForm({
                              ...editForm,
                              max_clients: parseInt(e.target.value),
                            })
                          }
                          className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                          placeholder="Max clients"
                        />
                        <input
                          type="number"
                          value={editForm.max_moais}
                          onChange={(e) =>
                            setEditForm({
                              ...editForm,
                              max_moais: parseInt(e.target.value),
                            })
                          }
                          className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                          placeholder="Max Moais"
                        />
                        <button
                          onClick={() => handleSaveCapacity(coach.id)}
                          className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingCoach(null)}
                          className="px-3 py-1 bg-gray-300 text-gray-700 rounded text-sm hover:bg-gray-400"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2">
                        {!coach.signup_confirmed && (
                          <button
                            onClick={() => handleResendInvite(coach)}
                            disabled={!!resendingFor}
                            className="inline-flex items-center gap-1 px-3 py-1 rounded text-sm bg-blue-100 text-blue-700 hover:bg-blue-200 disabled:opacity-50"
                            title="Generate new invite link and copy to clipboard"
                          >
                            <Mail className="h-4 w-4" />
                            {resendingFor === coach.email
                              ? "Copying..."
                              : "Resend Invite"}
                          </button>
                        )}
                        <button
                          onClick={() =>
                            handleToggleAvailability(
                              coach.id,
                              coach.is_available,
                            )
                          }
                          className={`px-3 py-1 rounded text-sm ${
                            coach.is_available
                              ? "bg-gray-200 text-gray-700 hover:bg-gray-300"
                              : "bg-green-100 text-green-700 hover:bg-green-200"
                          }`}
                        >
                          {coach.is_available
                            ? "Set Unavailable"
                            : "Set Available"}
                        </button>
                        <button
                          onClick={() => startEditing(coach)}
                          className="p-1 text-gray-400 hover:text-gray-600"
                          title="Edit capacity"
                        >
                          <Edit2 className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => startDelete(coach)}
                          className="p-1 text-red-400 hover:text-red-600"
                          title="Delete coach"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
        {coaches.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">No coaches found</p>
          </div>
        )}
      </div>

      {/* Delete confirmation modal */}
      {deletingCoach && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-1">
              Delete Coach
            </h2>
            <p className="text-sm text-gray-500 mb-4">
              This permanently deletes{" "}
              <span className="font-medium text-gray-900">
                {deletingCoach.name}
              </span>{" "}
              and wipes all their records from the database and authentication.
              This action cannot be undone.
            </p>

            {deleteActiveCounts === null ? (
              <p className="text-sm text-gray-500 mb-4">
                Checking active subscriptions…
              </p>
            ) : (deleteActiveCounts.activeClients > 0 ||
                deleteActiveCounts.activeMoais > 0) ? (
              <div className="rounded-md bg-amber-50 border border-amber-200 p-3 mb-4 text-sm text-amber-800">
                <p className="font-medium mb-1">
                  Warning: Active subscriptions will be cancelled
                </p>
                {deleteActiveCounts.activeClients > 0 && (
                  <p>
                    • {deleteActiveCounts.activeClients} active client
                    subscription
                    {deleteActiveCounts.activeClients !== 1 ? "s" : ""}
                  </p>
                )}
                {deleteActiveCounts.activeMoais > 0 && (
                  <p>
                    • {deleteActiveCounts.activeMoais} active Moai subscription
                    {deleteActiveCounts.activeMoais !== 1 ? "s" : ""}
                  </p>
                )}
                <p className="mt-1 text-amber-700">
                  All Stripe subscriptions will be cancelled immediately.
                  Affected users will lose access to this coach.
                </p>
              </div>
            ) : (
              <div className="rounded-md bg-gray-50 border border-gray-200 p-3 mb-4 text-sm text-gray-600">
                No active subscriptions found.
              </div>
            )}

            <label className="block text-sm font-medium text-gray-700 mb-1">
              Type{" "}
              <span className="font-mono text-red-600">
                {deletingCoach.name}
              </span>{" "}
              to confirm
            </label>
            <input
              type="text"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-red-500"
              placeholder={deletingCoach.name}
              disabled={deleteInProgress}
            />

            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setDeletingCoach(null);
                  setDeleteConfirmText("");
                  setDeleteActiveCounts(null);
                }}
                disabled={deleteInProgress}
                className="px-4 py-2 text-sm rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteCoach}
                disabled={
                  deleteConfirmText !== deletingCoach.name ||
                  deleteInProgress ||
                  deleteActiveCounts === null
                }
                className="px-4 py-2 text-sm rounded-md bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deleteInProgress ? "Deleting…" : "Delete Coach"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
