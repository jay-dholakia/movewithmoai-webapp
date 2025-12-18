'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { AdminService } from '@/lib/services/adminService'
import { ArrowLeft, Target, Users, TrendingUp, Calendar, Activity } from 'lucide-react'
import type { MoaiDetail } from '@/lib/types/admin'

export default function MoaiDetailPage() {
  const params = useParams()
  const router = useRouter()
  const moaiId = params.moaiId as string
  const [moai, setMoai] = useState<MoaiDetail | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (moaiId) {
      loadMoaiDetail()
    }
  }, [moaiId])

  const loadMoaiDetail = async () => {
    try {
      const moaiData = await AdminService.getMoaiDetail(moaiId)
      setMoai(moaiData)
    } catch (error) {
      console.error('Error loading Moai detail:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading Moai details...</p>
        </div>
      </div>
    )
  }

  if (!moai) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Moai not found</p>
        <button
          onClick={() => router.push('/admin/moais')}
          className="mt-4 text-blue-600 hover:text-blue-800"
        >
          Back to Moais
        </button>
      </div>
    )
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => router.push('/admin/moais')}
          className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="h-5 w-5 mr-2" />
          Back to Moais
        </button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{moai.name}</h1>
            <p className="mt-2 text-sm text-gray-600">
              Created by {moai.created_by_name || 'Unknown'} on{' '}
              {new Date(moai.created_at).toLocaleDateString()}
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <span
              className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                moai.status === 'active'
                  ? 'bg-green-100 text-green-800'
                  : moai.status === 'forming'
                  ? 'bg-yellow-100 text-yellow-800'
                  : 'bg-gray-100 text-gray-800'
              }`}
            >
              {moai.status}
            </span>
            {moai.has_coach && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800">
                Has Coach: {moai.coach_name || 'Unknown'}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-4 mb-8">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-blue-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Members</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {moai.member_count} / {moai.min_members}
                </p>
              </div>
            </div>
          </div>
        </div>
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <Activity className="h-8 w-8 text-green-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Workouts</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {moai.moai_workout_stats.completed_workouts} / {moai.moai_workout_stats.total_workouts}
                </p>
              </div>
            </div>
          </div>
        </div>
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <TrendingUp className="h-8 w-8 text-purple-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Completion Rate</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {moai.moai_workout_stats.average_completion_rate.toFixed(1)}%
                </p>
              </div>
            </div>
          </div>
        </div>
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <Calendar className="h-8 w-8 text-orange-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Weeks Active</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {moai.weeks_active}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Moai Commitment History */}
      <div className="bg-white shadow rounded-lg mb-8">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Moai Commitment History</h2>
          <p className="mt-1 text-sm text-gray-500">Aggregate commitment performance over time</p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Week Start
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Members
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Commitment
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
              {moai.moai_commitment_history.map((week, idx) => (
                <tr key={idx}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(week.week_start).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {week.member_count}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {week.total_commitment}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {week.total_completed}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        week.completion_rate >= 100
                          ? 'bg-green-100 text-green-800'
                          : week.completion_rate >= 75
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {week.completion_rate.toFixed(1)}%
                    </span>
                  </td>
                </tr>
              ))}
              {moai.moai_commitment_history.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                    No commitment history available
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Members List */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Members</h2>
          <p className="mt-1 text-sm text-gray-500">Individual member performance</p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Member
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Joined
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Current Week
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Overall Rate
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Workouts
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {moai.members.map((member) => (
                <tr key={member.user_id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        {member.profile_picture_url ? (
                          <img
                            className="h-10 w-10 rounded-full"
                            src={member.profile_picture_url}
                            alt={member.first_name || member.username || 'User'}
                          />
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                            <span className="text-gray-600 font-medium">
                              {(member.first_name?.[0] || member.username?.[0] || member.email[0]).toUpperCase()}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {member.first_name && member.last_name
                            ? `${member.first_name} ${member.last_name}`
                            : member.username || member.email}
                        </div>
                        {member.username && (
                          <div className="text-sm text-gray-500">@{member.username}</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(member.joined_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {member.current_week_completed} / {member.current_week_commitment}
                    </div>
                    <div className="text-xs text-gray-500">
                      {member.current_week_completion_rate.toFixed(1)}%
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        member.overall_completion_rate >= 100
                          ? 'bg-green-100 text-green-800'
                          : member.overall_completion_rate >= 75
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {member.overall_completion_rate.toFixed(1)}%
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {member.total_workouts}
                  </td>
                </tr>
              ))}
              {moai.members.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                    No members found
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

