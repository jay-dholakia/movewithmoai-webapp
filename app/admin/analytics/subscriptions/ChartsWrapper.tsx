'use client'

import StatusChart from './StatusChart'
import TrendsChart from './TrendsChart'
import SubscriptionsChart from './SubscriptionsChart'

interface ChartsWrapperProps {
  statusChartData: Array<{ name: string; value: number }>
  chartData: Array<{ period: string; Active: number; Total: number }>
}

export default function ChartsWrapper({ statusChartData, chartData }: ChartsWrapperProps) {
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

