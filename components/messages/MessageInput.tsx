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
  participants: Record<string, string>
}

// Fixed palette of muted colors for avatar backgrounds
const AVATAR_COLORS = [
  'bg-slate-500',
  'bg-blue-500',
  'bg-emerald-500',
  'bg-amber-500',
  'bg-rose-500',
  'bg-violet-500',
  'bg-teal-500',
  'bg-orange-500',
]

function getAvatarColor(userId: string): string {
  let hash = 0
  for (let i = 0; i < userId.length; i++) {
    hash = ((hash << 5) - hash + userId.charCodeAt(i)) | 0
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  }
  return (parts[0]?.[0] ?? '?').toUpperCase()
}

export function MessageInput({ conversationId, currentUserId, initialMessages, participants }: MessageInputProps) {
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
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
        {messages.map((msg, idx) => {
          const isOwn = msg.sender_id === currentUserId
          const prevMsg = idx > 0 ? messages[idx - 1] : null
          const isFirstInGroup = !prevMsg || prevMsg.sender_id !== msg.sender_id
          const senderName = participants[msg.sender_id] ?? 'Unknown'

          if (isOwn) {
            return (
              <div key={msg.id} className={`flex justify-end ${isFirstInGroup ? 'mt-3' : ''}`}>
                <div className="max-w-[75%] px-3 py-2 rounded-2xl text-sm bg-primary-600 text-white rounded-br-md">
                  <p className="whitespace-pre-wrap break-words">{msg.body}</p>
                  <p className="text-[10px] mt-1 text-white/60">
                    {timeAgo(msg.created_at)}
                  </p>
                </div>
              </div>
            )
          }

          return (
            <div key={msg.id} className={isFirstInGroup ? 'mt-3' : ''}>
              {/* Sender name above first message in group */}
              {isFirstInGroup && (
                <p className="text-xs font-medium text-gray-500 mb-1 ml-10">
                  {senderName}
                </p>
              )}
              <div className="flex items-start gap-2">
                {/* Avatar on first message, spacer on subsequent */}
                {isFirstInGroup ? (
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-medium flex-shrink-0 ${getAvatarColor(msg.sender_id)}`}
                  >
                    {getInitials(senderName)}
                  </div>
                ) : (
                  <div className="w-8 flex-shrink-0" />
                )}
                <div className="max-w-[75%] px-3 py-2 rounded-2xl text-sm bg-gray-100 text-gray-900 rounded-bl-md">
                  <p className="whitespace-pre-wrap break-words">{msg.body}</p>
                  <p className="text-[10px] mt-1 text-gray-400">
                    {timeAgo(msg.created_at)}
                  </p>
                </div>
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
