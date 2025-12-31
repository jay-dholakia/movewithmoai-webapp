'use client'

import { useEffect, useState } from 'react'

interface SubscriptionsChartProps {
  data: Array<{ period: string; Total: number }>
}

export default function SubscriptionsChart({ data }: SubscriptionsChartProps) {
  const [mounted, setMounted] = useState(false)
  const [RechartsComponents, setRechartsComponents] = useState<any>(null)

  useEffect(() => {
    setMounted(true)
    // Dynamic import only after mount
    import('recharts').then((recharts) => {
      setRechartsComponents(recharts)
    })
  }, [])

  if (!mounted || !RechartsComponents) {
    return <div className="h-[400px] flex items-center justify-center">Loading chart...</div>
  }

  const { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } = RechartsComponents

  return (
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
}
