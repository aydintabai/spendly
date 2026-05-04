'use client'

import type { AnalysisReport, TopCategory, DetectedSubscription, Anomaly } from '@/types'
import { CATEGORY_CONFIG, type CategoryName } from '@/constants/categories'
import { formatCurrency, formatDate, cn } from '@/lib/utils'
import { Separator } from '@/components/ui/separator'

interface AnalysisReportCardProps {
  report: AnalysisReport
  onDismiss: () => void
}

const SECTION_LABEL_STYLE: React.CSSProperties = { fontSize: 11, fontWeight: 600 }

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="mb-3 uppercase tracking-[0.05em] text-[#a09890]"
      style={SECTION_LABEL_STYLE}
    >
      {children}
    </p>
  )
}

function CategoryDot({ category }: { category: string }) {
  const color = CATEGORY_CONFIG[category as CategoryName]?.color ?? '#a09890'
  return (
    <span
      className="inline-block shrink-0 rounded-sm"
      style={{ width: 8, height: 8, background: color }}
    />
  )
}

function CategoryBadge({ category }: { category: string }) {
  const badgeClass = CATEGORY_CONFIG[category as CategoryName]?.badgeClass ?? 'bg-gray-100 text-gray-700'
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-medium', badgeClass)}>
      <CategoryDot category={category} />
      {category}
    </span>
  )
}

function DeltaBadge({ pct }: { pct: number | null }) {
  if (pct === null) return <span className="text-[12px] text-[#a09890]">N/A</span>
  const isDown = pct <= 0
  const bg = isDown ? 'rgba(34,197,94,0.12)' : 'rgba(244,63,94,0.12)'
  const color = isDown ? '#16a34a' : '#dc2626'
  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold"
      style={{ background: bg, color }}
    >
      {pct >= 0 ? '+' : ''}{pct.toFixed(1)}%
    </span>
  )
}

function TableWrapper({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse">{children}</table>
    </div>
  )
}

function Th({ children, right }: { children: React.ReactNode; right?: boolean }) {
  return (
    <th
      className={cn('pb-2 text-[#a09890] uppercase tracking-[0.05em]', right && 'text-right')}
      style={{ fontSize: 11, fontWeight: 600, borderBottom: '1px solid rgba(28,28,30,0.08)' }}
    >
      {children}
    </th>
  )
}

function Td({ children, right, className }: { children: React.ReactNode; right?: boolean; className?: string }) {
  return (
    <td
      className={cn('py-2 text-[13.5px]', right && 'text-right', className)}
      style={{ borderBottom: '1px solid rgba(28,28,30,0.06)' }}
    >
      {children}
    </td>
  )
}

function TopCategoriesSection({ categories }: { categories: TopCategory[] }) {
  return (
    <section>
      <SectionLabel>Top Categories</SectionLabel>
      <TableWrapper>
        <thead>
          <tr>
            <Th>Category</Th>
            <Th right>Amount</Th>
            <Th right>Share</Th>
            <Th right>Transactions</Th>
          </tr>
        </thead>
        <tbody>
          {categories.map((cat) => (
            <tr key={cat.category} className="transition-colors hover:bg-[#f0ebe3]">
              <Td><CategoryBadge category={cat.category} /></Td>
              <Td right className="font-mono text-[#1c1c1e]">{formatCurrency(cat.total)}</Td>
              <Td right className="text-[#6b6560]">{cat.percentage.toFixed(1)}%</Td>
              <Td right className="font-mono text-[#6b6560]">{cat.transaction_count}</Td>
            </tr>
          ))}
        </tbody>
      </TableWrapper>
    </section>
  )
}

