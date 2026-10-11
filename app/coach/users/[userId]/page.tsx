// "use client";

// import { useEffect, useState } from "react";
// import { useParams, useRouter } from "next/navigation";
// import {
//   ArrowLeft,
//   Calendar,
//   Activity,
//   Target,
//   TrendingUp,
//   Footprints,
//   Timer,
// } from "lucide-react";
// import { CoachService } from "@/lib/services/coachService";

// interface Detail {
//   user: any;
//   focusMoai: { id: string; name: string; joined_at: string | null } | null;
//   program: { id: string; name: string } | null;
//   focus: { id: string; name: string } | null;
//   commitmentHistory: any[];
//   workoutHistory: any[];
// }

// export default function CoachUserDetailPage() {
//   const params = useParams();
//   const router = useRouter();
//   const userId = params.userId as string;
//   const [detail, setDetail] = useState<Detail | null>(null);
//   const [loading, setLoading] = useState(true);

//   useEffect(() => {
//     if (!userId) return;
//     (async () => {
//       try {
//         setDetail(await CoachService.getClientDetail(userId));
//       } catch (error) {
//         console.error("Error loading user detail:", error);
//       } finally {
//         setLoading(false);
//       }
//     })();
//   }, [userId]);

//   if (loading) {
//     return (
//       <div className="flex items-center justify-center min-h-[400px]">
//         <div className="text-center">
//           <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
//           <p className="mt-4 text-gray-600">Loading member details...</p>
//         </div>
//       </div>
//     );
//   }

//   if (!detail) {
//     return (
//       <div className="text-center py-12">
//         <p className="text-gray-600">
//           Member not found or you don't have access
//         </p>
//         <button
//           onClick={() => router.back()}
//           className="cursor-pointer mt-4 text-blue-600 hover:text-blue-800"
//         >
//           Go back
//         </button>
//       </div>
//     );
//   }

//   const { user, focusMoai, program, focus, commitmentHistory, workoutHistory } =
//     detail;

//   const current = commitmentHistory[0];
//   const totalCompleted = commitmentHistory.reduce(
//     (s, c) => s + (c.completed_sessions || 0),
//     0,
//   );
//   const totalCommitted = commitmentHistory.reduce(
//     (s, c) => s + (c.commitment_count || 0),
//     0,
//   );
//   const overallRate =
//     totalCommitted > 0 ? (totalCompleted / totalCommitted) * 100 : 0;

//   const displayName =
//     user.first_name && user.last_name
//       ? `${user.first_name} ${user.last_name}`
//       : user.display_name || user.username || user.email;

//   return (
//     <div className="px-4 sm:px-6 lg:px-8">
//       {/* Header */}
//       <div className="mb-6">
//         <button
//           onClick={() => router.back()}
//           className="cursor-pointer flex items-center text-gray-600 hover:text-gray-900 mb-4"
//         >
//           <ArrowLeft className="h-5 w-5 mr-2" />
//           Back
//         </button>
//         <div className="flex items-center">
//           {user.profile_picture_url ? (
//             <img
//               src={user.profile_picture_url}
//               alt={displayName}
//               className="h-16 w-16 rounded-full object-cover"
//             />
//           ) : (
//             <div className="h-16 w-16 rounded-full bg-gray-300 flex items-center justify-center">
//               <span className="text-gray-600 font-medium text-2xl">
//                 {(
//                   user.first_name?.[0] ||
//                   user.username?.[0] ||
//                   user.email[0]
//                 ).toUpperCase()}
//               </span>
//             </div>
//           )}
//           <div className="ml-6">
//             <h1 className="text-3xl font-bold text-gray-900">{displayName}</h1>
//             <p className="mt-1 text-sm text-gray-600">{user.email}</p>
//             {user.username && (
//               <p className="text-sm text-gray-500">@{user.username}</p>
//             )}
//           </div>
//         </div>
//       </div>

