'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'

// Only import charts after component mounts (client-side only)
const StatusChart = dynamic(() => import('./StatusChart'), { 
  ssr: false,
  loading: () => <div className="h-[300px] flex items-center justify-center">Loading chart...</div>
})
const TrendsChart = dynamic(() => import('./TrendsChart'), { 
  ssr: false,
  loading: () => <div className="h-[400px] flex items-center justify-center">Loading chart...</div>
})
const SubscriptionsChart = dynamic(() => import('./SubscriptionsChart'), { 
  ssr: false,
  loading: () => <div className="h-[400px] flex items-center justify-center">Loading chart...</div>
})

interface ChartsWrapperProps {
  statusChartData: Array<{ name: string; value: number }>
  chartData: Array<{ period: string; Active: number; Total: number }>
}

export default function ChartsWrapper({ statusChartData, chartData }: ChartsWrapperProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <>
        <div className="h-[300px] flex items-center justify-center">Loading charts...</div>
        <div className="h-[400px] flex items-center justify-center">Loading charts...</div>
        <div className="h-[400px] flex items-center justify-center">Loading charts...</div>
      </>
    )
  }

  return (
    <>
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
    </>
  )
}

