'use client'

import { useEffect, useState } from 'react'

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']

interface StatusChartProps {
  data: Array<{ name: string; value: number }>
}

export default function StatusChart({ data }: StatusChartProps) {
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
    return <div className="h-[300px] flex items-center justify-center">Loading chart...</div>
  }

  const { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } = RechartsComponents

  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={({ name, percent }: any) => `${name}: ${(percent * 100).toFixed(0)}%`}
          outerRadius={100}
          fill="#8884d8"
          dataKey="value"
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip />
      </PieChart>
    </ResponsiveContainer>
  )
}