//       {/* Member info */}
//       <div className="bg-white shadow rounded-lg mb-8">
//         <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
//           <h2 className="text-lg font-medium text-gray-900">
//             Member Information
//           </h2>
//         </div>
//         <div className="px-4 py-5 sm:px-6">
//           <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
//             <div>
//               <dt className="text-sm font-medium text-gray-500">Focus Moai</dt>
//               <dd className="mt-1 text-sm text-gray-900">
//                 {focusMoai?.name || <span className="text-gray-400">None</span>}
//               </dd>
//             </div>
//             <div>
//               <dt className="text-sm font-medium text-gray-500">
//                 Joined Focus Moai
//               </dt>
//               <dd className="mt-1 text-sm text-gray-900">
//                 {focusMoai?.joined_at
//                   ? new Date(focusMoai.joined_at).toLocaleDateString()
//                   : "-"}
//               </dd>
//             </div>
//             <div>
//               <dt className="text-sm font-medium text-gray-500">
//                 Current Focus
//               </dt>
//               <dd className="mt-1 text-sm text-gray-900">
//                 {focus?.name || <span className="text-gray-400">Not set</span>}
//               </dd>
//             </div>
//             <div>
//               <dt className="text-sm font-medium text-gray-500">
//                 Current Program
//               </dt>
//               <dd className="mt-1 text-sm text-gray-900">
//                 {program?.name || (
//                   <span className="text-gray-400">No program</span>
//                 )}
//               </dd>
//             </div>
//             <div>
//               <dt className="text-sm font-medium text-gray-500">Location</dt>
//               <dd className="mt-1 text-sm text-gray-900">
//                 {user.city && user.country
//                   ? `${user.city}, ${user.country}`
//                   : user.city || user.country || "Not provided"}
//               </dd>
//             </div>
//             <div>
//               <dt className="text-sm font-medium text-gray-500">
//                 Member Since
//               </dt>
//               <dd className="mt-1 text-sm text-gray-900">
//                 {new Date(user.created_at).toLocaleDateString()}
//               </dd>
//             </div>
//           </dl>
//         </div>
//       </div>

//       {/* Stats */}
//       <div className="grid grid-cols-1 gap-5 sm:grid-cols-4 mb-8">
//         <StatCard
//           icon={<Target className="h-8 w-8 text-blue-500" />}
//           label="Current Week"
//           value={
//             current
//               ? `${current.completed_sessions} / ${current.commitment_count}`
//               : "0 / 0"
//           }
//         />
//         <StatCard
//           icon={<TrendingUp className="h-8 w-8 text-green-500" />}
//           label="Overall Rate"
//           value={`${overallRate.toFixed(1)}%`}
//         />
//         <StatCard
//           icon={<Calendar className="h-8 w-8 text-purple-500" />}
//           label="Weeks Active"
//           value={String(commitmentHistory.length)}
//         />
//         <StatCard
//           icon={<Activity className="h-8 w-8 text-orange-500" />}
//           label="Workouts"
//           value={String(user.total_workouts)}
//         />
//       </div>

//       {/* Weekly commitment & movement goals */}
//       <div className="bg-white shadow rounded-lg mb-8">
//         <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
//           <h2 className="text-lg font-medium text-gray-900">
//             Weekly Commitment & Movement Goals
//           </h2>
//           <p className="mt-1 text-sm text-gray-500">
//             Targets for the current week
//           </p>
//         </div>
//         <div className="px-4 py-5 sm:px-6 grid grid-cols-1 gap-6 sm:grid-cols-3">
//           {/* Weekly commitment */}
//           <div className="flex items-center">
//             <Target className="h-6 w-6 text-blue-500 mr-3" />
//             <div>
//               <p className="text-sm text-gray-500">Weekly commitment</p>
//               <p className="text-lg font-semibold text-gray-900">
//                 {current?.commitment_count != null
//                   ? `${current.commitment_count} workouts`
//                   : "Not set"}
//               </p>
//               {current?.commitment_count != null && (
//                 <p className="text-xs text-gray-500">
//                   {current.completed_sessions || 0} completed
//                 </p>
//               )}
//             </div>
//           </div>

