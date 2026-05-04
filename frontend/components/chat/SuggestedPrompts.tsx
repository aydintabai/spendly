'use client'

import { useState } from 'react'

const PROMPTS = [
  'How much did I spend on food last month?',
  "What are my biggest recurring expenses?",
  'Compare my spending this month vs last month',
  'Which subscriptions am I paying for?',
] as const

interface SuggestedPromptsProps {
  onSelect: (prompt: string) => void
}

export function SuggestedPrompts({ onSelect }: SuggestedPromptsProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

  return (
    <div>
      {PROMPTS.map((prompt, i) => (
        <button
          key={i}
          onClick={() => onSelect(prompt)}
          onMouseEnter={() => setHoveredIndex(i)}
          onMouseLeave={() => setHoveredIndex(null)}
          style={{
            width: '100%',
            textAlign: 'left',
            background: hoveredIndex === i ? 'rgba(101,163,128,0.1)' : '#ffffff',
            border: `1px solid ${hoveredIndex === i ? '#65a380' : 'rgba(28,28,30,0.08)'}`,
            color: hoveredIndex === i ? '#65a380' : '#6b6560',
            padding: '9px 12px',
            borderRadius: 8,
            fontSize: 12,
            cursor: 'pointer',
            fontFamily: "'DM Sans', sans-serif",
            marginBottom: 6,
            lineHeight: 1.4,
            boxShadow: hoveredIndex === i
              ? '0 1px 6px rgba(101,163,128,0.12)'
              : '0 1px 3px rgba(28,28,30,0.05)',
            transition: 'all 0.15s',
          }}
        >
          {prompt}
        </button>
      ))}
    </div>
  )
}
