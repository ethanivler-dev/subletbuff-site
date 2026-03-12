'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Send } from 'lucide-react'
import { timeAgo } from '@/lib/utils'

interface Message {
  id: string
  sender_id: string
  body: string
  created_at: string
}

interface MessageInputProps {
  conversationId: string
  currentUserId: string
  initialMessages: Message[]
}

export function MessageInput({ conversationId, currentUserId, initialMessages }: MessageInputProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const didInitialScroll = useRef(false)
  const shouldAutoScroll = useRef(true)

  // Check if the user is scrolled near the bottom of the chat container
  const isNearBottom = useCallback(() => {
    const el = scrollContainerRef.current
    if (!el) return true
    return el.scrollHeight - el.scrollTop - el.clientHeight < 100
  }, [])

  // Scroll the chat container (not the page) to the bottom
  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    const el = scrollContainerRef.current
    if (!el) return
    el.scrollTo({ top: el.scrollHeight, behavior })
  }, [])

  // Scroll to bottom on initial load (instant, no animation)
  useEffect(() => {
    if (!didInitialScroll.current && messages.length > 0) {
      scrollToBottom('instant' as ScrollBehavior)
      didInitialScroll.current = true
    }
  }, [messages.length, scrollToBottom])

  // When shouldAutoScroll is flagged (user sent a message), scroll to bottom
  useEffect(() => {
    if (shouldAutoScroll.current && didInitialScroll.current) {
      scrollToBottom('smooth')
      shouldAutoScroll.current = false
    }
  }, [messages.length, scrollToBottom])

  // Poll for new messages every 15s — clean up on unmount
  useEffect(() => {
    async function poll() {
      try {
        const res = await fetch(`/api/messages/conversations/${conversationId}`)
        if (res.ok) {
          const data = await res.json()
          const fetched = data.messages as Message[]
          // Only auto-scroll for polled messages if user is already near bottom
          const wasNearBottom = isNearBottom()
          setMessages((prev) => {
            // Merge: keep existing + add any new ones by ID
            const existingIds = new Set(prev.map((m) => m.id))
            const newMsgs = fetched.filter((m) => !existingIds.has(m.id))
            if (newMsgs.length > 0 && wasNearBottom) {
              shouldAutoScroll.current = true
            }
            return newMsgs.length > 0 ? [...prev, ...newMsgs] : prev
          })
        }
      } catch {
        // Silently ignore poll errors
      }
    }

    intervalRef.current = setInterval(poll, 15000)
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [conversationId, isNearBottom])

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    if (!input.trim() || sending) return

    const body = input.trim()
    setInput('')
    setSending(true)

    // Optimistic append
    const tempId = `temp-${Date.now()}`
    const optimisticMsg: Message = {
      id: tempId,
      sender_id: currentUserId,
      body,
      created_at: new Date().toISOString(),
    }
    shouldAutoScroll.current = true
    setMessages((prev) => [...prev, optimisticMsg])

    try {
      const res = await fetch(`/api/messages/conversations/${conversationId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: body }),
      })

      if (res.ok) {
        const data = await res.json()
        // Replace temp message with real one
        setMessages((prev) =>
          prev.map((m) => m.id === tempId ? { ...data.message } : m)
        )
      } else {
        // Remove optimistic message on failure
        setMessages((prev) => prev.filter((m) => m.id !== tempId))
      }
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== tempId))
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.map((msg) => {
          const isOwn = msg.sender_id === currentUserId
          return (
            <div
              key={msg.id}
              className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[75%] px-3 py-2 rounded-2xl text-sm ${
                  isOwn
                    ? 'bg-primary-600 text-white rounded-br-md'
                    : 'bg-gray-100 text-gray-900 rounded-bl-md'
                }`}
              >
                <p className="whitespace-pre-wrap break-words">{msg.body}</p>
                <p className={`text-[10px] mt-1 ${isOwn ? 'text-white/60' : 'text-gray-400'}`}>
                  {timeAgo(msg.created_at)}
                </p>
              </div>
            </div>
          )
        })}
      </div>

      {/* Input */}
      <form
        onSubmit={handleSend}
        className="border-t border-gray-200 p-4 flex items-end gap-2 bg-white"
      >
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              handleSend(e)
            }
          }}
          placeholder="Type a message…"
          rows={1}
          className="flex-1 px-3 py-2 text-sm rounded-xl border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent placeholder:text-gray-400 transition-colors duration-200 resize-none hover:border-gray-400"
        />
        <button
          type="submit"
          disabled={!input.trim() || sending}
          className="p-2.5 rounded-xl bg-primary-600 text-white hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  )
}
