'use client'

import { useState } from 'react'
import { PieChart, Pie, Cell } from 'recharts'
import type { CategoryBreakdown } from '@/types'
import { CATEGORY_CONFIG } from '@/constants/categories'
import { formatCurrency } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'

interface CategoryDonutProps {
  data: CategoryBreakdown[]
  totalSpent: string
  loading?: boolean
}

function getCategoryColor(category: string): string {
  const key = category as keyof typeof CATEGORY_CONFIG
  return CATEGORY_CONFIG[key]?.color ?? '#a09890'
}

export function CategoryDonut({ data, totalSpent, loading = false }: CategoryDonutProps) {
  const [hovered, setHovered] = useState<string | null>(null)

  if (loading) {
    return (
      <div
        className="rounded-xl bg-white p-5"
        style={{
          border: '1px solid rgba(28,28,30,0.08)',
          boxShadow: '0 1px 4px rgba(28,28,30,0.06), 0 2px 12px rgba(28,28,30,0.04)',
        }}
      >
        <Skeleton className="mb-1 h-5 w-32" />
        <Skeleton className="mb-5 h-4 w-44" />
        <div className="flex items-center gap-5">
          <Skeleton className="h-[120px] w-[120px] rounded-full shrink-0" />
          <div className="flex flex-col gap-2 flex-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-4 w-full" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  const displayData = data.slice(0, 6)
  const hoveredItem = hovered ? displayData.find((d) => d.category === hovered) : null

  const centerAmount = hoveredItem
    ? formatCurrency(hoveredItem.total)
    : formatCurrency(totalSpent)
  const centerLabel = hoveredItem ? hoveredItem.category : 'total spent'

  return (
    <div
      className="rounded-xl bg-white p-5"
      style={{
        border: '1px solid rgba(28,28,30,0.08)',
        boxShadow: '0 1px 4px rgba(28,28,30,0.06), 0 2px 12px rgba(28,28,30,0.04)',
      }}
    >
      <p className="text-[14px] font-semibold text-[#1c1c1e] mb-1">By Category</p>
      <p className="text-[12px] text-[#6b6560] mb-4">Spending breakdown this month</p>

      {displayData.length === 0 ? (
        <div className="flex items-center justify-center h-[120px]">
          <p className="text-[12px] text-[#a09890]">No data this month</p>
        </div>
      ) : (
        <div className="flex items-center gap-5">
          {/* Donut */}
          <div className="relative shrink-0" style={{ width: 120, height: 120 }}>
            <PieChart width={120} height={120}>
              <Pie
                data={displayData}
                dataKey="percentage"
                cx={60}
                cy={60}
                innerRadius={32}
                outerRadius={46}
                strokeWidth={0}
                paddingAngle={2}
                onMouseEnter={(entry: { category?: string }) =>
                  setHovered(entry.category ?? null)
                }
                onMouseLeave={() => setHovered(null)}
              >
                {displayData.map((entry) => (
                  <Cell
                    key={entry.category}
                    fill={getCategoryColor(entry.category)}
                    opacity={hovered && hovered !== entry.category ? 0.35 : 1}
                    stroke="none"
                    style={{ cursor: 'pointer', outline: 'none' }}
                  />
                ))}
              </Pie>
            </PieChart>

            {/* Center text */}
            <div
              className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-1"
            >
              <span
                className="font-mono text-[#1c1c1e] leading-tight"
                style={{ fontSize: 13, fontWeight: 700 }}
              >
                {centerAmount}
              </span>
              <span
                className="text-[#a09890] leading-tight mt-0.5 truncate max-w-[80px]"
                style={{ fontSize: 9 }}
              >
                {centerLabel}
              </span>
            </div>
          </div>

          {/* Legend */}
          <div className="flex flex-col gap-2 flex-1 min-w-0">
            {displayData.map((entry) => (
              <div
                key={entry.category}
                className="flex items-center gap-2"
                onMouseEnter={() => setHovered(entry.category)}
                onMouseLeave={() => setHovered(null)}
                style={{ cursor: 'default' }}
              >
                <div
                  className="shrink-0 rounded-[2px]"
                  style={{
                    width: 8,
                    height: 8,
                    background: getCategoryColor(entry.category),
                    opacity: hovered && hovered !== entry.category ? 0.35 : 1,
                  }}
                />
                <span
                  className="flex-1 truncate text-[#6b6560]"
                  style={{ fontSize: 12 }}
                >
                  {entry.category}
                </span>
                <span
                  className="font-mono text-[#a09890] shrink-0"
                  style={{ fontSize: 11 }}
                >
                  {entry.percentage.toFixed(0)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
