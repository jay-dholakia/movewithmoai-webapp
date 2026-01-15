"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { CoachService } from "@/lib/services/coachService";
import { ChatService } from "@/lib/services/chatService";
import type {
  ClientMetrics,
  CommitmentHistory,
  WorkoutHistory,
  UserProfile,
  WorkoutPlan,
  PersonalBest,
} from "@/lib/types/coach";
import type { ChatMessage, ChatSession } from "@/lib/services/chatService";
import Link from "next/link";
import {
  ArrowLeft,
  MessageSquare,
  Calendar,
  TrendingUp,
  Activity,
  FolderOpen,
  Trophy,
  ChevronDown,
  ChevronRight,
  Image as ImageIcon,
  X,
  Loader2,
} from "lucide-react";

type TabType =
  | "overview"
  | "commitments"
  | "workouts"
  | "plans"
  | "performance"
  | "chat";

export default function ClientDetailPage() {
  const params = useParams();
  const userId = params.userId as string;

  const [clientMetrics, setClientMetrics] = useState<ClientMetrics | null>(
    null
  );
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [commitmentHistory, setCommitmentHistory] = useState<
    CommitmentHistory[]
  >([]);
  const [workoutHistory, setWorkoutHistory] = useState<WorkoutHistory[]>([]);
  const [plansHistory, setPlansHistory] = useState<WorkoutPlan[]>([]);
  const [personalBests, setPersonalBests] = useState<PersonalBest[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [coachId, setCoachId] = useState<string | null>(null);
  const [expandedPlans, setExpandedPlans] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadClientData();
  }, [userId]);

  // Refresh metrics when chat tab is opened
  useEffect(() => {
    if (activeTab === "chat" && coachId && clientMetrics) {
      // Refresh metrics to update unread count
      CoachService.getClientMetrics(userId, coachId).then((metrics) => {
        if (metrics) {
          setClientMetrics(metrics);
        }
      });
    }
  }, [activeTab, coachId, userId]);

  const loadClientData = async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        window.location.href = "/coach/login";
        return;
      }

      // Get coach profile
      const profile = await CoachService.getCoachProfileByUserId(
        session.user.id
      );
      if (!profile) {
        window.location.href = "/coach";
        return;
      }

      setCoachId(profile.id);

      // Load all client data
      const [metrics, userProf, commitments, workouts, plans, bests] =
        await Promise.all([
          CoachService.getClientMetrics(userId, profile.id),
          CoachService.getUserProfile(userId),
          CoachService.getClientCommitmentHistory(userId, profile.id),
          CoachService.getClientWorkoutHistory(userId, profile.id),
          CoachService.getUserPlansHistory(userId),
          CoachService.getUserPersonalBests(userId),
        ]);

      setClientMetrics(metrics);
      setUserProfile(userProf);
      setCommitmentHistory(commitments);
      setWorkoutHistory(workouts);
      setPlansHistory(plans);
      setPersonalBests(bests);
    } catch (error) {
      console.error("Error loading client data:", error);
    } finally {
      setLoading(false);
    }
  };

  const togglePlan = (planId: string) => {
    const newExpanded = new Set(expandedPlans);
    if (newExpanded.has(planId)) {
      newExpanded.delete(planId);
    } else {
      newExpanded.add(planId);
    }
    setExpandedPlans(newExpanded);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading client data...</p>
        </div>
      </div>
    );
  }

  if (!clientMetrics || !userProfile) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-gray-600">Client not found</p>
          <Link
            href="/coach"
            className="text-blue-600 hover:underline mt-4 inline-block"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const clientName =
    userProfile.first_name && userProfile.last_name
      ? `${userProfile.first_name} ${userProfile.last_name[0]}.`
      : userProfile.first_name || userProfile.username || "Client";

  const calculateAge = (birthdate: string | null) => {
    if (!birthdate) return null;
    const today = new Date();
    const birth = new Date(birthdate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < birth.getDate())
    ) {
      age--;
    }
    return age;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/coach" className="text-gray-600 hover:text-gray-900">
                <ArrowLeft className="h-5 w-5" />
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {clientName}
                </h1>
                {userProfile.username && (
                  <p className="text-sm text-gray-600 mt-1">
                    @{userProfile.username}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-4">
              {clientMetrics.unread_messages_count > 0 && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-orange-100 text-orange-800">
                  {clientMetrics.unread_messages_count} unread messages
                </span>
              )}
              {clientMetrics.pending_video_reviews > 0 && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                  {clientMetrics.pending_video_reviews} videos pending review
                </span>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex gap-6">
          {/* Sidebar - Profile */}
          <div className="w-80 flex-shrink-0">
            <div className="bg-white rounded-lg shadow p-6 sticky top-6">
              {/* Profile Picture */}
              <div className="flex justify-center mb-4">
                <div className="h-32 w-32 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                  {userProfile.profile_picture_url ? (
                    <img
                      src={userProfile.profile_picture_url}
                      alt={clientName}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="text-4xl text-gray-600 font-medium">
                      {(
                        userProfile.first_name?.[0] ||
                        userProfile.username?.[0] ||
                        "C"
                      ).toUpperCase()}
                    </span>
                  )}
                </div>
              </div>

              {/* Name and Basic Info */}
              <div className="text-center mb-6">
                <h2 className="text-xl font-bold text-gray-900">
                  {clientName}
                </h2>
                {userProfile.username && (
                  <p className="text-sm text-gray-500 mt-1">
                    @{userProfile.username}
                  </p>
                )}
              </div>

              {/* Profile Details */}
              <div className="space-y-4 border-t border-gray-200 pt-4">
                {userProfile.birthdate && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase">
                      Age
                    </p>
                    <p className="text-sm text-gray-900 mt-1">
                      {calculateAge(userProfile.birthdate)} years
                    </p>
                  </div>
                )}
                {userProfile.gender && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase">
                      Gender
                    </p>
                    <p className="text-sm text-gray-900 mt-1">
                      {userProfile.gender}
                    </p>
                  </div>
                )}
                {(userProfile.height_inches || userProfile.weight_kg) && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase">
                      Body Metrics
                    </p>
                    <p className="text-sm text-gray-900 mt-1">
                      {userProfile.height_inches &&
                        `${userProfile.height_inches}"`}
                      {userProfile.height_inches &&
                        userProfile.weight_kg &&
                        " • "}
                      {userProfile.weight_kg && `${userProfile.weight_kg} kg`}
                    </p>
                  </div>
                )}
                {userProfile.experience_level && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase">
                      Experience
                    </p>
                    <p className="text-sm text-gray-900 mt-1">
                      {userProfile.experience_level}
                    </p>
                  </div>
                )}
                {userProfile.fitness_goal && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase">
                      Fitness Goal
                    </p>
                    <p className="text-sm text-gray-900 mt-1">
                      {userProfile.fitness_goal}
                    </p>
                  </div>
                )}
                {userProfile.equipment && userProfile.equipment.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase">
                      Equipment
                    </p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {userProfile.equipment.map((eq, idx) => (
                        <span
                          key={idx}
                          className="inline-flex px-2 py-1 text-xs rounded bg-gray-100 text-gray-700"
                        >
                          {eq}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {userProfile.injury_history &&
                  userProfile.injury_history.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase">
                        Injury History
                      </p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {userProfile.injury_history.map((injury, idx) => (
                          <span
                            key={idx}
                            className="inline-flex px-2 py-1 text-xs rounded bg-red-100 text-red-700"
                          >
                            {injury}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                {(userProfile.city || userProfile.country) && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase">
                      Location
                    </p>
                    <p className="text-sm text-gray-900 mt-1">
                      {[userProfile.city, userProfile.country]
                        .filter(Boolean)
                        .join(", ")}
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase">
                    Member Since
                  </p>
                  <p className="text-sm text-gray-900 mt-1">
                    {new Date(userProfile.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 min-w-0">
            {/* Tabs */}
            <div className="bg-white border-b border-gray-200 mb-6">
              <nav className="flex space-x-8 overflow-x-auto">
                {[
                  { id: "overview", label: "Overview", icon: Activity },
                  { id: "commitments", label: "Commitments", icon: Calendar },
                  { id: "workouts", label: "Workouts", icon: TrendingUp },
                  { id: "plans", label: "Plans", icon: FolderOpen },
                  { id: "performance", label: "Performance", icon: Trophy },
                  { id: "chat", label: "Chat", icon: MessageSquare },
                ].map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as TabType)}
                      className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                        activeTab === tab.id
                          ? "border-blue-500 text-blue-600"
                          : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      {tab.label}
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* Tab Content */}
            {activeTab === "overview" && (
              <div className="space-y-6">
                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-white rounded-lg shadow p-6">
                    <p className="text-sm font-medium text-gray-600">
                      Current Week
                    </p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">
                      {clientMetrics.current_week_completed}/
                      {clientMetrics.current_week_commitment}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      {clientMetrics.current_week_completion_rate}% complete
                    </p>
                  </div>
                  <div className="bg-white rounded-lg shadow p-6">
                    <p className="text-sm font-medium text-gray-600">
                      Overall Rate
                    </p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">
                      {clientMetrics.overall_completion_rate}%
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      {clientMetrics.total_completed_sessions}/
                      {clientMetrics.total_commitment_count} sessions
                    </p>
                  </div>
                  <div className="bg-white rounded-lg shadow p-6">
                    <p className="text-sm font-medium text-gray-600">
                      Total Workouts
                    </p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">
                      {clientMetrics.total_completed_workouts}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      {clientMetrics.total_workout_sessions} sessions total
                    </p>
                  </div>
                  <div className="bg-white rounded-lg shadow p-6">
                    <p className="text-sm font-medium text-gray-600">
                      Commitment Weeks
                    </p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">
                      {clientMetrics.total_commitment_weeks}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">Weeks tracked</p>
                  </div>
                </div>

                {/* Recent Activity */}
                <div className="bg-white rounded-lg shadow">
                  <div className="px-6 py-4 border-b border-gray-200">
                    <h2 className="text-lg font-semibold text-gray-900">
                      Recent Workouts
                    </h2>
                  </div>
                  <div className="divide-y divide-gray-200">
                    {workoutHistory.slice(0, 5).map((workout) => (
                      <div key={workout.session_id} className="px-6 py-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {workout.workout_title || "Workout"}
                            </p>
                            <p className="text-sm text-gray-500">
                              {new Date(workout.date).toLocaleDateString()} •{" "}
                              {workout.completed_sets}/{workout.total_sets} sets
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-gray-900">
                              {workout.status === "completed"
                                ? "✓ Completed"
                                : workout.status}
                            </p>
                            {workout.total_duration_seconds > 0 && (
                              <p className="text-xs text-gray-500">
                                {Math.floor(
                                  workout.total_duration_seconds / 60
                                )}{" "}
                                min
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                    {workoutHistory.length === 0 && (
                      <div className="px-6 py-8 text-center text-gray-500">
                        No workouts yet
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === "commitments" && (
              <div className="bg-white rounded-lg shadow">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900">
                    Commitment History
                  </h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Week
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Commitment
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Completed
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                          Rate
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {commitmentHistory.map((commitment) => (
                        <tr key={commitment.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {new Date(
                              commitment.week_start
                            ).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {commitment.commitment_count}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {commitment.completed_sessions}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                commitment.completion_rate >= 100
                                  ? "bg-green-100 text-green-800"
                                  : commitment.completion_rate >= 75
                                  ? "bg-yellow-100 text-yellow-800"
                                  : "bg-red-100 text-red-800"
                              }`}
                            >
                              {commitment.completion_rate}%
                            </span>
                          </td>
                        </tr>
                      ))}
                      {commitmentHistory.length === 0 && (
                        <tr>
                          <td
                            colSpan={4}
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
            )}

            {activeTab === "workouts" && (
              <div className="bg-white rounded-lg shadow">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900">
                    Workout History
                  </h2>
                </div>
                <div className="divide-y divide-gray-200">
                  {workoutHistory.map((workout) => (
                    <div key={workout.session_id} className="px-6 py-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">
                            {workout.workout_title || "Workout"}
                          </p>
                          <p className="text-sm text-gray-500 mt-1">
                            {new Date(workout.date).toLocaleDateString()} •{" "}
                            {workout.exercise_count} exercises •{" "}
                            {workout.completed_sets}/{workout.total_sets} sets
                          </p>
                          {workout.notes && (
                            <p className="text-sm text-gray-600 mt-2 italic">
                              "{workout.notes}"
                            </p>
                          )}
                        </div>
                        <div className="text-right ml-4">
                          <span
                            className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              workout.status === "completed"
                                ? "bg-green-100 text-green-800"
                                : workout.status === "in_progress"
                                ? "bg-blue-100 text-blue-800"
                                : "bg-gray-100 text-gray-800"
                            }`}
                          >
                            {workout.status}
                          </span>
                          {workout.total_duration_seconds > 0 && (
                            <p className="text-xs text-gray-500 mt-1">
                              {Math.floor(workout.total_duration_seconds / 60)}{" "}
                              min
                            </p>
                          )}
                          {workout.rpe && (
                            <p className="text-xs text-gray-500 mt-1">
                              RPE: {workout.rpe}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  {workoutHistory.length === 0 && (
                    <div className="px-6 py-8 text-center text-gray-500">
                      No workouts yet
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === "plans" && (
              <div className="bg-white rounded-lg shadow">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900">
                    Workout Plans History
                  </h2>
                </div>
                <div className="divide-y divide-gray-200">
                  {plansHistory.length === 0 ? (
                    <div className="px-6 py-8 text-center text-gray-500">
                      No workout plans assigned yet
                    </div>
                  ) : (
                    plansHistory.map((plan) => (
                      <div key={plan.plan_id} className="px-6 py-4">
                        <button
                          onClick={() => togglePlan(plan.plan_id)}
                          className="w-full flex items-center justify-between text-left"
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-3">
                              {expandedPlans.has(plan.plan_id) ? (
                                <ChevronDown className="h-5 w-5 text-gray-400" />
                              ) : (
                                <ChevronRight className="h-5 w-5 text-gray-400" />
                              )}
                              <div>
                                <h3 className="text-sm font-semibold text-gray-900">
                                  {plan.plan_name}
                                </h3>
                                <p className="text-xs text-gray-500 mt-1">
                                  Assigned{" "}
                                  {new Date(
                                    plan.assigned_at
                                  ).toLocaleDateString()}{" "}
                                  • {plan.completed_workouts}/
                                  {plan.total_workouts} workouts completed
                                </p>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <p className="text-sm font-medium text-gray-900">
                                {plan.completion_rate}%
                              </p>
                              <p className="text-xs text-gray-500">Complete</p>
                            </div>
                            <div className="w-16 bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-blue-600 h-2 rounded-full"
                                style={{ width: `${plan.completion_rate}%` }}
                              />
                            </div>
                          </div>
                        </button>
                        {expandedPlans.has(plan.plan_id) && (
                          <div className="mt-4 ml-8 space-y-2">
                            {plan.workouts.map((workout) => (
                              <div
                                key={workout.workout_id}
                                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                              >
                                <div>
                                  <p className="text-sm font-medium text-gray-900">
                                    {workout.workout_title}
                                  </p>
                                  <p className="text-xs text-gray-500 mt-1">
                                    {workout.workout_type} • Assigned{" "}
                                    {new Date(
                                      workout.assigned_at
                                    ).toLocaleDateString()}
                                  </p>
                                </div>
                                <div className="text-right">
                                  {workout.status === "completed" ? (
                                    <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                                      ✓ Completed
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">
                                      {workout.status === "assigned"
                                        ? "Assigned"
                                        : "Not Started"}
                                    </span>
                                  )}
                                  {workout.completed_at && (
                                    <p className="text-xs text-gray-500 mt-1">
                                      {new Date(
                                        workout.completed_at
                                      ).toLocaleDateString()}
                                    </p>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {activeTab === "performance" && (
              <div className="bg-white rounded-lg shadow">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900">
                    Personal Bests
                  </h2>
                </div>
                <div className="divide-y divide-gray-200">
                  {personalBests.length === 0 ? (
                    <div className="px-6 py-8 text-center text-gray-500">
                      No personal bests recorded yet
                    </div>
                  ) : (
                    personalBests.map((best) => (
                      <div key={best.exercise_id} className="px-6 py-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="text-sm font-semibold text-gray-900">
                              {best.exercise_name}
                            </h3>
                            <p className="text-xs text-gray-500 mt-1">
                              Achieved{" "}
                              {new Date(best.achieved_at).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex gap-6 text-right">
                            {best.max_weight_lbs && (
                              <div>
                                <p className="text-xs text-gray-500">
                                  Max Weight
                                </p>
                                <p className="text-sm font-semibold text-gray-900">
                                  {best.max_weight_lbs} lbs
                                </p>
                              </div>
                            )}
                            {best.max_reps && (
                              <div>
                                <p className="text-xs text-gray-500">
                                  Max Reps
                                </p>
                                <p className="text-sm font-semibold text-gray-900">
                                  {best.max_reps}
                                </p>
                              </div>
                            )}
                            {best.max_volume && (
                              <div>
                                <p className="text-xs text-gray-500">
                                  Max Volume
                                </p>
                                <p className="text-sm font-semibold text-gray-900">
                                  {best.max_volume} lbs
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {activeTab === "chat" && coachId && (
              <ChatInterface
                userId={userId}
                coachId={coachId}
                onMessagesRead={() => {
                  // Refresh client metrics after marking messages as read
                  if (coachId) {
                    CoachService.getClientMetrics(userId, coachId).then(
                      setClientMetrics
                    );
                  }
                }}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Chat Interface Component
function ChatInterface({
  userId,
  coachId,
  onMessagesRead,
}: {
  userId: string;
  coachId: string;
  onMessagesRead?: () => void;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [session, setSession] = useState<ChatSession | null>(null);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<{ file: File; preview: string; type: 'image' | 'video' } | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [showRecordModal, setShowRecordModal] = useState(false);
  const [showRecordOptions, setShowRecordOptions] = useState(false);
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const [recordedVideo, setRecordedVideo] = useState<Blob | null>(null);
  const [recordedVideoPreview, setRecordedVideoPreview] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingChunksRef = useRef<Blob[]>([]);
  const isCancelingRef = useRef(false);
  const videoPreviewRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Store callback in ref to avoid dependency issues
  const onMessagesReadRef = useRef(onMessagesRead);
  useEffect(() => {
    onMessagesReadRef.current = onMessagesRead;
  }, [onMessagesRead]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Cleanup media stream only on unmount (not when mediaStream changes)
  useEffect(() => {
    return () => {
      // Only cleanup on unmount
      if (mediaStream) {
        mediaStream.getTracks().forEach(track => track.stop());
      }
      if (videoPreviewRef.current) {
        videoPreviewRef.current.srcObject = null;
      }
    };
  }, []); // Empty dependency array - only cleanup on unmount

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let isSubscribed = true;

    const loadChat = async () => {
      try {
        setLoading(true);
        const chatSession = await ChatService.getChatSession(userId, coachId);

        if (!isSubscribed) return;

        if (!chatSession) {
          console.log("❌ No chat session found");
          setLoading(false);
          return;
        }

        console.log("✅ Chat session loaded:", chatSession.id);
        setSession(chatSession);

        const chatMessages = await ChatService.getMessages(chatSession.id);

        if (!isSubscribed) return;

        console.log("✅ Loaded", chatMessages.length, "messages");
        setMessages(chatMessages);

        // Mark messages as read
        await ChatService.markMessagesAsRead(chatSession.id, coachId);

        // Call the callback using ref (doesn't cause re-render loop)
        if (onMessagesReadRef.current) {
          onMessagesReadRef.current();
        }

        // Subscribe to real-time updates
        const channelName = `coach-chat-${chatSession.id}`;
        console.log("🔌 Coach portal subscribing to channel:", channelName);

        channel = supabase
          .channel(channelName)
          .on("broadcast", { event: "new_message" }, (payload) => {
            console.log("📨 BROADCAST received in coach portal:", payload);

            const newMessage = payload.payload as ChatMessage;
            if (!newMessage) {
              console.log("📨 No payload in broadcast");
              return;
            }

            if (
              newMessage.sender_type === "coach" &&
              newMessage.sender_id === coachId
            ) {
              console.log("📨 Skipping own coach message");
              return;
            }

            setMessages((prev) => {
              if (prev.some((m) => m.id === newMessage.id)) {
                console.log("📨 Message already exists, skipping");
                return prev;
              }
              console.log(
                "📨 Adding new message from broadcast:",
                newMessage.message
              );
              return [...prev, newMessage];
            });

            if (newMessage.sender_type === "user") {
              ChatService.markMessagesAsRead(chatSession.id, coachId).then(
                () => {
                  if (onMessagesReadRef.current) {
                    onMessagesReadRef.current();
                  }
                }
              );
            }
          })
          .on(
            "postgres_changes",
            {
              event: "INSERT",
              schema: "public",
              table: "coach_chat_messages",
              filter: `session_id=eq.${chatSession.id}`,
            },
            (payload) => {
              console.log(
                "📨 POSTGRES_CHANGES received in coach portal:",
                payload
              );
              const newMessage = payload.new as ChatMessage;

              if (
                newMessage.sender_type === "coach" &&
                newMessage.sender_id === coachId
              ) {
                console.log("📨 Skipping own coach message");
                return;
              }

              setMessages((prev) => {
                if (prev.some((m) => m.id === newMessage.id)) {
                  console.log("📨 Message already exists, skipping");
                  return prev;
                }
                console.log(
                  "📨 Adding new message from postgres_changes:",
                  newMessage.message
                );
                return [...prev, newMessage];
              });

              if (newMessage.sender_type === "user") {
                ChatService.markMessagesAsRead(chatSession.id, coachId).then(
                  () => {
                    if (onMessagesReadRef.current) {
                      onMessagesReadRef.current();
                    }
                  }
                );
              }
            }
          )
          .subscribe((status) => {
            console.log("🔌 Coach portal subscription status:", status);
            if (status === "SUBSCRIBED") {
              console.log("✅ Coach portal SUBSCRIBED to:", channelName);
            } else if (status === "CHANNEL_ERROR") {
              console.error("❌ Coach portal subscription FAILED");
            }
          });
      } catch (error) {
        console.error("Error loading chat:", error);
      } finally {
        if (isSubscribed) {
          setLoading(false);
        }
      }
    };

    loadChat();

    return () => {
      isSubscribed = false;
      if (channel) {
        console.log("🔌 Cleaning up coach portal subscription");
        supabase.removeChannel(channel);
      }
    };
  }, [userId, coachId]); // Only depend on userId and coachId

  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');

    if (!isImage && !isVideo) {
      alert('Please select an image or video file');
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setSelectedMedia({
        file,
        preview: reader.result as string,
        type: isImage ? 'image' : 'video'
      });
    };
    reader.readAsDataURL(file);
  };

  // Open record modal and get camera access
  const openRecordModal = async () => {
    try {
      // Close the options menu first
      setShowRecordOptions(false);
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        }, 
        audio: true 
      });
      
      // Set stream and show modal, but don't start recording yet
      setMediaStream(stream);
      setShowRecordModal(true);
      setIsRecording(false);

      // Set up media recorder (but don't start yet)
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp8,opus'
      });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          recordingChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        // Don't process if we're canceling
        if (isCancelingRef.current) {
          return;
        }

        const blob = new Blob(recordingChunksRef.current, { type: 'video/webm' });
        setRecordedVideo(blob);
        
        // Create preview URL - this will be revoked when modal closes or new recording starts
        const previewUrl = URL.createObjectURL(blob);
        setRecordedVideoPreview(previewUrl);

        // Stop camera preview but keep modal open
        if (videoPreviewRef.current) {
          videoPreviewRef.current.srcObject = null;
        }
        stream.getTracks().forEach(track => track.stop());
        setMediaStream(null);
        setIsRecording(false);
      };

      // Set up video preview after a short delay to ensure modal is mounted
      setTimeout(() => {
        if (videoPreviewRef.current && stream) {
          try {
            videoPreviewRef.current.srcObject = stream;
            const playPromise = videoPreviewRef.current.play();
            if (playPromise !== undefined) {
              playPromise.catch(err => {
                // Ignore AbortError - it's expected if component unmounts or stream stops
                if (err.name !== 'AbortError') {
                  console.error('Error playing video:', err);
                }
              });
            }
          } catch (err: any) {
            // Ignore errors if element is no longer available
            if (err.name !== 'AbortError') {
              console.error('Error setting up video:', err);
            }
          }
        }
      }, 200);
    } catch (error) {
      console.error('Error accessing camera:', error);
      alert('Unable to access camera. Please check permissions.');
      setShowRecordOptions(false);
      setShowRecordModal(false);
      setIsRecording(false);
      setMediaStream(null);
    }
  };

  // Start recording (called from modal)
  const startRecording = () => {
    if (!mediaStream || !mediaRecorderRef.current) return;

    setIsRecording(true);
    recordingChunksRef.current = [];
    isCancelingRef.current = false;

    if (mediaRecorderRef.current.state === 'inactive') {
      mediaRecorderRef.current.start();
    }
  };

  // Stop video recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
    }
    // Don't stop the stream here - let onstop handler do it after creating preview
  };

  // Attach recorded video to chat
  const attachRecordedVideo = () => {
    if (recordedVideo && recordedVideoPreview) {
      // Create a File object from the blob
      const file = new File([recordedVideo], `recording-${Date.now()}.webm`, { type: 'video/webm' });
      
      // Create a new data URL for the preview (since we'll revoke the blob URL)
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedMedia({
          file,
          preview: reader.result as string,
          type: 'video'
        });
        // Close modal and clear recording state
        setShowRecordModal(false);
        setRecordedVideo(null);
        // Revoke blob URL after creating data URL
        URL.revokeObjectURL(recordedVideoPreview);
        setRecordedVideoPreview(null);
      };
      reader.readAsDataURL(recordedVideo);
    }
  };

  // Record again (start over)
  const recordAgain = async () => {
    // Clean up previous recording
    if (recordedVideoPreview) {
      URL.revokeObjectURL(recordedVideoPreview);
      setRecordedVideoPreview(null);
    }
    setRecordedVideo(null);
    recordingChunksRef.current = [];
    
    // Get camera access again
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        }, 
        audio: true 
      });
      
      setMediaStream(stream);
      
      // Set up media recorder again
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp8,opus'
      });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          recordingChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        if (isCancelingRef.current) {
          return;
        }

        const blob = new Blob(recordingChunksRef.current, { type: 'video/webm' });
        setRecordedVideo(blob);
        
        const previewUrl = URL.createObjectURL(blob);
        setRecordedVideoPreview(previewUrl);

        if (videoPreviewRef.current) {
          videoPreviewRef.current.srcObject = null;
        }
        stream.getTracks().forEach(track => track.stop());
        setMediaStream(null);
        setIsRecording(false);
      };

      // Set up video preview
      setTimeout(() => {
        if (videoPreviewRef.current && stream) {
          try {
            videoPreviewRef.current.srcObject = stream;
            videoPreviewRef.current.play().catch(err => {
              if (err.name !== 'AbortError') {
                console.error('Error playing video:', err);
              }
            });
          } catch (err: any) {
            if (err.name !== 'AbortError') {
              console.error('Error setting up video:', err);
            }
          }
        }
      }, 200);
    } catch (error) {
      console.error('Error accessing camera:', error);
      alert('Unable to access camera. Please check permissions.');
    }
  };

  // Cancel recording
  const cancelRecording = () => {
    // Set cancel flag to prevent processing
    isCancelingRef.current = true;
    
    // Stop the media recorder if it's running
    if (mediaRecorderRef.current && isRecording) {
      try {
        // Clear the onstop handler to prevent processing
        mediaRecorderRef.current.onstop = null;
        mediaRecorderRef.current.stop();
      } catch (err) {
        // Ignore errors if already stopped
      }
    }
    
    // Stop all media tracks
    if (mediaStream) {
      mediaStream.getTracks().forEach(track => track.stop());
      setMediaStream(null);
    }
    
    // Clean up preview URL if exists
    if (recordedVideoPreview) {
      URL.revokeObjectURL(recordedVideoPreview);
    }
    
    // Clear all recording state
    setIsRecording(false);
    setRecordedVideo(null);
    setRecordedVideoPreview(null);
    setSelectedMedia(null);
    setShowRecordOptions(false);
    setShowRecordModal(false);
    
    // Clear video preview
    if (videoPreviewRef.current) {
      videoPreviewRef.current.srcObject = null;
    }
    
    // Clear the media recorder reference and chunks
    mediaRecorderRef.current = null;
    recordingChunksRef.current = [];
  };

  const handleSend = async () => {
    if ((!inputText.trim() && !selectedMedia) || !session || sending || uploadingMedia) return;

    setSending(true);
    let mediaUrl: string | null = null;
    let mediaType: 'image' | 'video' | null = null;

    try {
      // Upload media if selected
      if (selectedMedia) {
        setUploadingMedia(true);
        try {
          mediaUrl = await ChatService.uploadChatMedia(
            selectedMedia.file,
            session.id,
            'client'
          );
          mediaType = selectedMedia.type;

          if (!mediaUrl) {
            alert('Failed to upload media. Please try again.');
            setUploadingMedia(false);
            setSending(false);
            return;
          }
        } catch (error: any) {
          alert(error.message || 'Failed to upload media. Please try again.');
          setUploadingMedia(false);
          setSending(false);
          return;
        } finally {
          setUploadingMedia(false);
        }
      }

      const newMessage = await ChatService.sendMessage(
        session.id,
        coachId,
        inputText.trim() || (mediaUrl ? (mediaType === 'image' ? '📷 Image' : '🎥 Video') : ''),
        undefined,
        mediaUrl,
        mediaType
      );
      if (newMessage) {
        setMessages((prev) => [...prev, newMessage]);
        setInputText("");
        setSelectedMedia(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    } catch (error) {
      console.error("Error sending message:", error);
      alert('Failed to send message. Please try again.');
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-8 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading chat...</p>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="bg-white rounded-lg shadow p-8 text-center">
        <p className="text-gray-600">No chat session found for this client.</p>
      </div>
    );
  }

  return (
    <div
      className="bg-white rounded-lg shadow flex flex-col"
      style={{ height: "600px" }}
    >
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${
              message.sender_type === "coach" ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                message.sender_type === "coach"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-200 text-gray-900"
              }`}
            >
              {(message.media_url || (message as any).media_url) && (
                <div className="mb-2">
                  {(message.media_type || (message as any).media_type) === 'image' ? (
                    <img
                      src={message.media_url || (message as any).media_url}
                      alt="Shared image"
                      className="max-w-full rounded-lg cursor-pointer hover:opacity-90"
                      onClick={() => window.open(message.media_url || (message as any).media_url, '_blank')}
                    />
                  ) : (
                    <video
                      src={message.media_url || (message as any).media_url}
                      controls
                      className="max-w-full rounded-lg"
                    />
                  )}
                </div>
              )}
              {message.message && (
                <p className="text-sm">{message.message}</p>
              )}
              <p
                className={`text-xs mt-1 ${
                  message.sender_type === "coach"
                    ? "text-blue-100"
                    : "text-gray-500"
                }`}
              >
                {new Date(message.timestamp).toLocaleTimeString()}
              </p>
            </div>
          </div>
        ))}
        {messages.length === 0 && (
          <div className="text-center text-gray-500 py-8">
            No messages yet. Start the conversation!
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-gray-200 p-4">
        {selectedMedia && !isRecording && (
          <div className="mb-2 relative">
            <button
              onClick={() => {
                setSelectedMedia(null);
                if (fileInputRef.current) {
                  fileInputRef.current.value = '';
                }
              }}
              className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 z-10"
            >
              <X className="h-4 w-4" />
            </button>
            {selectedMedia.type === 'image' ? (
              <img
                src={selectedMedia.preview}
                alt="Preview"
                className="max-w-xs rounded-lg"
              />
            ) : (
              <video
                src={selectedMedia.preview}
                controls
                className="max-w-xs rounded-lg"
              />
            )}
          </div>
        )}
        
        {/* Recording Modal */}
        {showRecordModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
            <div className="relative bg-black rounded-lg overflow-hidden shadow-2xl pointer-events-auto" style={{ width: '640px', maxWidth: '90vw', aspectRatio: '16/9' }}>
              <button
                onClick={cancelRecording}
                className="absolute top-4 right-4 z-10 bg-black bg-opacity-50 hover:bg-opacity-70 text-white rounded-full p-2 transition-colors"
                title="Cancel"
              >
                <X className="h-5 w-5" />
              </button>
              
              {/* Camera Preview (when not showing recorded video) */}
              {!recordedVideoPreview && (
                <>
                  <video
                    ref={videoPreviewRef}
                    autoPlay
                    muted
                    playsInline
                    className="w-full h-full object-cover"
                  />
                  {isRecording && (
                    <div className="absolute top-4 left-4 flex items-center gap-2 bg-red-500 text-white px-4 py-2 rounded-full">
                      <div className="w-3 h-3 bg-white rounded-full animate-pulse"></div>
                      <span className="font-medium">Recording</span>
                    </div>
                  )}
                  <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-3">
                    {!isRecording ? (
                      <button
                        onClick={startRecording}
                        className="bg-red-500 text-white px-6 py-3 rounded-full text-base font-medium hover:bg-red-600 shadow-lg"
                      >
                        Start Recording
                      </button>
                    ) : (
                      <button
                        onClick={stopRecording}
                        className="bg-white text-gray-900 px-6 py-3 rounded-full text-base font-medium hover:bg-gray-100 shadow-lg"
                      >
                        Stop Recording
                      </button>
                    )}
                  </div>
                </>
              )}

              {/* Recorded Video Preview */}
              {recordedVideoPreview && (
                <>
                  <video
                    src={recordedVideoPreview}
                    controls
                    className="w-full h-full object-contain"
                  />
                  <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-3">
                    <button
                      onClick={recordAgain}
                      className="bg-gray-500 text-white px-6 py-3 rounded-full text-base font-medium hover:bg-gray-600 shadow-lg"
                    >
                      Record Again
                    </button>
                    <button
                      onClick={attachRecordedVideo}
                      className="bg-blue-600 text-white px-6 py-3 rounded-full text-base font-medium hover:bg-blue-700 shadow-lg"
                    >
                      Attach to Chat
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Record Options Menu */}
        {showRecordOptions && (
          <div className="mb-2 p-2 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowRecordOptions(false);
                  fileInputRef.current?.click();
                }}
                className="flex-1 px-3 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Upload File
              </button>
              <button
                onClick={openRecordModal}
                className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700"
              >
                Record Video
              </button>
              <button
                onClick={() => setShowRecordOptions(false)}
                className="px-3 py-2 text-gray-600 hover:text-gray-900"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        <div className="flex gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            onChange={handleFileSelect}
            className="hidden"
          />
          <div className="relative">
            <button
              onClick={() => setShowRecordOptions(!showRecordOptions)}
              disabled={uploadingMedia || sending || isRecording}
              className="px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Attach image or video"
            >
              {uploadingMedia ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <ImageIcon className="h-5 w-5" />
              )}
            </button>
          </div>
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleSend()}
            placeholder="Type a message..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={uploadingMedia}
          />
          <button
            onClick={handleSend}
            disabled={(!inputText.trim() && !selectedMedia) || sending || uploadingMedia}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {sending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Sending...</span>
              </>
            ) : (
              <span>Send</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
