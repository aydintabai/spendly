'use client'

import { useCallback, useEffect, useRef } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useChat } from '@/hooks/useChat'
import { MessageBubble } from '@/components/chat/MessageBubble'

const SendIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M14 8L2 2l3 6-3 6 12-6z" fill="white" />
  </svg>
)

interface ChatWindowProps {
  pendingPrompt?: string | null
  onPromptConsumed?: () => void
}

export function ChatWindow({ pendingPrompt, onPromptConsumed }: ChatWindowProps) {
  const { user } = useAuth()
  const { messages, streaming, sendMessage, messagesEndRef } = useChat()
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const initials = user?.email?.slice(0, 1).toUpperCase() ?? 'U'

  const handleSend = useCallback(async (overrideText?: string) => {
    const text = overrideText ?? inputRef.current?.value.trim() ?? ''
    if (!text || streaming) return
    if (!overrideText && inputRef.current) {
      inputRef.current.value = ''
      inputRef.current.style.height = 'auto'
    }
    await sendMessage(text)
  }, [streaming, sendMessage])

  useEffect(() => {
    if (pendingPrompt) {
      void handleSend(pendingPrompt)
      onPromptConsumed?.()
    }
  }, [pendingPrompt, handleSend, onPromptConsumed])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        void handleSend(undefined)
      }
    },
    [handleSend],
  )

  const handleInput = useCallback((e: React.FormEvent<HTMLTextAreaElement>) => {
    const el = e.currentTarget
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`
  }, [])

  const showTypingIndicator = streaming && messages[messages.length - 1]?.role === 'assistant' && messages[messages.length - 1]?.content === ''

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        minWidth: 0,
        background: '#ffffff',
        border: '1px solid rgba(28,28,30,0.08)',
        borderRadius: 12,
        padding: 16,
        boxShadow: '0 1px 4px rgba(28,28,30,0.06), 0 2px 12px rgba(28,28,30,0.04)',
      }}
    >
      {/* Messages list */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '4px 0',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
          scrollBehavior: 'smooth',
        }}
      >
        {messages.length === 0 && !streaming && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              flex: 1,
              gap: 12,
              padding: '60px 20px',
              color: '#a09890',
            }}
          >
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                background: '#f0ebe3',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
                <path d="M2 3a1 1 0 011-1h10a1 1 0 011 1v7a1 1 0 01-1 1H5l-3 2V3z" fill="#a09890" opacity="0.8" />
              </svg>
            </div>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#6b6560' }}>
              No messages yet
            </div>
            <div style={{ fontSize: 13, textAlign: 'center', maxWidth: 260 }}>
              Ask a question or pick a suggestion to get started
            </div>
          </div>
        )}

        {messages.map((msg, i) => {
          const isLastAssistant =
            i === messages.length - 1 && msg.role === 'assistant' && streaming
          return (
            <MessageBubble
              key={msg.id}
              message={msg}
              userInitials={initials}
              isStreaming={isLastAssistant}
            />
          )
        })}

        {/* Typing indicator — shown when streaming but no tokens arrived yet */}
        {showTypingIndicator && (
          <div style={{ display: 'flex', gap: 10 }}>
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
                fontSize: 11,
                fontWeight: 700,
                background: 'linear-gradient(135deg, #65a380, #a8a29e)',
                color: 'white',
              }}
            >
              AI
            </div>
            <div
              style={{
                background: '#ffffff',
                border: '1px solid rgba(28,28,30,0.08)',
                borderTopLeftRadius: 3,
                borderRadius: 12,
                padding: '10px 14px',
                boxShadow: '0 1px 4px rgba(28,28,30,0.07)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <div className="typing-dot" />
                <div className="typing-dot" />
                <div className="typing-dot" />
                <span style={{ marginLeft: 4, fontSize: 12, color: '#a09890' }}>
                  Spendly is thinking…
                </span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div
        style={{
          paddingTop: 14,
          borderTop: '1px solid rgba(28,28,30,0.08)',
          display: 'flex',
          gap: 10,
          alignItems: 'flex-end',
        }}
      >
        <textarea
          ref={inputRef}
          placeholder="Ask about your spending…"
          rows={1}
          disabled={streaming}
          onInput={handleInput}
          onKeyDown={handleKeyDown}
          style={{
            flex: 1,
            background: '#ffffff',
            border: '1px solid rgba(28,28,30,0.08)',
            color: '#1c1c1e',
            padding: '11px 14px',
            borderRadius: 10,
            fontSize: 13.5,
            outline: 'none',
            resize: 'none',
            minHeight: 44,
            maxHeight: 120,
            fontFamily: "'DM Sans', sans-serif",
            lineHeight: 1.5,
            boxShadow: '0 1px 3px rgba(28,28,30,0.05)',
            transition: 'border-color 0.15s, box-shadow 0.15s',
            opacity: streaming ? 0.6 : 1,
          }}
          onFocus={e => {
            e.currentTarget.style.borderColor = '#65a380'
            e.currentTarget.style.boxShadow = '0 0 0 3px rgba(101,163,128,0.1)'
          }}
          onBlur={e => {
            e.currentTarget.style.borderColor = 'rgba(28,28,30,0.08)'
            e.currentTarget.style.boxShadow = '0 1px 3px rgba(28,28,30,0.05)'
          }}
        />
        <button
          onClick={() => void handleSend(undefined)}
          disabled={streaming}
          style={{
            width: 40,
            height: 40,
            borderRadius: 10,
            background: '#65a380',
            border: 'none',
            cursor: streaming ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            alignSelf: 'flex-end',
            opacity: streaming ? 0.5 : 1,
            transition: 'opacity 0.15s, transform 0.1s',
          }}
          onMouseEnter={e => {
            if (!streaming) e.currentTarget.style.opacity = '0.88'
          }}
          onMouseLeave={e => {
            if (!streaming) e.currentTarget.style.opacity = '1'
          }}
          onMouseDown={e => {
            if (!streaming) e.currentTarget.style.transform = 'scale(0.95)'
          }}
          onMouseUp={e => {
            e.currentTarget.style.transform = 'scale(1)'
          }}
        >
          <SendIcon />
        </button>
      </div>
    </div>
  )
}
