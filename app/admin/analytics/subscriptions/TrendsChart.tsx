'use client'

import { useEffect, useState } from 'react'

interface TrendsChartProps {
  data: Array<{ period: string; Active: number; Total: number }>
}

export default function TrendsChart({ data }: TrendsChartProps) {
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

  const { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } = RechartsComponents

  return (
    <ResponsiveContainer width="100%" height={400}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="period" />
        <YAxis label={{ value: 'Count', angle: -90, position: 'insideLeft' }} />
        <Tooltip />
        <Legend />
        <Line
          type="monotone"
          dataKey="Active"
          stroke="#10b981"
          strokeWidth={2}
          dot={{ r: 4 }}
        />
        <Line
          type="monotone"
          dataKey="Total"
          stroke="#3b82f6"
          strokeWidth={2}
          dot={{ r: 4 }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