//           {/* Movement goal: steps */}
//           <div className="flex items-center">
//             <Footprints className="h-6 w-6 text-green-500 mr-3" />
//             <div>
//               <p className="text-sm text-gray-500">Steps goal</p>
//               <p className="text-lg font-semibold text-gray-900">
//                 {current?.steps_goal
//                   ? current.steps_goal.toLocaleString()
//                   : "Not set"}
//               </p>
//             </div>
//           </div>

//           {/* Movement goal: exercise minutes */}
//           <div className="flex items-center">
//             <Timer className="h-6 w-6 text-orange-500 mr-3" />
//             <div>
//               <p className="text-sm text-gray-500">Exercise minutes goal</p>
//               <p className="text-lg font-semibold text-gray-900">
//                 {current?.exercise_minutes_goal ?? "Not set"}
//               </p>
//             </div>
//           </div>
//         </div>
//       </div>

//       {/* Commitment history */}
//       <div className="bg-white shadow rounded-lg mb-8">
//         <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
//           <h2 className="text-lg font-medium text-gray-900">
//             Commitment History
//           </h2>
//           <p className="mt-1 text-sm text-gray-500">
//             Weekly commitments and goals
//           </p>
//         </div>
//         <div className="overflow-x-auto">
//           <table className="min-w-full divide-y divide-gray-200">
//             <thead className="bg-gray-50">
//               <tr>
//                 {[
//                   "Week Start",
//                   "Commitment",
//                   "Completed",
//                   "Completion Rate",
//                   "Steps Goal",
//                   "Exercise Min Goal",
//                 ].map((h) => (
//                   <th
//                     key={h}
//                     className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
//                   >
//                     {h}
//                   </th>
//                 ))}
//               </tr>
//             </thead>
//             <tbody className="bg-white divide-y divide-gray-200">
//               {commitmentHistory.map((c) => (
//                 <tr key={c.id}>
//                   <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
//                     {new Date(c.week_start).toLocaleDateString()}
//                   </td>
//                   <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
//                     {c.commitment_count}
//                   </td>
//                   <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
//                     {c.completed_sessions}
//                   </td>
//                   <td className="px-6 py-4 whitespace-nowrap">
//                     <span
//                       className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
//                         c.completion_rate >= 100
//                           ? "bg-green-100 text-green-800"
//                           : c.completion_rate >= 75
//                             ? "bg-yellow-100 text-yellow-800"
//                             : "bg-red-100 text-red-800"
//                       }`}
//                     >
//                       {c.completion_rate.toFixed(1)}%
//                     </span>
//                   </td>
//                   <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
//                     {c.steps_goal ? c.steps_goal.toLocaleString() : "-"}
//                   </td>
//                   <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
//                     {c.exercise_minutes_goal ?? "-"}
//                   </td>
//                 </tr>
//               ))}
//               {commitmentHistory.length === 0 && (
//                 <tr>
//                   <td
//                     colSpan={6}
//                     className="px-6 py-8 text-center text-gray-500"
//                   >
//                     No commitment history
//                   </td>
//                 </tr>
//               )}
//             </tbody>
//           </table>
//         </div>
//       </div>

//       {/* Workout history */}
//       <div className="bg-white shadow rounded-lg mb-8">
//         <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
//           <h2 className="text-lg font-medium text-gray-900">Workout History</h2>
//           <p className="mt-1 text-sm text-gray-500">Recent workout sessions</p>
//         </div>
//         <div className="overflow-x-auto">
//           <table className="min-w-full divide-y divide-gray-200">
//             <thead className="bg-gray-50">
//               <tr>
//                 {["Date", "Workout", "Status", "Duration"].map((h) => (
//                   <th
//                     key={h}
//                     className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
//                   >
//                     {h}
//                   </th>
//                 ))}
//               </tr>
//             </thead>
//             <tbody className="bg-white divide-y divide-gray-200">
//               {workoutHistory.slice(0, 20).map((w) => (
//                 <tr key={w.session_id}>
//                   <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
//                     {new Date(w.date).toLocaleDateString()}
//                   </td>
//                   <td className="px-6 py-4 text-sm text-gray-900">
//                     {w.workout_title || "Unknown Workout"}
//                   </td>
//                   <td className="px-6 py-4 whitespace-nowrap">
//                     <span
//                       className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
//                         w.status === "completed"
//                           ? "bg-green-100 text-green-800"
//                           : w.status === "in_progress"
//                             ? "bg-yellow-100 text-yellow-800"
//                             : "bg-gray-100 text-gray-800"
//                       }`}
//                     >
//                       {w.status}
//                     </span>
//                   </td>
//                   <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
//                     {w.total_duration_seconds
//                       ? `${Math.floor(w.total_duration_seconds / 60)} min`
//                       : "N/A"}
//                   </td>
//                 </tr>
//               ))}
//               {workoutHistory.length === 0 && (
//                 <tr>
//                   <td
//                     colSpan={4}
//                     className="px-6 py-8 text-center text-gray-500"
//                   >
//                     No workout history
//                   </td>
//                 </tr>
//               )}
//             </tbody>
//           </table>
//         </div>
//       </div>
//     </div>
//   );
// }

