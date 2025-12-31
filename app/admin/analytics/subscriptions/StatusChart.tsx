'use client'

import { useEffect, useState, type ReactElement } from 'react'

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']

interface StatusChartProps {
  data: Array<{ name: string; value: number }>
}

export default function StatusChart({ data }: StatusChartProps) {
  const [Chart, setChart] = useState<ReactElement | null>(null)

  useEffect(() => {
    // Runtime import - only loads when component mounts (client-side)
    import('recharts').then((recharts) => {
      const { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } = recharts
      setChart(
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
    })
  }, [data])

  if (!Chart) {
    return <div className="h-[300px] flex items-center justify-center">Loading chart...</div>
  }

  return Chart
}
