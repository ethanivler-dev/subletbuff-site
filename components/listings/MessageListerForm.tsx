'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { Lock, Send, MessageCircle, ArrowRight } from 'lucide-react'
import { timeAgo } from '@/lib/utils'

interface ConversationPreview {
  id: string
  other_user_name: string
  last_message_preview: string | null
  last_message_at: string
  unread: boolean
}

interface MessageListerFormProps {
  listingId: string
  listerId: string
  listerName: string
  user: { id: string; email: string } | null
}

export function MessageListerForm({ listingId, listerId, listerName, user }: MessageListerFormProps) {
  const router = useRouter()
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [error, setError] = useState('')

  // Owner view: show inquiries for this listing
  const isOwner = user && user.id === listerId
  const [inquiries, setInquiries] = useState<ConversationPreview[]>([])
  const [loadingInquiries, setLoadingInquiries] = useState(false)

  useEffect(() => {
    if (!isOwner) return
    setLoadingInquiries(true)
    fetch(`/api/messages/conversations?listing_id=${listingId}`)
      .then((res) => (res.ok ? res.json() : { conversations: [] }))
      .then((data) => setInquiries(data.conversations ?? []))
      .finally(() => setLoadingInquiries(false))
  }, [isOwner, listingId])

  if (isOwner) {
    return (
      <div className="rounded-card border border-gray-200 bg-white p-5">
        <h3 className="text-base font-semibold text-gray-900 mb-3">
          Inquiries
        </h3>
        {loadingInquiries ? (
          <div className="space-y-2">
            {[1, 2].map((i) => (
              <div key={i} className="h-12 bg-gray-100 rounded animate-pulse" />
            ))}
          </div>
        ) : inquiries.length === 0 ? (
          <p className="text-sm text-gray-500 py-3">
            No messages yet. When someone inquires about this listing, their messages will appear here.
          </p>
        ) : (
          <div className="space-y-2">
            {inquiries.map((convo) => (
              <Link
                key={convo.id}
                href={`/messages/${convo.id}`}
                className="flex items-center justify-between gap-2 p-3 rounded-button border border-gray-100 hover:bg-gray-50 transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <p className={`text-sm truncate ${convo.unread ? 'font-bold text-gray-900' : 'font-medium text-gray-700'}`}>
                    {convo.other_user_name}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {convo.last_message_preview ?? 'No messages yet'}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-xs text-gray-400">{timeAgo(convo.last_message_at)}</span>
                  {convo.unread && <div className="w-2 h-2 rounded-full bg-primary-500" />}
                  <ArrowRight className="w-3.5 h-3.5 text-gray-400" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    )
  }

  if (!user) {
    return (
      <div className="rounded-card border border-gray-200 bg-white p-5">
        <h3 className="text-base font-semibold text-gray-900 mb-3">
          Message {listerName}
        </h3>
        <div className="text-center py-6">
          <Lock className="w-8 h-8 mx-auto text-gray-300 mb-3" />
          <p className="text-sm text-gray-500 mb-4">
            Sign in to message this lister
          </p>
          <Button
            variant="primary"
            onClick={() => router.push(`/auth/login?next=/listings/${listingId}`)}
          >
            Sign In
          </Button>
        </div>
      </div>
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!message.trim()) { setError('Please enter a message'); return }
    setError('')
    setSending(true)

    try {
      const res = await fetch('/api/messages/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listing_id: listingId,
          recipient_id: listerId,
          message: message.trim(),
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to send')
      }

      const data = await res.json()
      setConversationId(data.conversation_id)
    } catch (err) {
      console.error('[MessageListerForm] Send failed:', err)
      setError(err instanceof Error ? err.message : 'Failed to send message. Please try again.')
    } finally {
      setSending(false)
    }
  }

  if (conversationId) {
    return (
      <div className="rounded-card border border-gray-200 bg-white p-5 text-center">
        <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-3">
          <Send className="w-5 h-5 text-green-600" />
        </div>
        <h3 className="text-base font-semibold text-gray-900">Message Sent!</h3>
        <p className="text-sm text-gray-500 mt-1 mb-4">
          {listerName} will receive your message and can reply.
        </p>
        <Link
          href={`/messages/${conversationId}`}
          className="inline-flex items-center gap-2 text-sm font-medium text-primary-600 hover:text-primary-700 transition-colors"
        >
          <MessageCircle className="w-4 h-4" />
          View Conversation
        </Link>
      </div>
    )
  }

  return (
    <div className="rounded-card border border-gray-200 bg-white p-5">
      <h3 className="text-base font-semibold text-gray-900 mb-4">
        Message {listerName}
      </h3>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Hi! I'm interested in this sublet…"
          rows={4}
          className="w-full px-3 py-2 text-sm rounded-button border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent placeholder:text-gray-400 transition-colors duration-200 resize-none hover:border-gray-400"
        />

        {error && <p className="text-xs text-error">{error}</p>}

        <Button type="submit" variant="primary" size="lg" disabled={sending} className="w-full mt-1">
          {sending ? 'Sending…' : 'Send Message'}
        </Button>

        <p className="text-xs text-gray-400 text-center">
          Exact address shared after the lister accepts your inquiry.
        </p>
      </form>
    </div>
  )
}
