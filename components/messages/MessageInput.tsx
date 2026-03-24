'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Send, Loader2 } from 'lucide-react'
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
  otherUserName?: string
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

/** Returns a human-readable date label for message grouping */
function getDateLabel(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const msgDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const diffDays = Math.floor((today.getTime() - msgDate.getTime()) / 86400000)

  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) {
    return date.toLocaleDateString('en-US', { weekday: 'long' })
  }
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined })
}

/** Format a time like "2:30 PM" */
function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

/** Check if two dates are on the same calendar day */
function isSameDay(a: string, b: string): boolean {
  const da = new Date(a)
  const db = new Date(b)
  return da.getFullYear() === db.getFullYear() && da.getMonth() === db.getMonth() && da.getDate() === db.getDate()
}

export function MessageInput({ conversationId, currentUserId, initialMessages, participants, otherUserName }: MessageInputProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
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

  // Poll for new messages every 10s
  useEffect(() => {
    async function poll() {
      try {
        const res = await fetch(`/api/messages/conversations/${conversationId}`)
        if (res.ok) {
          const data = await res.json()
          const fetched = data.messages as Message[]
          const wasNearBottom = isNearBottom()
          setMessages((prev) => {
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

    intervalRef.current = setInterval(poll, 10000)
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [conversationId, isNearBottom])

  // Auto-resize textarea
  const resizeTextarea = useCallback(() => {
    const ta = textareaRef.current
    if (!ta) return
    ta.style.height = 'auto'
    ta.style.height = Math.min(ta.scrollHeight, 120) + 'px'
  }, [])

  useEffect(() => {
    resizeTextarea()
  }, [input, resizeTextarea])

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
        setMessages((prev) =>
          prev.map((m) => m.id === tempId ? { ...data.message } : m)
        )
      } else {
        setMessages((prev) => prev.filter((m) => m.id !== tempId))
      }
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== tempId))
    } finally {
      setSending(false)
      // Re-focus the textarea after sending
      textareaRef.current?.focus()
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto px-4 sm:px-6 py-4">
        {/* Empty thread state */}
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
              <Send className="w-5 h-5 text-gray-400 -rotate-45" />
            </div>
            <p className="text-sm text-gray-500">
              Send a message to start the conversation{otherUserName ? ` with ${otherUserName}` : ''}.
            </p>
          </div>
        )}

        {messages.map((msg, idx) => {
          const isOwn = msg.sender_id === currentUserId
          const prevMsg = idx > 0 ? messages[idx - 1] : null
          const nextMsg = idx < messages.length - 1 ? messages[idx + 1] : null
          const isFirstInGroup = !prevMsg || prevMsg.sender_id !== msg.sender_id
          const isLastInGroup = !nextMsg || nextMsg.sender_id !== msg.sender_id
          const senderName = participants[msg.sender_id] ?? 'User'
          const isTemp = msg.id.startsWith('temp-')

          // Date separator
          const showDateSeparator = !prevMsg || !isSameDay(prevMsg.created_at, msg.created_at)

          return (
            <div key={msg.id}>
              {/* Date separator */}
              {showDateSeparator && (
                <div className="flex items-center gap-3 my-5">
                  <div className="flex-1 h-px bg-gray-200" />
                  <span className="text-xs font-medium text-gray-400 px-2">
                    {getDateLabel(msg.created_at)}
                  </span>
                  <div className="flex-1 h-px bg-gray-200" />
                </div>
              )}

              {isOwn ? (
                /* Own message — right-aligned, primary-colored */
                <div className={`flex justify-end ${isFirstInGroup && !showDateSeparator ? 'mt-3' : isFirstInGroup ? '' : 'mt-0.5'}`}>
                  <div
                    className={`max-w-[80%] sm:max-w-[70%] px-3.5 py-2 text-sm bg-primary-600 text-white transition-opacity ${
                      isTemp ? 'opacity-70' : ''
                    } ${
                      isFirstInGroup && isLastInGroup
                        ? 'rounded-2xl'
                        : isFirstInGroup
                        ? 'rounded-2xl rounded-br-md'
                        : isLastInGroup
                        ? 'rounded-2xl rounded-tr-md'
                        : 'rounded-2xl rounded-r-md'
                    }`}
                  >
                    <p className="whitespace-pre-wrap break-words leading-relaxed">{msg.body}</p>
                    {isLastInGroup && (
                      <p className="text-[10px] mt-1 text-white/50 text-right">
                        {formatTime(msg.created_at)}
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                /* Other person's message — left-aligned */
                <div className={isFirstInGroup && !showDateSeparator ? 'mt-3' : isFirstInGroup ? '' : 'mt-0.5'}>
                  {/* Sender name above first message in group */}
                  {isFirstInGroup && (
                    <p className="text-xs font-medium text-gray-500 mb-1 ml-10">
                      {senderName}
                    </p>
                  )}
                  <div className="flex items-end gap-2">
                    {/* Avatar on last message in group, spacer otherwise */}
                    {isLastInGroup ? (
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-[11px] font-medium flex-shrink-0 ${getAvatarColor(msg.sender_id)}`}
                      >
                        {getInitials(senderName)}
                      </div>
                    ) : (
                      <div className="w-7 flex-shrink-0" />
                    )}
                    <div
                      className={`max-w-[80%] sm:max-w-[70%] px-3.5 py-2 text-sm bg-white text-gray-900 border border-gray-200/80 shadow-sm ${
                        isFirstInGroup && isLastInGroup
                          ? 'rounded-2xl'
                          : isFirstInGroup
                          ? 'rounded-2xl rounded-bl-md'
                          : isLastInGroup
                          ? 'rounded-2xl rounded-tl-md'
                          : 'rounded-2xl rounded-l-md'
                      }`}
                    >
                      <p className="whitespace-pre-wrap break-words leading-relaxed">{msg.body}</p>
                      {isLastInGroup && (
                        <p className="text-[10px] mt-1 text-gray-400">
                          {formatTime(msg.created_at)}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Input area */}
      <div className="border-t border-gray-200 bg-white px-3 sm:px-5 py-3">
        <form
          onSubmit={handleSend}
          className="flex items-end gap-2 max-w-2xl mx-auto"
        >
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSend(e)
                }
              }}
              placeholder="Type a message..."
              rows={1}
              className="w-full px-4 py-2.5 text-sm rounded-2xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent placeholder:text-gray-400 transition-all duration-200 resize-none hover:border-gray-300"
              style={{ maxHeight: '120px' }}
            />
          </div>
          <button
            type="submit"
            disabled={!input.trim() || sending}
            className="p-2.5 rounded-full bg-primary-600 text-white hover:bg-primary-700 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-primary-600 disabled:active:scale-100 flex-shrink-0 shadow-sm"
            aria-label="Send message"
          >
            {sending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </form>
        <p className="text-[10px] text-gray-400 text-center mt-1.5 hidden sm:block">
          Press Enter to send, Shift + Enter for new line
        </p>
      </div>
    </div>
  )
}
