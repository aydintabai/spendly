'use client'

import { useMemo } from 'react'
import { StatCard } from '@/components/dashboard/StatCard'
import { SpendingChart } from '@/components/dashboard/SpendingChart'
import { CategoryDonut } from '@/components/dashboard/CategoryDonut'
import { RecentTransactions } from '@/components/dashboard/RecentTransactions'
import {
  useDashboardSummary,
  useCategoryBreakdown,
  useMonthlyHistory,
  useRecentTransactions,
} from '@/hooks/useDashboard'
import { formatCurrency } from '@/lib/utils'

function getCurrentMonth(): string {
  return new Date().toISOString().slice(0, 7)
}

function formatMonthLabel(month: string): string {
  const [year, m] = month.split('-')
  return new Date(Number(year), Number(m) - 1, 1).toLocaleString('en-US', {
    month: 'long',
    year: 'numeric',
  })
}

export default function DashboardPage() {
  const currentMonth = useMemo(() => getCurrentMonth(), [])

  const { data: summary, isLoading: summaryLoading } = useDashboardSummary(currentMonth)
  const { data: categories, isLoading: catLoading } = useCategoryBreakdown(currentMonth)
  const { data: monthly, isLoading: monthlyLoading } = useMonthlyHistory(6)
  const { data: recent, isLoading: recentLoading } = useRecentTransactions()

  const momPct = summary?.mom_change_pct ?? null
  const momBadge = momPct !== null
    ? {
        text: `${momPct >= 0 ? '+' : ''}${momPct.toFixed(1)}% vs last month`,
        variant: (momPct <= 0 ? 'green' : 'red') as 'green' | 'red',
      }
    : undefined

  const totalSpent = summary ? formatCurrency(summary.total_spent) : '—'
  const topCategory = summary?.top_category ?? '—'
  const txCount = summary ? String(summary.transaction_count) : '—'
  const momValue = momPct !== null ? `${momPct >= 0 ? '+' : ''}${momPct.toFixed(1)}%` : '—'

  return (
    <div className="py-7">
      {/* Page header */}
      <div className="px-8 mb-6">
        <h1
          className="text-[#1c1c1e]"
          style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.4px' }}
        >
          Dashboard
        </h1>
        <p className="text-[13px] text-[#6b6560] mt-0.5">{formatMonthLabel(currentMonth)}</p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-4 px-8 mb-6">
        <StatCard
          label="Total Spent"
          value={totalSpent}
          sub="this month"
          badge={momBadge}
          glowColor="#65a380"
          loading={summaryLoading}
        />
        <StatCard
          label="Biggest Category"
          value={topCategory}
          sub="highest spending"
          glowColor="#a855f7"
          loading={summaryLoading}
        />
        <StatCard
          label="Transactions"
          value={txCount}
          sub="this month"
          glowColor="#22d4b3"
          loading={summaryLoading}
        />
        <StatCard
          label="Month-over-Month"
          value={momValue}
          sub="vs last month"
          badge={
            momPct !== null
              ? {
                  text: momPct <= 0 ? 'less spending' : 'more spending',
                  variant: momPct <= 0 ? 'green' : 'red',
                }
              : undefined
          }
          glowColor="#f97316"
          loading={summaryLoading}
        />
      </div>

      {/* Charts row */}
      <div
        className="grid px-8 mb-6"
        style={{ gridTemplateColumns: '1.3fr 1fr', gap: 16 }}
      >
        <SpendingChart
          data={monthly ?? []}
          currentMonth={currentMonth}
          loading={monthlyLoading}
        />
        <CategoryDonut
          data={categories ?? []}
          totalSpent={summary?.total_spent ?? '0'}
          loading={catLoading}
        />
      </div>

      {/* Recent transactions */}
      <div className="px-8">
        <RecentTransactions
          transactions={recent?.items ?? []}
          loading={recentLoading}
        />
      </div>
    </div>
  )
}
