"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Calendar,
  Activity,
  Target,
  TrendingUp,
  Footprints,
  Timer,
} from "lucide-react";
import { CoachService } from "@/lib/services/coachService";

interface Detail {
  user: any;
  focusMoai: { id: string; name: string; joined_at: string | null } | null;
  program: { id: string; name: string } | null;
  focus: { id: string; name: string } | null;
  commitmentHistory: any[];
  workoutHistory: any[];
}

export default function CoachUserDetailPage() {
  const params = useParams();
  const router = useRouter();
  const userId = params.userId as string;
  const [detail, setDetail] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    (async () => {
      try {
        setDetail(await CoachService.getClientDetail(userId));
      } catch (error) {
        console.error("Error loading user detail:", error);
      } finally {
        setLoading(false);
      }
    })();
  }, [userId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading member details...</p>
        </div>
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">
          Member not found or you don't have access
        </p>
        <button
          onClick={() => router.back()}
          className="cursor-pointer mt-4 text-blue-600 hover:text-blue-800"
        >
          Go back
        </button>
      </div>
    );
  }

  const { user, focusMoai, program, focus, commitmentHistory, workoutHistory } =
    detail;

  const current = commitmentHistory[0];
  const totalCompleted = commitmentHistory.reduce(
    (s, c) => s + (c.completed_sessions || 0),
    0,
  );
  const totalCommitted = commitmentHistory.reduce(
    (s, c) => s + (c.commitment_count || 0),
    0,
  );
  const overallRate =
    totalCommitted > 0 ? (totalCompleted / totalCommitted) * 100 : 0;

  const displayName =
    user.first_name && user.last_name
      ? `${user.first_name} ${user.last_name}`
      : user.display_name || user.username || user.email;

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => router.back()}
          className="cursor-pointer flex items-center text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="h-5 w-5 mr-2" />
          Back
        </button>
        <div className="flex items-center">
          {user.profile_picture_url ? (
            <img
              src={user.profile_picture_url}
              alt={displayName}
              className="h-16 w-16 rounded-full object-cover"
            />
          ) : (
            <div className="h-16 w-16 rounded-full bg-gray-300 flex items-center justify-center">
              <span className="text-gray-600 font-medium text-2xl">
                {(
                  user.first_name?.[0] ||
                  user.username?.[0] ||
                  user.email[0]
                ).toUpperCase()}
              </span>
            </div>
          )}
          <div className="ml-6">
            <h1 className="text-3xl font-bold text-gray-900">{displayName}</h1>
            <p className="mt-1 text-sm text-gray-600">{user.email}</p>
            {user.username && (
              <p className="text-sm text-gray-500">@{user.username}</p>
            )}
          </div>
        </div>
      </div>

      {/* Member info */}
      <div className="bg-white shadow rounded-lg mb-8">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">
            Member Information
          </h2>
        </div>
        <div className="px-4 py-5 sm:px-6">
          <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
            <div>
              <dt className="text-sm font-medium text-gray-500">Focus Moai</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {focusMoai?.name || <span className="text-gray-400">None</span>}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">
                Joined Focus Moai
              </dt>
              <dd className="mt-1 text-sm text-gray-900">
                {focusMoai?.joined_at
                  ? new Date(focusMoai.joined_at).toLocaleDateString()
                  : "-"}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">
                Current Focus
              </dt>
              <dd className="mt-1 text-sm text-gray-900">
                {focus?.name || <span className="text-gray-400">Not set</span>}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">
                Current Program
              </dt>
              <dd className="mt-1 text-sm text-gray-900">
                {program?.name || (
                  <span className="text-gray-400">No program</span>
                )}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Location</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {user.city && user.country
                  ? `${user.city}, ${user.country}`
                  : user.city || user.country || "Not provided"}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">
                Member Since
              </dt>
              <dd className="mt-1 text-sm text-gray-900">
                {new Date(user.created_at).toLocaleDateString()}
              </dd>
            </div>
          </dl>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-4 mb-8">
        <StatCard
          icon={<Target className="h-8 w-8 text-blue-500" />}
          label="Current Week"
          value={
            current
              ? `${current.completed_sessions} / ${current.commitment_count}`
              : "0 / 0"
          }
        />
        <StatCard
          icon={<TrendingUp className="h-8 w-8 text-green-500" />}
          label="Overall Rate"
          value={`${overallRate.toFixed(1)}%`}
        />
        <StatCard
          icon={<Calendar className="h-8 w-8 text-purple-500" />}
          label="Weeks Active"
          value={String(commitmentHistory.length)}
        />
        <StatCard
          icon={<Activity className="h-8 w-8 text-orange-500" />}
          label="Workouts"
          value={String(user.total_workouts)}
        />
      </div>

      {/* Weekly commitment & movement goals */}
      <div className="bg-white shadow rounded-lg mb-8">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">
            Weekly Commitment & Movement Goals
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Targets for the current week
          </p>
        </div>
        <div className="px-4 py-5 sm:px-6 grid grid-cols-1 gap-6 sm:grid-cols-3">
          {/* Weekly commitment */}
          <div className="flex items-center">
            <Target className="h-6 w-6 text-blue-500 mr-3" />
            <div>
              <p className="text-sm text-gray-500">Weekly commitment</p>
              <p className="text-lg font-semibold text-gray-900">
                {current?.commitment_count != null
                  ? `${current.commitment_count} workouts`
                  : "Not set"}
              </p>
              {current?.commitment_count != null && (
                <p className="text-xs text-gray-500">
                  {current.completed_sessions || 0} completed
                </p>
              )}
            </div>
          </div>

          {/* Movement goal: steps */}
          <div className="flex items-center">
            <Footprints className="h-6 w-6 text-green-500 mr-3" />
            <div>
              <p className="text-sm text-gray-500">Steps goal</p>
              <p className="text-lg font-semibold text-gray-900">
                {current?.steps_goal
                  ? current.steps_goal.toLocaleString()
                  : "Not set"}
              </p>
            </div>
          </div>

          {/* Movement goal: exercise minutes */}
          <div className="flex items-center">
            <Timer className="h-6 w-6 text-orange-500 mr-3" />
            <div>
              <p className="text-sm text-gray-500">Exercise minutes goal</p>
              <p className="text-lg font-semibold text-gray-900">
                {current?.exercise_minutes_goal ?? "Not set"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Commitment history */}
      <div className="bg-white shadow rounded-lg mb-8">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">
            Commitment History
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Weekly commitments and goals
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {[
                  "Week Start",
                  "Commitment",
                  "Completed",
                  "Completion Rate",
                  "Steps Goal",
                  "Exercise Min Goal",
                ].map((h) => (
                  <th
                    key={h}
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {commitmentHistory.map((c) => (
                <tr key={c.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(c.week_start).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {c.commitment_count}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {c.completed_sessions}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        c.completion_rate >= 100
                          ? "bg-green-100 text-green-800"
                          : c.completion_rate >= 75
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-red-100 text-red-800"
                      }`}
                    >
                      {c.completion_rate.toFixed(1)}%
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {c.steps_goal ? c.steps_goal.toLocaleString() : "-"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {c.exercise_minutes_goal ?? "-"}
                  </td>
                </tr>
              ))}
              {commitmentHistory.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-8 text-center text-gray-500"
                  >
                    No commitment history
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Workout history */}
      <div className="bg-white shadow rounded-lg mb-8">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Workout History</h2>
          <p className="mt-1 text-sm text-gray-500">Recent workout sessions</p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {["Date", "Workout", "Status", "Duration"].map((h) => (
                  <th
                    key={h}
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {workoutHistory.slice(0, 20).map((w) => (
                <tr key={w.session_id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(w.date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {w.workout_title || "Unknown Workout"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        w.status === "completed"
                          ? "bg-green-100 text-green-800"
                          : w.status === "in_progress"
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {w.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {w.total_duration_seconds
                      ? `${Math.floor(w.total_duration_seconds / 60)} min`
                      : "N/A"}
                  </td>
                </tr>
              ))}
              {workoutHistory.length === 0 && (
                <tr>
                  <td
                    colSpan={4}
                    className="px-6 py-8 text-center text-gray-500"
                  >
                    No workout history
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="bg-white overflow-hidden shadow rounded-lg">
      <div className="p-5 flex items-center">
        {icon}
        <div className="ml-4">
          <p className="text-sm font-medium text-gray-500">{label}</p>
          <p className="text-2xl font-semibold text-gray-900">{value}</p>
        </div>
      </div>
    </div>
  );
}
