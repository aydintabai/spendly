'use client'

import Link from 'next/link'
import type { Transaction } from '@/types'
import { CATEGORY_CONFIG } from '@/constants/categories'
import { formatCurrency } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'

interface RecentTransactionsProps {
  transactions: Transaction[]
  loading?: boolean
}

function CategoryBadge({ category }: { category: string }) {
  const key = category as keyof typeof CATEGORY_CONFIG
  const config = CATEGORY_CONFIG[key]
  const badgeClass = config?.badgeClass ?? 'bg-gray-100 text-gray-700'

  return (
    <span
      className={cn('inline-flex rounded-full px-[9px] py-[3px]', badgeClass)}
      style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.01em' }}
    >
      {category}
    </span>
  )
}

function formatTransactionDate(dateStr: string): string {
  const normalized = dateStr.length === 10 ? `${dateStr}T00:00:00` : dateStr
  const date = new Date(normalized)
  if (isNaN(date.getTime())) return dateStr
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function RecentTransactions({ transactions, loading = false }: RecentTransactionsProps) {
  return (
    <div>
      {/* Section header */}
      <div className="flex items-center justify-between mb-[14px]">
        <h2 className="text-[15px] font-semibold text-[#1c1c1e]">Recent Transactions</h2>
        <Link
          href="/transactions"
          className="rounded-md px-2 py-1 text-[12px] font-medium text-[#65a380] transition-colors hover:bg-[rgba(101,163,128,0.1)]"
        >
          View all →
        </Link>
      </div>

      {/* Card */}
      <div
        className="overflow-hidden rounded-xl bg-white"
        style={{
          border: '1px solid rgba(28,28,30,0.08)',
          boxShadow: '0 1px 4px rgba(28,28,30,0.06), 0 2px 12px rgba(28,28,30,0.04)',
        }}
      >
        {loading ? (
          <div className="p-5 flex flex-col gap-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
        ) : transactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-[#a09890]">
            <svg
              width="18"
              height="18"
              viewBox="0 0 18 18"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              className="mb-2"
            >
              <circle cx="8" cy="8" r="6" />
              <path d="M13 13l3 3" strokeLinecap="round" />
            </svg>
            <span className="text-[13px]">No transactions this month</span>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(28,28,30,0.08)' }}>
                {['Date', 'Merchant', 'Category', 'Amount'].map((h, i) => (
                  <th
                    key={h}
                    className={cn(
                      'px-4 py-2 uppercase tracking-[0.05em] text-[#a09890]',
                      i === 3 ? 'text-right' : 'text-left',
                    )}
                    style={{ fontSize: 11, fontWeight: 600 }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {transactions.map((tx, idx) => {
                const amount = parseFloat(tx.amount)
                const isIncome = amount < 0
                return (
                  <tr
                    key={tx.id}
                    className="transition-colors hover:bg-[#f0ebe3]"
                    style={
                      idx < transactions.length - 1
                        ? { borderBottom: '1px solid rgba(28,28,30,0.08)' }
                        : {}
                    }
                  >
                    <td className="px-4 py-[11px] font-mono text-[12px] text-[#6b6560]">
                      {formatTransactionDate(tx.date)}
                    </td>
                    <td className="px-4 py-[11px] text-[13.5px] font-medium text-[#1c1c1e]">
                      {tx.merchant_name}
                    </td>
                    <td className="px-4 py-[11px]">
                      <CategoryBadge category={tx.category} />
                    </td>
                    <td
                      className={cn(
                        'px-4 py-[11px] text-right font-mono text-[13.5px] font-medium',
                        isIncome ? 'text-[#16a34a]' : 'text-[#1c1c1e]',
                      )}
                    >
                      {isIncome ? '+' : '-'}
                      {formatCurrency(Math.abs(amount))}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
