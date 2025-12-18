'use client'

import { useEffect, useState } from 'react'
import { AdminService } from '@/lib/services/adminService'
import { ArrowLeft, Users } from 'lucide-react'
import Link from 'next/link'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

export default function UserAnalyticsPage() {
  const [dailyData, setDailyData] = useState<any[]>([])
  const [weeklyData, setWeeklyData] = useState<any[]>([])
  const [monthlyData, setMonthlyData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [timeframe, setTimeframe] = useState<'daily' | 'weekly' | 'monthly'>('monthly')

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const analytics = await AdminService.getUserAnalytics()
      setDailyData(analytics.daily)
      setWeeklyData(analytics.weekly)
      setMonthlyData(analytics.monthly)
    } catch (error) {
      console.error('Error loading user analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  const formatMonth = (month: string) => {
    const [year, monthNum] = month.split('-')
    const date = new Date(parseInt(year), parseInt(monthNum) - 1)
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
  }

  const getChartData = () => {
    switch (timeframe) {
      case 'daily':
        return dailyData.map((d) => ({
          period: formatDate(d.date),
          'New Users': d.count,
        }))
      case 'weekly':
        return weeklyData.map((d) => ({
          period: formatDate(d.week_start),
          'New Users': d.count,
        }))
      case 'monthly':
        return monthlyData.map((d) => ({
          period: formatMonth(d.month),
          'New Users': d.count,
        }))
    }
  }

  const chartData = getChartData()

  // Calculate cumulative totals
  const cumulativeData = chartData.map((d, i) => ({
    ...d,
    'Total Users': chartData.slice(0, i + 1).reduce((sum, item) => sum + item['New Users'], 0),
  }))

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

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="mb-6">
        <Link
          href="/admin"
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Link>
        <h1 className="text-3xl font-bold text-gray-900">User Analytics</h1>
        <p className="mt-2 text-sm text-gray-600">
          Track user growth and registration trends
        </p>
      </div>

      {/* Timeframe Toggle */}
      <div className="mb-6">
        <div className="inline-flex rounded-md shadow-sm" role="group">
          <button
            type="button"
            onClick={() => setTimeframe('daily')}
            className={`px-4 py-2 text-sm font-medium rounded-l-lg border ${
              timeframe === 'daily'
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
            }`}
          >
            Daily
          </button>
          <button
            type="button"
            onClick={() => setTimeframe('weekly')}
            className={`px-4 py-2 text-sm font-medium border-t border-b ${
              timeframe === 'weekly'
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
            }`}
          >
            Weekly
          </button>
          <button
            type="button"
            onClick={() => setTimeframe('monthly')}
            className={`px-4 py-2 text-sm font-medium rounded-r-lg border-t border-r border-b ${
              timeframe === 'monthly'
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
            }`}
          >
            Monthly
          </button>
        </div>
      </div>

      {/* New Users Chart */}
      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          New User Registrations
        </h2>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="period" />
            <YAxis label={{ value: 'New Users', angle: -90, position: 'insideLeft' }} />
            <Tooltip />
            <Legend />
            <Bar dataKey="New Users" fill="#3b82f6" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Cumulative Growth Chart */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Total User Growth
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
              dataKey="Total Users"
              stroke="#10b981"
              strokeWidth={2}
              dot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}


