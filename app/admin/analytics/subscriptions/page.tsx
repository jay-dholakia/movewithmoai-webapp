'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { AdminService } from '@/lib/services/adminService'
import { ArrowLeft, Activity } from 'lucide-react'
import Link from 'next/link'

// Dynamically import chart components with SSR disabled
const StatusChart = dynamic(() => import('./charts').then(mod => ({ default: mod.StatusChart })), { 
  ssr: false,
  loading: () => <div className="h-[300px] flex items-center justify-center">Loading chart...</div>
})
const TrendsChart = dynamic(() => import('./charts').then(mod => ({ default: mod.TrendsChart })), { 
  ssr: false,
  loading: () => <div className="h-[400px] flex items-center justify-center">Loading chart...</div>
})
const SubscriptionsChart = dynamic(() => import('./charts').then(mod => ({ default: mod.SubscriptionsChart })), { 
  ssr: false,
  loading: () => <div className="h-[400px] flex items-center justify-center">Loading chart...</div>
})

export default function SubscriptionAnalyticsPage() {
  const [dailyData, setDailyData] = useState<any[]>([])
  const [monthlyData, setMonthlyData] = useState<any[]>([])
  const [byStatus, setByStatus] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [timeframe, setTimeframe] = useState<'daily' | 'monthly'>('monthly')

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const analytics = await AdminService.getSubscriptionAnalytics()
      setDailyData(analytics.daily)
      setMonthlyData(analytics.monthly)
      setByStatus(analytics.byStatus)
    } catch (error) {
      console.error('Error loading subscription analytics:', error)
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

  const chartData = timeframe === 'daily'
    ? dailyData.map((d) => ({
        period: formatDate(d.date),
        Active: d.active,
        Total: d.total,
      }))
    : monthlyData.map((d) => ({
        period: formatMonth(d.month),
        Active: d.active,
        Total: d.total,
      }))

  const statusChartData = Object.entries(byStatus).map(([status, count]) => ({
    name: status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' '),
    value: count,
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
        <h1 className="text-3xl font-bold text-gray-900">Subscription Analytics</h1>
        <p className="mt-2 text-sm text-gray-600">
          Track subscription trends and status distribution
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

      {/* Status Distribution */}
      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Subscription Status Distribution
        </h2>
        <StatusChart data={statusChartData} />
      </div>

      {/* Subscription Trends */}
      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Subscription Trends Over Time
        </h2>
        <TrendsChart data={chartData} />
      </div>

      {/* New Subscriptions */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          New Subscriptions Created
        </h2>
        <SubscriptionsChart data={chartData} />
      </div>
    </div>
  )
}


