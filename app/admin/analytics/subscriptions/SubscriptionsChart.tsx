'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

interface SubscriptionsChartProps {
  data: Array<{ period: string; Total: number }>
}

export default function SubscriptionsChart({ data }: SubscriptionsChartProps) {
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