function MomSection({ mom }: { mom: AnalysisReport['mom_changes'] }) {
  const breakdownEntries = Object.entries(mom.breakdown_b)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
  const hasBreakdown = breakdownEntries.length > 0

  return (
    <section>
      <SectionLabel>Month-over-Month</SectionLabel>
      <div className="flex items-center gap-6 mb-4">
        <div className="flex-1 rounded-lg px-4 py-3" style={{ background: 'rgba(28,28,30,0.03)', border: '1px solid rgba(28,28,30,0.06)' }}>
          <p className="text-[11px] uppercase tracking-[0.05em] text-[#a09890] mb-1" style={{ fontWeight: 600 }}>
            {mom.month_a}
          </p>
          <p className="font-mono text-[17px] font-semibold text-[#1c1c1e]">{formatCurrency(mom.total_a)}</p>
        </div>
        <div className="flex flex-col items-center gap-1">
          <DeltaBadge pct={mom.delta_pct} />
          {mom.delta_pct !== null && (
            <p className="text-[11px] text-[#6b6560]">
              {mom.delta_amount <= 0
                ? `saved ${formatCurrency(Math.abs(mom.delta_amount))}`
                : `${formatCurrency(Math.abs(mom.delta_amount))} more`}
            </p>
          )}
        </div>
        <div className="flex-1 rounded-lg px-4 py-3" style={{ background: 'rgba(28,28,30,0.03)', border: '1px solid rgba(28,28,30,0.06)' }}>
          <p className="text-[11px] uppercase tracking-[0.05em] text-[#a09890] mb-1" style={{ fontWeight: 600 }}>
            {mom.month_b}
          </p>
          <p className="font-mono text-[17px] font-semibold text-[#1c1c1e]">{formatCurrency(mom.total_b)}</p>
        </div>
      </div>
      {hasBreakdown && (
        <div>
          <p className="text-[11px] uppercase tracking-[0.05em] text-[#a09890] mb-2" style={{ fontWeight: 600 }}>
            Top categories this month
          </p>
          <div className="flex flex-col gap-1">
            {breakdownEntries.map(([cat, amt]) => (
              <div key={cat} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CategoryDot category={cat} />
                  <span className="text-[12px] text-[#6b6560]">{cat}</span>
                </div>
                <span className="font-mono text-[12px] text-[#1c1c1e]">{formatCurrency(amt)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}

function SubscriptionsSection({ subscriptions }: { subscriptions: DetectedSubscription[] }) {
  return (
    <section>
      <SectionLabel>Subscriptions Detected</SectionLabel>
      {subscriptions.length === 0 ? (
        <p className="text-[12px] text-[#a09890] py-2">No recurring subscriptions detected</p>
      ) : (
        <TableWrapper>
          <thead>
            <tr>
              <Th>Service</Th>
              <Th right>Est. Monthly</Th>
              <Th right>Last Seen</Th>
              <Th right>Months</Th>
            </tr>
          </thead>
          <tbody>
            {subscriptions.map((sub) => (
              <tr key={sub.merchant_name} className="transition-colors hover:bg-[#f0ebe3]">
                <Td className="font-medium text-[#1c1c1e]">{sub.merchant_name}</Td>
                <Td right className="font-mono text-[#1c1c1e]">{formatCurrency(sub.estimated_monthly_cost)}</Td>
                <Td right className="text-[#6b6560]">{formatDate(sub.last_seen)}</Td>
                <Td right className="font-mono text-[#6b6560]">{sub.months_detected} mo</Td>
              </tr>
            ))}
          </tbody>
        </TableWrapper>
      )}
    </section>
  )
}

function AnomaliesSection({ anomalies }: { anomalies: Anomaly[] }) {
  return (
    <section>
      <SectionLabel>Anomalies Flagged</SectionLabel>
      {anomalies.length === 0 ? (
        <p className="text-[12px] text-[#a09890] py-2">No spending anomalies detected</p>
      ) : (
        <TableWrapper>
          <thead>
            <tr>
              <Th>Merchant</Th>
              <Th right>Amount</Th>
              <Th>Category</Th>
              <Th right>Date</Th>
              <Th right>Z-Score</Th>
            </tr>
          </thead>
          <tbody>
            {anomalies.map((a) => (
              <tr key={a.id} className="transition-colors hover:bg-[#f0ebe3]">
                <Td className="font-medium text-[#1c1c1e]">{a.merchant_name}</Td>
                <Td right className="font-mono text-[#dc2626]">{formatCurrency(a.amount)}</Td>
                <Td><CategoryBadge category={a.category} /></Td>
                <Td right className="text-[#6b6560]">{formatDate(a.date)}</Td>
                <Td right className="font-mono text-[#1c1c1e]">
                  {a.z_score > 3 && <span className="mr-1 text-[#dc2626]">!</span>}
                  {a.z_score.toFixed(1)}
                </Td>
              </tr>
            ))}
          </tbody>
        </TableWrapper>
      )}
    </section>
  )
}

function RecommendationsSection({ recommendations }: { recommendations: string[] }) {
  return (
    <section>
      <SectionLabel>Recommendations</SectionLabel>
      <ol className="flex flex-col gap-3">
        {recommendations.map((rec, i) => (
          <li key={i} className="flex items-start gap-3">
            <span
              className="shrink-0 flex items-center justify-center rounded-full font-mono text-[#65a380]"
              style={{ width: 22, height: 22, background: 'rgba(101,163,128,0.15)', fontSize: 11, fontWeight: 700 }}
            >
              {i + 1}
            </span>
            <p className="text-[13.5px] text-[#1c1c1e] leading-relaxed pt-[2px]">{rec}</p>
          </li>
        ))}
      </ol>
    </section>
  )
}

export function AnalysisReportCard({ report, onDismiss }: AnalysisReportCardProps) {
  return (
    <div
      className="rounded-xl bg-white p-5"
      style={{
        border: '1px solid rgba(28,28,30,0.08)',
        boxShadow: '0 1px 4px rgba(28,28,30,0.06), 0 2px 12px rgba(28,28,30,0.04)',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-[15px] font-semibold text-[#1c1c1e]">AI Analysis</h2>
          <p className="text-[12px] text-[#6b6560] mt-0.5">Generated just now</p>
        </div>
        <button
          onClick={onDismiss}
          className="rounded-md px-2 py-1 text-[12px] font-medium text-[#6b6560] transition-colors hover:bg-[rgba(28,28,30,0.06)]"
        >
          Dismiss
        </button>
      </div>

      {/* Monthly Summary */}
      <section>
        <SectionLabel>Monthly Summary</SectionLabel>
        <p className="text-[13.5px] text-[#1c1c1e] leading-relaxed">{report.monthly_summary}</p>
      </section>

      <Separator className="my-5" />
      <TopCategoriesSection categories={report.top_categories} />

      <Separator className="my-5" />
      <MomSection mom={report.mom_changes} />

      <Separator className="my-5" />
      <SubscriptionsSection subscriptions={report.subscriptions} />

      <Separator className="my-5" />
      <AnomaliesSection anomalies={report.anomalies} />

      <Separator className="my-5" />
      <RecommendationsSection recommendations={report.recommendations} />
    </div>
  )
}
