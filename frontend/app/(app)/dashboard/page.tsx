'use client'

import { useMemo, useState, useRef, useEffect } from 'react'
import { StatCard } from '@/components/dashboard/StatCard'
import { SpendingChart } from '@/components/dashboard/SpendingChart'
import { CategoryDonut } from '@/components/dashboard/CategoryDonut'
import { RecentTransactions } from '@/components/dashboard/RecentTransactions'
import { AnalysisReportCard } from '@/components/dashboard/AnalysisReport'
import {
  useDashboardSummary,
  useCategoryBreakdown,
  useMonthlyHistory,
  useRecentTransactions,
  useAnalysis,
} from '@/hooks/useDashboard'
import { formatCurrency, cn } from '@/lib/utils'

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

  const { mutate: runAnalysis, isPending, isSuccess, isError, data: report, reset } = useAnalysis()
  const [dismissed, setDismissed] = useState(false)
  const reportRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isSuccess && report && !dismissed) {
      reportRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [isSuccess, report, dismissed])

  function handleRunAnalysis() {
    setDismissed(false)
    runAnalysis()
  }

  function handleDismiss() {
    setDismissed(true)
    reset()
  }

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
      <div className="px-8 mb-6 flex items-start justify-between">
        <div>
          <h1
            className="text-[#1c1c1e]"
            style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.4px' }}
          >
            Dashboard
          </h1>
          <p className="text-[13px] text-[#6b6560] mt-0.5">{formatMonthLabel(currentMonth)}</p>
        </div>

        <div className="flex flex-col items-end gap-1">
          <button
            onClick={handleRunAnalysis}
            disabled={isPending}
            className={cn(
              'flex items-center gap-2 rounded-lg px-3 py-[7px] text-[13px] font-medium transition-all',
              isPending
                ? 'cursor-not-allowed bg-[rgba(101,163,128,0.1)] text-[#65a380]'
                : 'bg-[#65a380] text-white hover:bg-[#5a9271] active:bg-[#4f8264]',
            )}
            style={{ boxShadow: isPending ? 'none' : '0 2px 8px rgba(101,163,128,0.25)' }}
          >
            {isPending ? (
              <>
                <svg className="animate-spin" width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.3" />
                  <path d="M7 1.5A5.5 5.5 0 0112.5 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
                Analyzing…
              </>
            ) : (
              <>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M7 1l1.5 4H13l-3.5 2.5L11 12 7 9.5 3 12l1.5-4.5L1 5h4.5L7 1z" fill="currentColor" fillOpacity="0.9" />
                </svg>
                Run AI Analysis
              </>
            )}
          </button>
          {isError && (
            <p className="text-[11px] text-[#dc2626]">Analysis failed — please try again</p>
          )}
        </div>
      </div>

      {/* Analysis loading banner */}
      {isPending && (
        <div className="px-8 mb-6">
          <div
            className="flex items-center gap-3 rounded-xl px-4 py-3"
            style={{ background: 'rgba(101,163,128,0.08)', border: '1px solid rgba(101,163,128,0.2)' }}
          >
            <svg className="animate-spin shrink-0 text-[#65a380]" width="14" height="14" viewBox="0 0 14 14" fill="none">
              <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.3" />
              <path d="M7 1.5A5.5 5.5 0 0112.5 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <div>
              <p className="text-[13px] font-medium text-[#1c1c1e]">Running AI analysis…</p>
              <p className="text-[11px] text-[#6b6560] mt-0.5">
                Analyzing your spending patterns, detecting subscriptions, and flagging anomalies. This takes 10–20 seconds.
              </p>
            </div>
          </div>
        </div>
      )}

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

      {/* AI Analysis Report */}
      {isSuccess && report && !dismissed && (
        <div ref={reportRef} className="px-8 mt-6 pb-7">
          <AnalysisReportCard report={report} onDismiss={handleDismiss} />
        </div>
      )}
    </div>
  )
}
