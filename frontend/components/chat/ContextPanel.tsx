'use client'

import { SuggestedPrompts } from '@/components/chat/SuggestedPrompts'

const ACCOUNT_PLACEHOLDERS = [
  { name: 'Checking', color: '#7c6af7' },
  { name: 'Savings', color: '#22d4b3' },
  { name: 'Credit', color: '#f97316' },
] as const

interface ContextPanelProps {
  onSelectPrompt: (prompt: string) => void
}

function getDateRange(): string {
  const today = new Date()
  const firstOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1)
  const formatOpts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }
  const start = firstOfLastMonth.toLocaleDateString('en-US', formatOpts)
  const end = today.toLocaleDateString('en-US', { ...formatOpts, year: 'numeric' })
  return `${start} — ${end}`
}

export function ContextPanel({ onSelectPrompt }: ContextPanelProps) {
  return (
    <div
      style={{
        width: 240,
        minWidth: 240,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}
    >
      {/* Accounts + date range card */}
      <div
        style={{
          background: '#ffffff',
          border: '1px solid rgba(28,28,30,0.08)',
          borderRadius: 12,
          padding: 16,
          boxShadow: '0 1px 4px rgba(28,28,30,0.06), 0 2px 12px rgba(28,28,30,0.04)',
        }}
      >
        {/* Analyzing section */}
        <div
          style={{
            fontSize: 10,
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            color: '#a09890',
            marginBottom: 8,
          }}
        >
          Analyzing
        </div>
        {ACCOUNT_PLACEHOLDERS.map(acc => (
          <div
            key={acc.name}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 10px',
              background: '#f0ebe3',
              borderRadius: 8,
              marginBottom: 4,
            }}
          >
            <div
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: acc.color,
                flexShrink: 0,
              }}
            />
            <span style={{ fontSize: 12, color: '#6b6560' }}>{acc.name}</span>
          </div>
        ))}

        {/* Date range section */}
        <div style={{ marginTop: 10 }}>
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              color: '#a09890',
              marginBottom: 8,
            }}
          >
            Date Range
          </div>
          <div
            style={{
              fontSize: 12,
              color: '#6b6560',
              background: '#f0ebe3',
              padding: '6px 10px',
              borderRadius: 8,
            }}
          >
            {getDateRange()}
          </div>
        </div>
      </div>

      {/* Suggested prompts */}
      <div>
        <div
          style={{
            fontSize: 10,
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            color: '#a09890',
            marginBottom: 8,
          }}
        >
          Suggested
        </div>
        <SuggestedPrompts onSelect={onSelectPrompt} />
      </div>
    </div>
  )
}
