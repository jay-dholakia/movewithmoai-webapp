'use client'

import { useEffect, useState } from 'react'
import { AdminService } from '@/lib/services/adminService'
import { ArrowLeft, Users, Target, TrendingUp, UsersRound, UserCheck, Dumbbell, Network, Globe } from 'lucide-react'
import Link from 'next/link'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ComposedChart } from 'recharts'

export default function AnalyticsOverviewPage() {
  const [data, setData] = useState<any>(null)
  const [locations, setLocations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [userTimeframe, setUserTimeframe] = useState<'week' | 'month'>('week')

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [analytics, locationData] = await Promise.all([
        AdminService.getAnalyticsOverview(),
        AdminService.getUserLocations(),
      ])
      setData(analytics)
      setLocations(locationData)
    } catch (error) {
      console.error('Error loading analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatWeek = (weekStart: string) => {
    const date = new Date(weekStart)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
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

  const { overview, weekly, monthly } = data

  // Prepare user metrics chart data based on timeframe
  const userChartData = (userTimeframe === 'week' ? weekly : monthly).map((item: any) => ({
    period: userTimeframe === 'week' ? formatWeek(item.period) : formatMonth(item.period),
    'New Users': item.users,
    'Users with Commitments': item.usersWithCommitments,
    'Users Who Hit Commitment': item.usersWhoHitCommitment,
  }))

  // Prepare Moai chart data (always monthly)
  const moaiChartData = monthly.map((item: any) => ({
    period: formatMonth(item.period),
    'Moais Created': item.moaisCreated,
    'Avg Member Size': item.avgMemberSize,
    'Coach-Led Moais': item.coachLedMoais,
  }))

  // Calculate cumulative totals
  const cumulativeUserData = userChartData.map((d: any, i: number) => ({
    ...d,
    'Cumulative Users': userChartData.slice(0, i + 1).reduce((sum: number, item: any) => sum + item['New Users'], 0),
  }))

  const cumulativeMoaiData = moaiChartData.map((d: any, i: number) => ({
    ...d,
    'Cumulative Moais': moaiChartData.slice(0, i + 1).reduce((sum: number, item: any) => sum + item['Moais Created'], 0),
  }))

  // Get max user count for heatmap intensity
  const maxUserCount = locations.length > 0 ? Math.max(...locations.map((l: any) => l.userCount)) : 1

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
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">
            User Metrics Over Time
          </h2>
          <div className="inline-flex rounded-md shadow-sm" role="group">
            <button
              type="button"
              onClick={() => setUserTimeframe('week')}
              className={`px-4 py-2 text-sm font-medium rounded-l-lg border ${
                userTimeframe === 'week'
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              Weekly
            </button>
            <button
              type="button"
              onClick={() => setUserTimeframe('month')}
              className={`px-4 py-2 text-sm font-medium rounded-r-lg border-t border-r border-b ${
                userTimeframe === 'month'
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              Monthly
            </button>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={userChartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="period" angle={-45} textAnchor="end" height={80} />
            <YAxis label={{ value: 'Count', angle: -90, position: 'insideLeft' }} />
            <Tooltip />
            <Legend />
            <Bar dataKey="New Users" fill="#3b82f6" name="New Users" />
            <Bar dataKey="Users with Commitments" fill="#10b981" name="Users with Commitments" />
            <Bar dataKey="Users Who Hit Commitment" fill="#8b5cf6" name="Users Who Hit Commitment" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Cumulative User Growth */}
      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Cumulative User Growth
        </h2>
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={cumulativeUserData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="period" angle={-45} textAnchor="end" height={80} />
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

      {/* World Heatmap */}
      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <div className="flex items-center mb-4">
          <Globe className="h-5 w-5 text-gray-600 mr-2" />
          <h2 className="text-lg font-semibold text-gray-900">
            User Distribution by Country
          </h2>
        </div>
        {locations.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-96 overflow-y-auto">
            {locations.map((location: any, index: number) => {
              const intensity = maxUserCount > 0 ? location.userCount / maxUserCount : 0
              const bgIntensity = Math.max(0.1, intensity)
              return (
                <div
                  key={location.country}
                  className="p-4 border rounded-lg hover:shadow-md transition-shadow"
                  style={{
                    backgroundColor: `rgba(59, 130, 246, ${bgIntensity * 0.2})`,
                    borderColor: `rgba(59, 130, 246, ${bgIntensity * 0.5})`,
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-gray-900">{location.country}</h3>
                      <p className="text-sm text-gray-600 mt-1">
                        {location.userCount} {location.userCount === 1 ? 'user' : 'users'}
                      </p>
                      {location.cityCount > 0 && (
                        <p className="text-xs text-gray-500 mt-1">
                          {location.cityCount} {location.cityCount === 1 ? 'city' : 'cities'}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <div
                        className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold"
                        style={{
                          backgroundColor: `rgba(59, 130, 246, ${Math.min(1, intensity * 0.8 + 0.2)})`,
                        }}
                      >
                        {location.userCount}
                      </div>
                    </div>
                  </div>
                  {location.cities && location.cities.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-gray-200">
                      <p className="text-xs text-gray-500">
                        Top cities: {location.cities.slice(0, 3).join(', ')}
                        {location.cities.length > 3 && ` +${location.cities.length - 3} more`}
                      </p>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        ) : (
          <p className="text-gray-500 text-center py-8">No location data available</p>
        )}
      </div>

      {/* Moai Metrics Over Time */}
      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Moai Metrics Over Time
        </h2>
        <ResponsiveContainer width="100%" height={400}>
          <ComposedChart data={moaiChartData}>
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
          <LineChart data={cumulativeMoaiData}>
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
