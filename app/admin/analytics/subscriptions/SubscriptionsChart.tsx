'use client'

import { useEffect, useState, type ReactElement } from 'react'

interface SubscriptionsChartProps {
  data: Array<{ period: string; Total: number }>
}

export default function SubscriptionsChart({ data }: SubscriptionsChartProps) {
  const [Chart, setChart] = useState<ReactElement | null>(null)

  useEffect(() => {
    // Runtime import - only loads when component mounts (client-side)
    import('recharts').then((recharts) => {
      const { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } = recharts
      setChart(
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="period" />
            <YAxis label={{ value: 'New Subscriptions', angle: -90, position: 'insideLeft' }} />
            <Tooltip />
            <Legend />
            <Bar dataKey="Total" fill="#3b82f6" />
          </BarChart>
        </ResponsiveContainer>
      )
    })
  }, [data])

  if (!Chart) {
    return <div className="h-[400px] flex items-center justify-center">Loading chart...</div>
  }

  return Chart
}
