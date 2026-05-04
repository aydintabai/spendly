'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { api, BASE_URL, getAuthHeaders } from '@/lib/api'
import type { ChatMessage } from '@/types'

interface UseChatReturn {
  messages: ChatMessage[]
  streaming: boolean
  sendMessage: (text: string) => Promise<void>
  clearHistory: () => Promise<void>
  messagesEndRef: React.RefObject<HTMLDivElement | null>
}

export function useChat(): UseChatReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [streaming, setStreaming] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    api.agent.history().then(setMessages).catch(() => {})
  }, [])

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, streaming])

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || streaming) return

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: text,
      created_at: new Date().toISOString(),
    }
    const assistantPlaceholderId = crypto.randomUUID()
    const assistantMsg: ChatMessage = {
      id: assistantPlaceholderId,
      role: 'assistant',
      content: '',
      created_at: new Date().toISOString(),
    }

    setMessages(prev => [...prev, userMsg, assistantMsg])
    setStreaming(true)

    try {
      const headers = await getAuthHeaders()
      const response = await fetch(`${BASE_URL}/agent/chat`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ message: text }),
      })

      if (!response.ok || !response.body) {
        throw new Error(`HTTP ${response.status}`)
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const data = line.slice(6)
          if (data === '[DONE]') {
            setStreaming(false)
            return
          }
          try {
            const parsed = JSON.parse(data) as { token: string }
            if (parsed.token) {
              setMessages(prev =>
                prev.map(m =>
                  m.id === assistantPlaceholderId
                    ? { ...m, content: m.content + parsed.token }
                    : m,
                ),
              )
            }
          } catch {
            // skip malformed lines
          }
        }
      }
    } catch {
      setMessages(prev =>
        prev.map(m =>
          m.id === assistantPlaceholderId
            ? { ...m, content: 'Sorry, something went wrong. Please try again.' }
            : m,
        ),
      )
    } finally {
      setStreaming(false)
    }
  }, [streaming])

  const clearHistory = useCallback(async () => {
    await api.agent.clearHistory()
    setMessages([])
  }, [])

  return { messages, streaming, sendMessage, clearHistory, messagesEndRef }
}
