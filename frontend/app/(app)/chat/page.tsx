'use client'

import { useCallback, useState } from 'react'
import { ContextPanel } from '@/components/chat/ContextPanel'
import { ChatWindow } from '@/components/chat/ChatWindow'

export default function ChatPage() {
  const [pendingPrompt, setPendingPrompt] = useState<string | null>(null)

  const handleSelectPrompt = useCallback((prompt: string) => {
    setPendingPrompt(prompt)
  }, [])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      {/* Page header */}
      <div style={{ padding: '28px 32px 0', marginBottom: 24, flexShrink: 0 }}>
        <h1
          style={{
            fontSize: 22,
            fontWeight: 700,
            letterSpacing: '-0.4px',
            color: '#1c1c1e',
            marginBottom: 3,
          }}
        >
          AI Chat
        </h1>
        <p style={{ fontSize: 13, color: '#6b6560' }}>Ask anything about your finances</p>
      </div>

      {/* Chat layout */}
      <div
        style={{
          display: 'flex',
          gap: 16,
          padding: '0 32px 24px',
          flex: 1,
          minHeight: 0,
          overflow: 'hidden',
        }}
      >
        <ContextPanel onSelectPrompt={handleSelectPrompt} />
        <ChatWindow
          pendingPrompt={pendingPrompt}
          onPromptConsumed={() => setPendingPrompt(null)}
        />
      </div>
    </div>
  )
}
