'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { AdminService } from '@/lib/services/adminService'
import { CoachService } from '@/lib/services/coachService'
import { ArrowLeft, Calendar, Activity, Target, Edit2, Key, TrendingUp, UserPlus } from 'lucide-react'
import type { AdminUser } from '@/lib/types/admin'
import type { CommitmentHistory, WorkoutHistory } from '@/lib/types/coach'

export default function UserDetailPage() {
  const params = useParams()
  const router = useRouter()
  const userId = params.userId as string
  const [user, setUser] = useState<AdminUser | null>(null)
  const [commitmentHistory, setCommitmentHistory] = useState<CommitmentHistory[]>([])
  const [workoutHistory, setWorkoutHistory] = useState<WorkoutHistory[]>([])
  const [loading, setLoading] = useState(true)
  const [sendingReset, setSendingReset] = useState(false)

  useEffect(() => {
    if (userId) {
      loadUserDetail()
    }
  }, [userId])

  const loadUserDetail = async () => {
    try {
      const [userData, commitmentData, workoutData] = await Promise.all([
        AdminService.getUserDetails(userId),
        CoachService.getClientCommitmentHistory(userId),
        CoachService.getClientWorkoutHistory(userId),
      ])
      setUser(userData)
      setCommitmentHistory(commitmentData || [])
      setWorkoutHistory(workoutData || [])
    } catch (error) {
      console.error('Error loading user detail:', error)
    } finally {
      setLoading(false)
    }
  }

  const handlePasswordReset = async () => {
    if (!confirm('Send password reset email to this user?')) {
      return
    }

    setSendingReset(true)
    try {
      const success = await AdminService.sendPasswordReset(userId)
      if (success) {
        alert('Password reset email sent (Note: This requires server-side implementation with admin API key)')
      } else {
        alert('Failed to send password reset email')
      }
    } catch (error) {
      console.error('Error sending password reset:', error)
      alert('Error sending password reset email')
    } finally {
      setSendingReset(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading user details...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">User not found</p>
        <button
          onClick={() => router.push('/admin/users')}
          className="mt-4 text-blue-600 hover:text-blue-800"
        >
          Back to Users
        </button>
      </div>
    )
  }

  const currentWeekCommitment = commitmentHistory[0]
  const totalCommitmentWeeks = commitmentHistory.length
  const totalCompletedSessions = commitmentHistory.reduce(
    (sum, c) => sum + (c.completed_sessions || 0),
    0
  )
  const totalCommitmentCount = commitmentHistory.reduce(
    (sum, c) => sum + (c.commitment_count || 0),
    0
  )
  const overallCompletionRate =
    totalCommitmentCount > 0 ? (totalCompletedSessions / totalCommitmentCount) * 100 : 0

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => router.push('/admin/users')}
          className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="h-5 w-5 mr-2" />
          Back to Users
        </button>
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="flex-shrink-0 h-16 w-16">
              <div className="h-16 w-16 rounded-full bg-gray-300 flex items-center justify-center">
                <span className="text-gray-600 font-medium text-2xl">
                  {(user.first_name?.[0] || user.username?.[0] || user.email[0]).toUpperCase()}
                </span>
              </div>
            </div>
            <div className="ml-6">
              <h1 className="text-3xl font-bold text-gray-900">
                {user.first_name && user.last_name
                  ? `${user.first_name} ${user.last_name}`
                  : user.username || user.email}
              </h1>
              <p className="mt-1 text-sm text-gray-600">{user.email}</p>
              {user.username && <p className="text-sm text-gray-500">@{user.username}</p>}
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={handlePasswordReset}
              disabled={sendingReset}
              className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              <Key className="h-4 w-4 mr-2" />
              {sendingReset ? 'Sending...' : 'Send Password Reset'}
            </button>
            <button className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
              <Edit2 className="h-4 w-4 mr-2" />
              Edit User
            </button>
          </div>
        </div>
      </div>

      {/* User Info */}
      <div className="bg-white shadow rounded-lg mb-8">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">User Information</h2>
        </div>
        <div className="px-4 py-5 sm:px-6">
          <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
            <div>
              <dt className="text-sm font-medium text-gray-500">Role</dt>
              <dd className="mt-1 text-sm text-gray-900">
                <span
                  className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    user.role === 'admin'
                      ? 'bg-red-100 text-red-800'
                      : user.role === 'coach'
                      ? 'bg-purple-100 text-purple-800'
                      : 'bg-blue-100 text-blue-800'
                  }`}
                >
                  {user.role}
                </span>
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Subscription Status</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {user.subscription_status ? (
                  <span
                    className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      user.subscription_status === 'active'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {user.subscription_status}
                  </span>
                ) : (
                  <span className="text-gray-400">No subscription</span>
                )}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Location</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {user.city && user.country
                  ? `${user.city}, ${user.country}`
                  : user.city || user.country || 'Not provided'}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Member Since</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {new Date(user.created_at).toLocaleDateString()}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Total Moais</dt>
              <dd className="mt-1 text-sm text-gray-900">{user.total_moais}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Total Workouts</dt>
              <dd className="mt-1 text-sm text-gray-900">{user.total_workouts}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Invite Code</dt>
              <dd className="mt-1 text-sm text-gray-900 font-mono">
                {user.invite_code || 'Not set'}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Referrals</dt>
              <dd className="mt-1 text-sm text-gray-900">{user.referrals_count || 0}</dd>
            </div>
          </dl>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-4 mb-8">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <Target className="h-8 w-8 text-blue-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Current Week</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {currentWeekCommitment
                    ? `${currentWeekCommitment.completed_sessions} / ${currentWeekCommitment.commitment_count}`
                    : '0 / 0'}
                </p>
              </div>
            </div>
          </div>
        </div>
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <TrendingUp className="h-8 w-8 text-green-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Overall Rate</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {overallCompletionRate.toFixed(1)}%
                </p>
              </div>
            </div>
          </div>
        </div>
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <Calendar className="h-8 w-8 text-purple-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Weeks Active</p>
                <p className="text-2xl font-semibold text-gray-900">{totalCommitmentWeeks}</p>
              </div>
            </div>
          </div>
        </div>
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <Activity className="h-8 w-8 text-orange-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Workouts</p>
                <p className="text-2xl font-semibold text-gray-900">{user.total_workouts}</p>
              </div>
            </div>
          </div>
        </div>
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <UserPlus className="h-8 w-8 text-indigo-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Referrals</p>
                <p className="text-2xl font-semibold text-gray-900">{user.referrals_count || 0}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Commitment History */}
      <div className="bg-white shadow rounded-lg mb-8">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Commitment History</h2>
          <p className="mt-1 text-sm text-gray-500">Weekly commitment performance</p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Week Start
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Commitment
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Completed
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Completion Rate
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {commitmentHistory.map((commitment) => (
                <tr key={commitment.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(commitment.week_start).toLocaleDateString()}
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
                          ? 'bg-green-100 text-green-800'
                          : commitment.completion_rate >= 75
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {commitment.completion_rate.toFixed(1)}%
                    </span>
                  </td>
                </tr>
              ))}
              {commitmentHistory.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                    No commitment history
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Workout History */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Workout History</h2>
          <p className="mt-1 text-sm text-gray-500">Recent workout sessions</p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Workout
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Duration
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {workoutHistory.slice(0, 20).map((workout) => (
                <tr key={workout.session_id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(workout.date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {workout.workout_title || 'Unknown Workout'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        workout.status === 'completed'
                          ? 'bg-green-100 text-green-800'
                          : workout.status === 'in_progress'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {workout.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {workout.total_duration_seconds
                      ? `${Math.floor(workout.total_duration_seconds / 60)} min`
                      : 'N/A'}
                  </td>
                </tr>
              ))}
              {workoutHistory.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                    No workout history
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

