'use client'

import {
  BarChart,
  Bar,
  XAxis,
  ResponsiveContainer,
  Tooltip,
  Cell,
  type TooltipProps,
} from 'recharts'
import type { MonthlyTotal } from '@/types'
import { Skeleton } from '@/components/ui/skeleton'

interface SpendingChartProps {
  data: MonthlyTotal[]
  currentMonth: string
  loading?: boolean
}

function formatMonthLabel(month: string): string {
  const [year, m] = month.split('-')
  const date = new Date(Number(year), Number(m) - 1, 1)
  return date.toLocaleString('en-US', { month: 'short' })
}

function CustomTooltip({ active, payload }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null
  const value = payload[0].value ?? 0
  return (
    <div
      className="rounded-md px-[5px] py-[2px] text-white font-mono"
      style={{ fontSize: 10, background: '#f0ebe3', color: '#1c1c1e' }}
    >
      ${Number(value).toLocaleString()}
    </div>
  )
}

export function SpendingChart({ data, currentMonth, loading = false }: SpendingChartProps) {
  if (loading) {
    return (
      <div
        className="rounded-xl bg-white p-5"
        style={{
          border: '1px solid rgba(28,28,30,0.08)',
          boxShadow: '0 1px 4px rgba(28,28,30,0.06), 0 2px 12px rgba(28,28,30,0.04)',
        }}
      >
        <Skeleton className="mb-1 h-5 w-40" />
        <Skeleton className="mb-5 h-4 w-56" />
        <Skeleton className="h-36 w-full" />
      </div>
    )
  }

  const chartData = data.map((d) => ({
    month: d.month,
    label: formatMonthLabel(d.month),
    value: parseFloat(d.total_spent),
  }))

  return (
    <div
      className="rounded-xl bg-white p-5"
      style={{
        border: '1px solid rgba(28,28,30,0.08)',
        boxShadow: '0 1px 4px rgba(28,28,30,0.06), 0 2px 12px rgba(28,28,30,0.04)',
      }}
    >
      <p className="text-[14px] font-semibold text-[#1c1c1e] mb-1">Monthly Spending</p>
      <p className="text-[12px] text-[#6b6560] mb-5">Your spend over the past 6 months</p>

      <ResponsiveContainer width="100%" height={140}>
        <BarChart data={chartData} barCategoryGap="30%">
          <defs>
            <linearGradient id="currentBarGradient" x1="0" y1="1" x2="0" y2="0">
              <stop offset="0%" stopColor="#65a380" />
              <stop offset="100%" stopColor="#86c9a0" />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="label"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 11, fontFamily: 'var(--font-mono)', fill: '#a09890' }}
          />
          <Tooltip content={<CustomTooltip />} cursor={false} />
          <Bar dataKey="value" radius={[5, 5, 0, 0]} minPointSize={4}>
            {chartData.map((entry) => (
              <Cell
                key={entry.month}
                fill={
                  entry.month === currentMonth
                    ? 'url(#currentBarGradient)'
                    : 'rgba(101,163,128,0.2)'
                }
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
