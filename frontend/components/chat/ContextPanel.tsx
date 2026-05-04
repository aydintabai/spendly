'use client'

import { SuggestedPrompts } from '@/components/chat/SuggestedPrompts'

interface ContextPanelProps {
  onSelectPrompt: (prompt: string) => void
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