// function StatCard({
//   icon,
//   label,
//   value,
// }: {
//   icon: React.ReactNode;
//   label: string;
//   value: string;
// }) {
//   return (
//     <div className="bg-white overflow-hidden shadow rounded-lg">
//       <div className="p-5 flex items-center">
//         {icon}
//         <div className="ml-4">
//           <p className="text-sm font-medium text-gray-500">{label}</p>
//           <p className="text-2xl font-semibold text-gray-900">{value}</p>
//         </div>
//       </div>
//     </div>
//   );
// }

"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Calendar,
  Activity,
  Target,
  TrendingUp,
  Footprints,
  Timer,
  CheckCircle2,
  XCircle,
  Clock,
  ChevronDown,
  ChevronUp,
  BarChart3,
  List,
} from "lucide-react";
import { CoachService } from "@/lib/services/coachService";

interface CommitmentWeek {
  id: string;
  week_start: string;
  commitment_count: number;
  completed_sessions: number;
  completion_rate: number;
  steps_goal: number | null;
  exercise_minutes_goal: number | null;
}

interface WorkoutSession {
  session_id: string;
  date: string;
  workout_title: string;
  status: string;
  total_duration_seconds: number | null;
}

interface Detail {
  user: any;
  focusMoai: { id: string; name: string; joined_at: string | null } | null;
  program: { id: string; name: string } | null;
  focus: { id: string; name: string } | null;
  commitmentHistory: CommitmentWeek[];
  workoutHistory: WorkoutSession[];
}

const DURATIONS = [
  { label: "4W", weeks: 4 },
  { label: "8W", weeks: 8 },
  { label: "12W", weeks: 12 },
] as const;

function isCurrentWeek(weekStart: string): boolean {
  const start = new Date(weekStart);
  const now = new Date();
  const diff = now.getTime() - start.getTime();
  return diff >= 0 && diff < 7 * 24 * 60 * 60 * 1000;
}

function formatWeekLabel(dateStr: string): { month: string; day: string } {
  const d = new Date(dateStr);
  return {
    month: d.toLocaleDateString("en-US", { month: "short" }),
    day: String(d.getDate()),
  };
}

