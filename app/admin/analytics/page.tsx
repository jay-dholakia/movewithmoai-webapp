'use client'

import { useEffect, useState } from 'react'
import { AdminService } from '@/lib/services/adminService'
import { ArrowLeft, Users, Target, TrendingUp, UsersRound, UserCheck, Dumbbell, Network } from 'lucide-react'
import Link from 'next/link'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ComposedChart } from 'recharts'

export default function AnalyticsOverviewPage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const analytics = await AdminService.getAnalyticsOverview()
      setData(analytics)
    } catch (error) {
      console.error('Error loading analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatMonth = (month: string) => {
    const [year, monthNum] = month.split('-')
    const date = new Date(parseInt(year), parseInt(monthNum) - 1)
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading analytics...</p>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-gray-600">Failed to load analytics</p>
        </div>
      </div>
    )
  }

  const { overview, timeSeries } = data

  // Prepare chart data
  const chartData = timeSeries.map((item: any) => ({
    period: formatMonth(item.month),
    'Total Users': item.users,
    'Users with Commitments': item.usersWithCommitments,
    'Users Who Hit Commitment': item.usersWhoHitCommitment,
    'Avg Workouts per Active User': item.avgWorkouts,
    'Moais Created': item.moaisCreated,
    'Avg Member Size': item.avgMemberSize,
    'Coach-Led Moais': item.coachLedMoais,
  }))

  // Calculate cumulative totals for users and moais
  const cumulativeData = chartData.map((d: any, i: number) => ({
    ...d,
    'Cumulative Users': chartData.slice(0, i + 1).reduce((sum: number, item: any) => sum + item['Total Users'], 0),
    'Cumulative Moais': chartData.slice(0, i + 1).reduce((sum: number, item: any) => sum + item['Moais Created'], 0),
  }))

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <Link
          href="/admin"
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Link>
        <h1 className="text-3xl font-bold text-gray-900">Analytics Overview</h1>
        <p className="mt-2 text-sm text-gray-600">
          Comprehensive metrics and trends for users, commitments, workouts, and Moais
        </p>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Total Users */}
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Users</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{overview.totalUsers.toLocaleString()}</p>
            </div>
            <div className="bg-blue-100 rounded-full p-3">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        {/* Users with Commitments */}
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Users with Commitments</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{overview.totalUsersWithCommitments.toLocaleString()}</p>
              <p className="text-xs text-gray-500 mt-1">
                {overview.totalUsers > 0 
                  ? `${Math.round((overview.totalUsersWithCommitments / overview.totalUsers) * 100)}% of users`
                  : '0%'}
              </p>
            </div>
            <div className="bg-green-100 rounded-full p-3">
              <Target className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        {/* Users Who Hit Commitment */}
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Users Who Hit Commitment</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{overview.totalUsersWhoHitCommitment.toLocaleString()}</p>
              <p className="text-xs text-gray-500 mt-1">
                {overview.totalUsersWithCommitments > 0
                  ? `${Math.round((overview.totalUsersWhoHitCommitment / overview.totalUsersWithCommitments) * 100)}% completion rate`
                  : '0%'}
              </p>
            </div>
            <div className="bg-purple-100 rounded-full p-3">
              <UserCheck className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </div>

        {/* Avg Workouts per Active User */}
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Avg Workouts/Active User</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{overview.avgWorkoutsPerActiveUser.toFixed(1)}</p>
              <p className="text-xs text-gray-500 mt-1">Last 30 days</p>
            </div>
            <div className="bg-orange-100 rounded-full p-3">
              <Dumbbell className="h-6 w-6 text-orange-600" />
            </div>
          </div>
        </div>

        {/* Total Moais */}
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Moais Created</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{overview.totalMoais.toLocaleString()}</p>
            </div>
            <div className="bg-indigo-100 rounded-full p-3">
              <Network className="h-6 w-6 text-indigo-600" />
            </div>
          </div>
        </div>

        {/* Avg Member Size */}
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Avg Member Size per Moai</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{overview.avgMemberSizePerMoai.toFixed(1)}</p>
              <p className="text-xs text-gray-500 mt-1">Members per Moai</p>
            </div>
            <div className="bg-teal-100 rounded-full p-3">
              <UsersRound className="h-6 w-6 text-teal-600" />
            </div>
          </div>
        </div>

        {/* Coach-Led Moais */}
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Coach-Led Moais</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{overview.totalCoachLedMoais.toLocaleString()}</p>
              <p className="text-xs text-gray-500 mt-1">
                {overview.totalMoais > 0
                  ? `${Math.round((overview.totalCoachLedMoais / overview.totalMoais) * 100)}% of Moais`
                  : '0%'}
              </p>
            </div>
            <div className="bg-pink-100 rounded-full p-3">
              <TrendingUp className="h-6 w-6 text-pink-600" />
            </div>
          </div>
        </div>
      </div>

      {/* User Metrics Over Time */}
      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          User Metrics Over Time
        </h2>
        <ResponsiveContainer width="100%" height={400}>
          <ComposedChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="period" />
            <YAxis yAxisId="left" label={{ value: 'Count', angle: -90, position: 'insideLeft' }} />
            <YAxis yAxisId="right" orientation="right" label={{ value: 'Avg Workouts', angle: 90, position: 'insideRight' }} />
            <Tooltip />
            <Legend />
            <Bar yAxisId="left" dataKey="Total Users" fill="#3b82f6" name="New Users" />
            <Bar yAxisId="left" dataKey="Users with Commitments" fill="#10b981" name="Users with Commitments" />
            <Bar yAxisId="left" dataKey="Users Who Hit Commitment" fill="#8b5cf6" name="Users Who Hit Commitment" />
            <Line yAxisId="right" type="monotone" dataKey="Avg Workouts per Active User" stroke="#f97316" strokeWidth={2} name="Avg Workouts/Active User" />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Cumulative User Growth */}
      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Cumulative User Growth
        </h2>
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={cumulativeData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="period" />
            <YAxis label={{ value: 'Total Users', angle: -90, position: 'insideLeft' }} />
            <Tooltip />
            <Legend />
            <Line
              type="monotone"
              dataKey="Cumulative Users"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Moai Metrics Over Time */}
      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Moai Metrics Over Time
        </h2>
        <ResponsiveContainer width="100%" height={400}>
          <ComposedChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="period" />
            <YAxis yAxisId="left" label={{ value: 'Count', angle: -90, position: 'insideLeft' }} />
            <YAxis yAxisId="right" orientation="right" label={{ value: 'Avg Size', angle: 90, position: 'insideRight' }} />
            <Tooltip />
            <Legend />
            <Bar yAxisId="left" dataKey="Moais Created" fill="#6366f1" name="Moais Created" />
            <Bar yAxisId="left" dataKey="Coach-Led Moais" fill="#ec4899" name="Coach-Led Moais" />
            <Line yAxisId="right" type="monotone" dataKey="Avg Member Size" stroke="#14b8a6" strokeWidth={2} name="Avg Member Size" />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Cumulative Moai Growth */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Cumulative Moai Growth
        </h2>
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={cumulativeData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="period" />
            <YAxis label={{ value: 'Total Moais', angle: -90, position: 'insideLeft' }} />
            <Tooltip />
            <Legend />
            <Line
              type="monotone"
              dataKey="Cumulative Moais"
              stroke="#6366f1"
              strokeWidth={2}
              dot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
