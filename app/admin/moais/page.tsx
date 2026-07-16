"use client";

import { useEffect, useState, useCallback } from "react";
import { AdminService } from "@/lib/services/adminService";
import type { AdminMoai } from "@/lib/types/admin";
import {
  Target,
  Users,
  CheckCircle,
  Clock,
  XCircle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";

const PAGE_SIZE_OPTIONS = [10, 25, 50];

export default function AdminMoaisPage() {
  const [moais, setMoais] = useState<AdminMoai[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<
    "all" | "forming" | "active" | "inactive"
  >("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    forming: 0,
    withCoach: 0,
  });

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const startIdx = (page - 1) * pageSize;

  const loadMoais = useCallback(async () => {
    setLoading(true);
    try {
      const result = await AdminService.getAllMoais(
        page,
        pageSize,
        filterStatus,
      );
      setMoais(result.data);
      setTotalCount(result.total);
    } catch (error) {
      console.error("Error loading Moais:", error);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, filterStatus]);

  useEffect(() => {
    AdminService.getMoaiStats().then(setStats).catch(console.error);
  }, []);

  useEffect(() => {
    loadMoais();
  }, [loadMoais]);

  const handleFilterChange = (value: typeof filterStatus) => {
    setFilterStatus(value);
    setPage(1);
  };

  const handlePageSizeChange = (value: number) => {
    setPageSize(value);
    setPage(1);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <CheckCircle className="h-3 w-3 mr-1" />
            Active
          </span>
        );
      case "forming":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            <Clock className="h-3 w-3 mr-1" />
            Forming
          </span>
        );
      case "inactive":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            <XCircle className="h-3 w-3 mr-1" />
            Inactive
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Moai Management</h1>
        <p className="mt-2 text-sm text-gray-600">
          View and manage all Moai groups
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-4 mb-8">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <Target className="h-8 w-8 text-orange-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Moais</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {stats.total}
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
                <p className="text-sm font-medium text-gray-500">Active</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {stats.active}
                </p>
              </div>
            </div>
          </div>
        </div>
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <Clock className="h-8 w-8 text-yellow-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Forming</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {stats.forming}
                </p>
              </div>
            </div>
          </div>
        </div>
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-blue-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">With Coach</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {stats.withCoach}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filter */}
      <div className="bg-white shadow rounded-lg p-4 mb-6">
        <div className="flex items-center space-x-4">
          <label className="text-sm font-medium text-gray-700">
            Filter by Status:
          </label>
          <select
            value={filterStatus}
            onChange={(e) => handleFilterChange(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 cursor-pointer"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="forming">Forming</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      {/* Moais Table */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <div className="px-4 py-3 border-b border-gray-200 sm:px-6 flex items-center justify-between">
          <p className="text-sm text-gray-700">
            Showing{" "}
            <span className="font-medium">
              {totalCount === 0 ? 0 : startIdx + 1}–
              {Math.min(startIdx + pageSize, totalCount)}
            </span>{" "}
            of <span className="font-medium">{totalCount}</span> Moais
          </p>
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-500">Per page:</label>
            <select
              value={pageSize}
              onChange={(e) => handlePageSizeChange(Number(e.target.value))}
              className="px-2 py-1 border border-gray-300 rounded text-sm cursor-pointer"
            >
              {PAGE_SIZE_OPTIONS.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-3 text-sm text-gray-500">Loading…</p>
            </div>
          </div>
        ) : (
          <>
            <ul className="divide-y divide-gray-200">
              {moais.map((moai) => (
                <li key={moai.id}>
                  <div className="px-4 py-4 sm:px-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center min-w-0 flex-1">
                        <div className="shrink-0">
                          <div className="h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center">
                            <Target className="h-6 w-6 text-orange-600" />
                          </div>
                        </div>
                        <div className="ml-4 min-w-0 flex-1">
                          <div className="flex items-center">
                            <Link
                              href={`/admin/moais/${moai.id}`}
                              className="text-sm font-medium text-gray-900 truncate hover:text-blue-600 cursor-pointer"
                            >
                              {moai.name}
                            </Link>
                            {getStatusBadge(moai.status)}
                            {moai.has_coach && (
                              <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                Has Coach
                              </span>
                            )}
                          </div>
                          <div className="mt-1 flex items-center text-sm text-gray-500">
                            <Users className="h-4 w-4 mr-1" />
                            <span>
                              {moai.member_count} / {moai.min_members} members
                            </span>
                            {moai.activated_at && (
                              <span className="ml-4">
                                Activated{" "}
                                {new Date(
                                  moai.activated_at,
                                ).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="ml-4 shrink-0 text-right">
                        <div className="text-sm text-gray-500">
                          Created{" "}
                          {new Date(moai.created_at).toLocaleDateString()}
                        </div>
                        {moai.coach_id && (
                          <div className="text-xs text-gray-400 mt-1">
                            Coach assigned
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            {moais.length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-500">
                  No Moais found matching your filter
                </p>
              </div>
            )}
          </>
        )}

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 sm:px-6">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1 || loading}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-sm rounded-md bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </button>

            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((p) => {
                  if (p === 1 || p === totalPages) return true;
                  if (Math.abs(p - page) <= 1) return true;
                  return false;
                })
                .reduce<(number | "ellipsis")[]>((acc, p, idx, arr) => {
                  if (idx > 0 && p - (arr[idx - 1] as number) > 1) {
                    acc.push("ellipsis");
                  }
                  acc.push(p);
                  return acc;
                }, [])
                .map((item, idx) =>
                  item === "ellipsis" ? (
                    <span
                      key={`ellipsis-${idx}`}
                      className="px-2 text-gray-400"
                    >
                      …
                    </span>
                  ) : (
                    <button
                      key={item}
                      onClick={() => setPage(item)}
                      disabled={loading}
                      className={`px-3 py-1.5 text-sm rounded-md cursor-pointer ${
                        page === item
                          ? "bg-blue-600 text-white"
                          : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      {item}
                    </button>
                  ),
                )}
            </div>

            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages || loading}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-sm rounded-md bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