// ─── Duration Toggle ────────────────────────────────────────────
function DurationToggle({
  value,
  onChange,
}: {
  value: number;
  onChange: (w: number) => void;
}) {
  return (
    <div className="flex bg-gray-100 rounded-lg p-0.5">
      {DURATIONS.map((d) => (
        <button
          key={d.weeks}
          onClick={() => onChange(d.weeks)}
          className={`cursor-pointer px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
            value === d.weeks
              ? "bg-blue-600 text-white shadow-sm"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          {d.label}
        </button>
      ))}
    </div>
  );
}

// ─── Commitment Bar Chart ───────────────────────────────────────
function CommitmentBarChart({ data }: { data: CommitmentWeek[] }) {
  if (data.length === 0) {
    return <p className="text-center py-8 text-gray-500">No commitment data</p>;
  }

  const maxVal = Math.max(
    ...data.map((c) =>
      Math.max(c.completed_sessions || 0, c.commitment_count || 0),
    ),
    1,
  );

  return (
    <div>
      {/* Bars */}
      <div className="flex items-end gap-1 sm:gap-2 px-2 sm:px-4">
        {data.map((week) => {
          const completed = week.completed_sessions || 0;
          const committed = week.commitment_count || 0;
          const rate = week.completion_rate;
          const barPct = maxVal > 0 ? (completed / maxVal) * 100 : 0;
          const isCurrent = isCurrentWeek(week.week_start);

          let barColor = "bg-red-400";
          if (isCurrent) {
            barColor =
              committed > 0 && completed >= committed
                ? "bg-green-500"
                : "bg-yellow-400";
          } else if (rate >= 100) {
            barColor = "bg-green-500";
          } else if (rate >= 50) {
            barColor = "bg-yellow-400";
          }

          const StatusIcon = isCurrent ? (
            <Clock className="h-3.5 w-3.5 text-yellow-500" />
          ) : rate >= 100 ? (
            <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
          ) : (
            <XCircle className="h-3.5 w-3.5 text-red-500" />
          );

          const { month, day } = formatWeekLabel(week.week_start);

          return (
            <div
              key={week.id}
              className="flex flex-col items-center flex-1 min-w-0"
            >
              {/* Status icon */}
              <div className="mb-1.5">{StatusIcon}</div>

              {/* Bar container */}
              <div
                className="w-full flex items-end justify-center"
                style={{ height: 130 }}
              >
                <div
                  className={`w-7 sm:w-10 rounded-t-md ${barColor} transition-all duration-300 relative group`}
                  style={{ height: `${Math.max(barPct, 5)}%` }}
                >
                  {/* Tooltip on hover */}
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                    {completed}/{committed} &middot; {rate.toFixed(0)}%
                  </div>
                </div>
              </div>

              {/* Week label */}
              <p className="text-[10px] sm:text-xs text-gray-400 mt-2 leading-tight">
                {month}
              </p>
              <p className="text-[10px] sm:text-xs text-gray-500 leading-tight">
                {day}
              </p>
              {/* Completed count */}
              <p className="text-xs font-semibold text-gray-700 mt-0.5">
                {completed}
              </p>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1.5 px-4 pt-4 pb-1 border-t border-gray-100 mt-4">
        <span className="flex items-center gap-1.5 text-xs text-gray-600">
          <span className="inline-block w-3 h-3 rounded-sm bg-green-500" />
          High activity
        </span>
        <span className="flex items-center gap-1.5 text-xs text-gray-600">
          <span className="inline-block w-3 h-3 rounded-sm bg-yellow-400" />
          Moderate
        </span>
        <span className="flex items-center gap-1.5 text-xs text-gray-600">
          <span className="inline-block w-3 h-3 rounded-sm bg-red-400" />
          Low activity
        </span>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1.5 px-4 pb-2">
        <span className="flex items-center gap-1.5 text-xs text-gray-600">
          <CheckCircle2 className="h-3 w-3 text-green-500" /> Commitment met
        </span>
        <span className="flex items-center gap-1.5 text-xs text-gray-600">
          <XCircle className="h-3 w-3 text-red-500" /> Not met
        </span>
        <span className="flex items-center gap-1.5 text-xs text-gray-600">
          <Clock className="h-3 w-3 text-yellow-500" /> In progress
        </span>
      </div>
    </div>
  );
}

// ─── Completion Rate Horizontal Bars ────────────────────────────
function CompletionRateChart({ data }: { data: CommitmentWeek[] }) {
  if (data.length === 0) {
    return <p className="text-center py-6 text-gray-500">No data</p>;
  }

  return (
    <div className="space-y-2">
      {data.map((week) => {
        const rate = Math.min(week.completion_rate, 100);
        const isCurrent = isCurrentWeek(week.week_start);
        const { month, day } = formatWeekLabel(week.week_start);

        let barColor = "bg-red-400";
        if (isCurrent) {
          barColor = rate >= 100 ? "bg-green-500" : "bg-yellow-400";
        } else if (rate >= 100) {
          barColor = "bg-green-500";
        } else if (rate >= 50) {
          barColor = "bg-yellow-400";
        }

        return (
          <div key={week.id} className="flex items-center gap-3">
            <span className="text-xs text-gray-500 w-16 text-right shrink-0">
              {month} {day}
            </span>
            <div className="flex-1 bg-gray-100 rounded-full h-4 overflow-hidden">
              <div
                className={`h-full ${barColor} rounded-full transition-all duration-500`}
                style={{ width: `${Math.max(rate, 2)}%` }}
              />
            </div>
            <span className="text-xs font-semibold text-gray-700 w-12 shrink-0">
              {week.completion_rate.toFixed(0)}%
            </span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Movement Goals Trend ───────────────────────────────────────
function MovementGoalsTrend({ data }: { data: CommitmentWeek[] }) {
  const hasSteps = data.some((d) => d.steps_goal != null && d.steps_goal > 0);
  const hasMinutes = data.some(
    (d) => d.exercise_minutes_goal != null && d.exercise_minutes_goal > 0,
  );

  if (!hasSteps && !hasMinutes) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
      {/* Steps trend */}
      {hasSteps && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Footprints className="h-4 w-4 text-green-500" />
            <span className="text-sm font-medium text-gray-700">
              Steps Goal
            </span>
          </div>
          <div className="space-y-1.5">
            {data.map((week) => {
              const val = week.steps_goal || 0;
              const maxSteps = Math.max(
                ...data.map((d) => d.steps_goal || 0),
                1,
              );
              const pct = (val / maxSteps) * 100;
              const { month, day } = formatWeekLabel(week.week_start);
              return (
                <div key={week.id} className="flex items-center gap-2">
                  <span className="text-[10px] text-gray-400 w-14 text-right shrink-0">
                    {month} {day}
                  </span>
                  <div className="flex-1 bg-gray-50 rounded-full h-3 overflow-hidden">
                    <div
                      className="h-full bg-green-400 rounded-full transition-all"
                      style={{ width: `${Math.max(pct, 2)}%` }}
                    />
                  </div>
                  <span className="text-[10px] font-medium text-gray-600 w-14 shrink-0">
                    {val > 0 ? val.toLocaleString() : "-"}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Exercise minutes trend */}
      {hasMinutes && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Timer className="h-4 w-4 text-orange-500" />
            <span className="text-sm font-medium text-gray-700">
              Exercise Minutes Goal
            </span>
          </div>
          <div className="space-y-1.5">
            {data.map((week) => {
              const val = week.exercise_minutes_goal || 0;
              const maxMin = Math.max(
                ...data.map((d) => d.exercise_minutes_goal || 0),
                1,
              );
              const pct = (val / maxMin) * 100;
              const { month, day } = formatWeekLabel(week.week_start);
              return (
                <div key={week.id} className="flex items-center gap-2">
                  <span className="text-[10px] text-gray-400 w-14 text-right shrink-0">
                    {month} {day}
                  </span>
                  <div className="flex-1 bg-gray-50 rounded-full h-3 overflow-hidden">
                    <div
                      className="h-full bg-orange-400 rounded-full transition-all"
                      style={{ width: `${Math.max(pct, 2)}%` }}
                    />
                  </div>
                  <span className="text-[10px] font-medium text-gray-600 w-10 shrink-0">
                    {val > 0 ? `${val}m` : "-"}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Stat Card ──────────────────────────────────────────────────
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

// ─── Main Page ──────────────────────────────────────────────────
export default function CoachUserDetailPage() {
  const params = useParams();
  const router = useRouter();
  const userId = params.userId as string;
  const [detail, setDetail] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(true);
  const [durationWeeks, setDurationWeeks] = useState(8);
  const [commitmentView, setCommitmentView] = useState<"trends" | "list">(
    "trends",
  );
  const [workoutView, setWorkoutView] = useState<"trends" | "list">("trends");
  const [showAllWorkouts, setShowAllWorkouts] = useState(false);

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

  // Commitment data filtered by duration (newest-first → reversed for chart)
  const chartCommitments = useMemo(() => {
    if (!detail?.commitmentHistory) return [];
    return detail.commitmentHistory.slice(0, durationWeeks).reverse();
  }, [detail?.commitmentHistory, durationWeeks]);

  // Aggregate workout sessions by week for the trends view
  const weeklyWorkoutAgg = useMemo(() => {
    if (!detail?.workoutHistory) return [];
    const map = new Map<
      string,
      { count: number; completed: number; totalDuration: number }
    >();

    detail.workoutHistory.forEach((w) => {
      const d = new Date(w.date);
      const day = d.getDay();
      const monday = new Date(d);
      monday.setDate(d.getDate() - ((day + 6) % 7));
      const key = monday.toISOString().split("T")[0];

      const prev = map.get(key) || {
        count: 0,
        completed: 0,
        totalDuration: 0,
      };
      prev.count++;
      if (w.status === "completed") prev.completed++;
      prev.totalDuration += w.total_duration_seconds || 0;
      map.set(key, prev);
    });

    return Array.from(map.entries())
      .map(([week, s]) => ({ week_start: week, ...s }))
      .sort((a, b) => b.week_start.localeCompare(a.week_start))
      .slice(0, durationWeeks)
      .reverse();
  }, [detail?.workoutHistory, durationWeeks]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
          <p className="mt-4 text-gray-600">Loading member details...</p>
        </div>
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">
          Member not found or you don&apos;t have access
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
    <div className="px-4 sm:px-6 lg:px-8 pb-12">
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

      {/* Current week goals */}
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

      {/* ── Commitment History: Trends / List ────────────────── */}
      <div className="bg-white shadow rounded-lg mb-8">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="text-lg font-medium text-gray-900">
                Commitment History
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Weekly commitments and completion
              </p>
            </div>
            <div className="flex items-center gap-3">
              {/* List / Trends toggle */}
              <div className="flex bg-gray-100 rounded-lg p-0.5">
                <button
                  onClick={() => setCommitmentView("list")}
                  className={`cursor-pointer flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                    commitmentView === "list"
                      ? "bg-white text-gray-900 shadow-sm"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  <List className="h-3.5 w-3.5" /> List
                </button>
                <button
                  onClick={() => setCommitmentView("trends")}
                  className={`cursor-pointer flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                    commitmentView === "trends"
                      ? "bg-white text-gray-900 shadow-sm"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  <BarChart3 className="h-3.5 w-3.5" /> Trends
                </button>
              </div>
              {/* Duration (only in trends mode) */}
              {commitmentView === "trends" && (
                <DurationToggle
                  value={durationWeeks}
                  onChange={setDurationWeeks}
                />
              )}
            </div>
          </div>
        </div>

        {commitmentView === "trends" ? (
          <div className="py-6">
            <CommitmentBarChart data={chartCommitments} />

            {/* Completion rate trend */}
            <div className="px-4 sm:px-6 mt-6 pt-6 border-t border-gray-100">
              <h3 className="text-sm font-medium text-gray-700 mb-3">
                Completion Rate
              </h3>
              <CompletionRateChart data={chartCommitments} />
            </div>

            {/* Movement goals trend */}
            <div className="px-4 sm:px-6 mt-6 pt-6 border-t border-gray-100">
              <MovementGoalsTrend data={chartCommitments} />
            </div>
          </div>
        ) : (
          /* List view - original table */
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
        )}
      </div>

      {/* ── Workout History: Trends / List ────────────────────── */}
      <div className="bg-white shadow rounded-lg mb-8">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="text-lg font-medium text-gray-900">
                Workout History
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                {workoutHistory.length} sessions
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex bg-gray-100 rounded-lg p-0.5">
                <button
                  onClick={() => setWorkoutView("list")}
                  className={`cursor-pointer flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                    workoutView === "list"
                      ? "bg-white text-gray-900 shadow-sm"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  <List className="h-3.5 w-3.5" /> List
                </button>
                <button
                  onClick={() => setWorkoutView("trends")}
                  className={`cursor-pointer flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                    workoutView === "trends"
                      ? "bg-white text-gray-900 shadow-sm"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  <BarChart3 className="h-3.5 w-3.5" /> Trends
                </button>
              </div>
              {workoutView === "trends" && (
                <DurationToggle
                  value={durationWeeks}
                  onChange={setDurationWeeks}
                />
              )}
            </div>
          </div>
        </div>

        {workoutView === "trends" ? (
          <div className="px-4 sm:px-6 py-6">
            {weeklyWorkoutAgg.length === 0 ? (
              <p className="text-center py-8 text-gray-500">
                No workout data for this period
              </p>
            ) : (
              <>
                {/* Workout count bars */}
                <h3 className="text-sm font-medium text-gray-700 mb-3">
                  Workouts Per Week
                </h3>
                <div className="flex items-end gap-1 sm:gap-2">
                  {weeklyWorkoutAgg.map((week) => {
                    const maxCount = Math.max(
                      ...weeklyWorkoutAgg.map((w) => w.count),
                      1,
                    );
                    const pct = (week.count / maxCount) * 100;
                    const { month, day } = formatWeekLabel(week.week_start);

                    let color = "bg-green-500";
                    if (week.completed === 0) color = "bg-red-400";
                    else if (week.completed < week.count)
                      color = "bg-yellow-400";

                    return (
                      <div
                        key={week.week_start}
                        className="flex flex-col items-center flex-1 min-w-0"
                      >
                        <div
                          className="w-full flex items-end justify-center"
                          style={{ height: 110 }}
                        >
                          <div
                            className={`w-7 sm:w-10 rounded-t-md ${color} transition-all duration-300 relative group`}
                            style={{ height: `${Math.max(pct, 5)}%` }}
                          >
                            <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-[10px] px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                              {week.completed}/{week.count} completed
                            </div>
                          </div>
                        </div>
                        <p className="text-[10px] sm:text-xs text-gray-400 mt-2 leading-tight">
                          {month}
                        </p>
                        <p className="text-[10px] sm:text-xs text-gray-500 leading-tight">
                          {day}
                        </p>
                        <p className="text-xs font-semibold text-gray-700 mt-0.5">
                          {week.count}
                        </p>
                      </div>
                    );
                  })}
                </div>

                {/* Duration trend */}
                <div className="mt-6 pt-6 border-t border-gray-100">
                  <h3 className="text-sm font-medium text-gray-700 mb-3">
                    Total Duration Per Week
                  </h3>
                  <div className="space-y-2">
                    {weeklyWorkoutAgg.map((week) => {
                      const mins = Math.round(week.totalDuration / 60);
                      const maxMins = Math.max(
                        ...weeklyWorkoutAgg.map((w) =>
                          Math.round(w.totalDuration / 60),
                        ),
                        1,
                      );
                      const pct = (mins / maxMins) * 100;
                      const { month, day } = formatWeekLabel(week.week_start);
                      return (
                        <div
                          key={week.week_start}
                          className="flex items-center gap-3"
                        >
                          <span className="text-xs text-gray-500 w-16 text-right shrink-0">
                            {month} {day}
                          </span>
                          <div className="flex-1 bg-gray-100 rounded-full h-4 overflow-hidden">
                            <div
                              className="h-full bg-blue-400 rounded-full transition-all duration-500"
                              style={{ width: `${Math.max(pct, 2)}%` }}
                            />
                          </div>
                          <span className="text-xs font-semibold text-gray-700 w-16 shrink-0">
                            {mins} min
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>
        ) : (
          /* List view */
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
                {(showAllWorkouts
                  ? workoutHistory
                  : workoutHistory.slice(0, 10)
                ).map((w) => (
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
            {workoutHistory.length > 10 && (
              <div className="px-6 py-3 border-t border-gray-100">
                <button
                  onClick={() => setShowAllWorkouts(!showAllWorkouts)}
                  className="cursor-pointer text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
                >
                  {showAllWorkouts ? (
                    <>
                      Show less <ChevronUp className="h-4 w-4" />
                    </>
                  ) : (
                    <>
                      Show all {workoutHistory.length} workouts{" "}
                      <ChevronDown className="h-4 w-4" />
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
