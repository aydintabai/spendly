'use client'

import type { ChatMessage } from '@/types'

interface MessageBubbleProps {
  message: ChatMessage
  userInitials: string
  isStreaming?: boolean
}

function renderInline(text: string): React.ReactNode[] {
  const parts = text.split(/\*\*(.*?)\*\*/g)
  return parts.map((p, j) => (j % 2 === 1 ? <strong key={j}>{p}</strong> : p))
}

function renderContent(text: string): React.ReactNode[] {
  const lines = text.split('\n')
  return lines
    .map((line, i) => {
      // Table row
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
      // Headings: ### ## #
      const headingMatch = line.match(/^(#{1,3})\s+(.+)/)
      if (headingMatch) {
        const level = headingMatch[1].length
        const sizes = [17, 15, 14]
        return (
          <div
            key={i}
            style={{
              fontSize: sizes[level - 1],
              fontWeight: 700,
              marginTop: i === 0 ? 0 : 10,
              marginBottom: 2,
              color: '#1c1c1e',
            }}
          >
            {renderInline(headingMatch[2])}
          </div>
        )
      }
      // Bullet list: * or -
      const bulletMatch = line.match(/^[\*\-]\s+(.+)/)
      if (bulletMatch) {
        return (
          <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 2, paddingLeft: 4 }}>
            <span style={{ color: '#65a380', flexShrink: 0, marginTop: 1 }}>•</span>
            <span>{renderInline(bulletMatch[1])}</span>
          </div>
        )
      }
      // Empty line → small spacer
      if (line.trim() === '') {
        return <div key={i} style={{ height: 6 }} />
      }
      return (
        <div key={i} style={{ marginBottom: 2 }}>
          {renderInline(line)}
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
