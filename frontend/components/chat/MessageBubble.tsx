'use client'

import type { ChatMessage } from '@/types'

interface MessageBubbleProps {
  message: ChatMessage
  userInitials: string
  isStreaming?: boolean
}

function renderContent(text: string): React.ReactNode[] {
  const lines = text.split('\n')
  return lines
    .map((line, i) => {
      if (line.startsWith('|')) {
        const cells = line.split('|').filter(c => c.trim())
        if (cells.every(c => /^[-\s]+$/.test(c))) return null
        return (
          <div
            key={i}
            style={{
              display: 'flex',
              gap: 12,
              borderBottom: '1px solid rgba(28,28,30,0.06)',
              padding: '4px 0',
            }}
          >
            {cells.map((c, j) => (
              <span
                key={j}
                style={{
                  flex: 1,
                  fontSize: 12,
                  fontFamily: "'DM Mono', monospace",
                  color: j === 0 ? '#6b6560' : '#1c1c1e',
                }}
              >
                {c.trim()}
              </span>
            ))}
          </div>
        )
      }
      const parts = line.split(/\*\*(.*?)\*\*/g)
      const rendered = parts.map((p, j) =>
        j % 2 === 1 ? <strong key={j}>{p}</strong> : p,
      )
      return (
        <div key={i} style={{ marginBottom: 2 }}>
          {rendered}
        </div>
      )
    })
    .filter(Boolean) as React.ReactNode[]
}

function formatTime(isoString: string): string {
  return new Date(isoString).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function MessageBubble({ message, userInitials, isStreaming }: MessageBubbleProps) {
  const isUser = message.role === 'user'
  const showCursor = isStreaming && !isUser

  return (
    <div
      style={{
        display: 'flex',
        gap: 10,
        flexDirection: isUser ? 'row-reverse' : 'row',
      }}
    >
      {/* Avatar */}
      <div
        style={{
          width: 28,
          height: 28,
          borderRadius: '50%',
          flexShrink: 0,
          marginTop: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: isUser ? 10 : 11,
          fontWeight: 700,
          background: isUser
            ? '#f0ebe3'
            : '#65a380',
          color: isUser ? '#6b6560' : 'white',
        }}
      >
        {isUser ? userInitials : 'S'}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: isUser ? 'flex-end' : 'flex-start' }}>
        {/* Bubble */}
        <div
          style={{
            maxWidth: '72%',
            padding: '11px 14px',
            borderRadius: 12,
            fontSize: 13.5,
            lineHeight: 1.6,
            ...(isUser
              ? {
                  background: '#65a380',
                  color: 'white',
                  borderTopRightRadius: 3,
                  boxShadow: '0 2px 8px rgba(101,163,128,0.25)',
                }
              : {
                  background: '#ffffff',
                  border: '1px solid rgba(28,28,30,0.08)',
                  borderTopLeftRadius: 3,
                  color: '#1c1c1e',
                  boxShadow: '0 1px 4px rgba(28,28,30,0.07)',
                }),
          }}
        >
          <div>{renderContent(message.content)}</div>
          {showCursor && (
            <span
              style={{
                display: 'inline-block',
                width: 2,
                height: '1em',
                background: '#65a380',
                marginLeft: 1,
                verticalAlign: 'text-bottom',
                animation: 'blink-cursor 1s step-end infinite',
              }}
            />
          )}
        </div>

        {/* Timestamp */}
        <span
          style={{
            fontSize: 10,
            color: '#a09890',
            marginTop: 4,
            display: 'block',
            textAlign: isUser ? 'right' : 'left',
          }}
        >
          {formatTime(message.created_at)}
        </span>
      </div>
    </div>
  )
}
