'use client'

import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

interface StatBadge {
  text: string
  variant: 'green' | 'red' | 'neutral'
}

interface StatCardProps {
  label: string
  value: string
  sub: string
  badge?: StatBadge
  glowColor: string
  loading?: boolean
}

const BADGE_STYLES: Record<StatBadge['variant'], string> = {
  green: 'bg-[rgba(34,197,94,0.12)] text-[#16a34a]',
  red: 'bg-[rgba(244,63,94,0.12)] text-[#dc2626]',
  neutral: 'bg-[rgba(28,28,30,0.06)] text-[#6b6560]',
}

export function StatCard({ label, value, sub, badge, glowColor, loading = false }: StatCardProps) {
  return (
    <div
      className="relative overflow-hidden rounded-xl bg-white p-5"
      style={{
        border: '1px solid rgba(28,28,30,0.08)',
        boxShadow: '0 1px 4px rgba(28,28,30,0.06), 0 2px 12px rgba(28,28,30,0.04)',
      }}
    >
      {/* Glow */}
      <div
        className="pointer-events-none absolute -top-4 -right-4 rounded-full"
        style={{ width: 80, height: 80, background: glowColor, opacity: 0.12 }}
      />

      {/* Label */}
      <p
        className="mb-2 uppercase tracking-[0.05em] text-[#a09890]"
        style={{ fontSize: 11, fontWeight: 600 }}
      >
        {label}
      </p>

      {/* Value */}
      {loading ? (
        <Skeleton className="mb-2 h-8 w-32" />
      ) : (
        <p
          className="mb-2 font-mono text-[#1c1c1e]"
          style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-1px' }}
        >
          {value}
        </p>
      )}

      {/* Sub + badge */}
      <div className="flex items-center gap-2">
        {loading ? (
          <Skeleton className="h-4 w-24" />
        ) : (
          <>
            <span className="text-[12px] text-[#6b6560]">{sub}</span>
            {badge && (
              <span
                className={cn(
                  'rounded-full px-[7px] py-[2px] font-mono',
                  BADGE_STYLES[badge.variant],
                )}
                style={{ fontSize: 11, fontWeight: 600 }}
              >
                {badge.text}
              </span>
            )}
          </>
        )}
      </div>
    </div>
  )
}
