'use client'

import type { Transaction } from '@/types'
import { CATEGORY_CONFIG } from '@/constants/categories'
import { formatCurrency, cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'

interface TransactionTableProps {
  transactions: Transaction[]
  total: number
  page: number
  pageSize: number
  totalPages: number
  onPageChange: (page: number) => void
  loading: boolean
}

function CategoryBadge({ category }: { category: string }) {
  const config = CATEGORY_CONFIG[category as keyof typeof CATEGORY_CONFIG]
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

function PageButton({
  children,
  active,
  disabled,
  onClick,
}: {
  children: React.ReactNode
  active?: boolean
  disabled?: boolean
  onClick?: () => void
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        background: active ? 'rgba(101,163,128,0.1)' : '#ffffff',
        border: `1px solid ${active ? '#65a380' : 'rgba(28,28,30,0.08)'}`,
        color: active ? '#65a380' : '#6b6560',
        padding: '5px 11px',
        borderRadius: 6,
        fontSize: 12,
        cursor: disabled ? 'default' : 'pointer',
        fontFamily: "'DM Sans', sans-serif",
        transition: 'all 0.15s',
        boxShadow: '0 1px 2px rgba(28,28,30,0.05)',
        opacity: disabled ? 0.4 : 1,
      }}
      onMouseEnter={e => {
        if (!disabled && !active) {
          e.currentTarget.style.borderColor = '#65a380'
          e.currentTarget.style.color = '#65a380'
        }
      }}
      onMouseLeave={e => {
        if (!disabled && !active) {
          e.currentTarget.style.borderColor = 'rgba(28,28,30,0.08)'
          e.currentTarget.style.color = '#6b6560'
        }
      }}
    >
      {children}
    </button>
  )
}

export function TransactionTable({
  transactions,
  total,
  page,
  pageSize,
  totalPages,
  onPageChange,
  loading,
}: TransactionTableProps) {
  const rangeStart = (page - 1) * pageSize + 1
  const rangeEnd = Math.min(page * pageSize, total)

  if (loading) {
    return (
      <div className="p-5 flex flex-col gap-3">
        {Array.from({ length: 10 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-full" />
        ))}
      </div>
    )
  }

  if (transactions.length === 0) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 12,
          padding: '60px 20px',
          color: '#a09890',
        }}
      >
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 10,
            background: '#f0ebe3',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="8" cy="8" r="6" />
            <path d="M13 13l3 3" strokeLinecap="round" />
          </svg>
        </div>
        <div style={{ fontSize: 14, fontWeight: 600, color: '#6b6560' }}>No transactions found</div>
        <div style={{ fontSize: 13, textAlign: 'center', maxWidth: 260 }}>
          Try adjusting your search or filters
        </div>
      </div>
    )
  }

  return (
    <>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid rgba(28,28,30,0.08)' }}>
            {['Date', 'Merchant', 'Category', 'Amount'].map((h, i) => (
              <th
                key={h}
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  color: '#a09890',
                  textAlign: i === 3 ? 'right' : 'left',
                  padding: '8px 16px',
                }}
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
                    ? { borderBottom: '1px solid rgba(28,28,30,0.08)', cursor: 'default' }
                    : { cursor: 'default' }
                }
              >
                <td style={{ padding: '11px 16px', fontSize: 12, color: '#6b6560', fontFamily: "'DM Mono', monospace" }}>
                  {formatTransactionDate(tx.date)}
                </td>
                <td style={{ padding: '11px 16px', fontSize: 13.5, fontWeight: 500, color: '#1c1c1e' }}>
                  {tx.merchant_name}
                </td>
                <td style={{ padding: '11px 16px', verticalAlign: 'middle' }}>
                  <CategoryBadge category={tx.category} />
                </td>
                <td
                  style={{
                    padding: '11px 16px',
                    textAlign: 'right',
                    fontFamily: "'DM Mono', monospace",
                    fontSize: 13.5,
                    fontWeight: 500,
                    color: isIncome ? '#16a34a' : '#1c1c1e',
                  }}
                >
                  {isIncome ? '+' : '-'}
                  {formatCurrency(Math.abs(amount))}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 16px',
          borderTop: '1px solid rgba(28,28,30,0.08)',
        }}
      >
        <div style={{ fontSize: 12, color: '#6b6560', fontFamily: "'DM Mono', monospace" }}>
          Showing {rangeStart}–{rangeEnd} of {total}
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <PageButton disabled={page === 1} onClick={() => onPageChange(page - 1)}>
            ← Prev
          </PageButton>
          {Array.from({ length: totalPages }, (_, i) => (
            <PageButton key={i} active={page === i + 1} onClick={() => onPageChange(i + 1)}>
              {i + 1}
            </PageButton>
          ))}
          <PageButton disabled={page === totalPages || totalPages === 0} onClick={() => onPageChange(page + 1)}>
            Next →
          </PageButton>
        </div>
      </div>
    </>
  )
}
