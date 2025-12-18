'use client'

import { useEffect, useState } from 'react'
import { AdminService } from '@/lib/services/adminService'
import { ArrowLeft, TrendingUp } from 'lucide-react'
import Link from 'next/link'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

export default function CommitmentAnalyticsPage() {
  const [weeklyData, setWeeklyData] = useState<any[]>([])
  const [monthlyData, setMonthlyData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [timeframe, setTimeframe] = useState<'week' | 'month'>('week')

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const analytics = await AdminService.getCommitmentAnalytics()
      setWeeklyData(analytics.weekly)
      setMonthlyData(analytics.monthly)
    } catch (error) {
      console.error('Error loading commitment analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatWeekLabel = (weekStart: string) => {
    const date = new Date(weekStart)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  const formatMonthLabel = (month: string) => {
    const [year, monthNum] = month.split('-')
    const date = new Date(parseInt(year), parseInt(monthNum) - 1)
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
  }

  const chartData = timeframe === 'week' 
    ? weeklyData.map((d) => ({
        period: formatWeekLabel(d.week_start),
        'Commitment %': Number(d.percentage.toFixed(1)),
        Committed: d.committed,
        Completed: d.completed,
      }))
    : monthlyData.map((d) => ({
        period: formatMonthLabel(d.month),
        'Commitment %': Number(d.percentage.toFixed(1)),
        Committed: d.committed,
        Completed: d.completed,
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
        <h1 className="text-3xl font-bold text-gray-900">Commitment Analytics</h1>
        <p className="mt-2 text-sm text-gray-600">
          Track commitment percentage trends over time
        </p>
      </div>

      {/* Timeframe Toggle */}
      <div className="mb-6">
        <div className="inline-flex rounded-md shadow-sm" role="group">
          <button
            type="button"
            onClick={() => setTimeframe('week')}
            className={`px-4 py-2 text-sm font-medium rounded-l-lg border ${
              timeframe === 'week'
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
            }`}
          >
            By Week
          </button>
          <button
            type="button"
            onClick={() => setTimeframe('month')}
            className={`px-4 py-2 text-sm font-medium rounded-r-lg border-t border-r border-b ${
              timeframe === 'month'
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
            }`}
          >
            By Month
          </button>
        </div>
      </div>

      {/* Chart */}
      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Commitment Percentage Over Time
        </h2>
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="period" />
            <YAxis label={{ value: 'Percentage (%)', angle: -90, position: 'insideLeft' }} />
            <Tooltip />
            <Legend />
            <Line
              type="monotone"
              dataKey="Commitment %"
              stroke="#14b8a6"
              strokeWidth={2}
              dot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Volume Chart */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Committed vs Completed Workouts
        </h2>
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="period" />
            <YAxis label={{ value: 'Count', angle: -90, position: 'insideLeft' }} />
            <Tooltip />
            <Legend />
            <Line
              type="monotone"
              dataKey="Committed"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={{ r: 4 }}
            />
            <Line
              type="monotone"
              dataKey="Completed"
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


