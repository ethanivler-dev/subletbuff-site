'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { Lock, Send, MessageCircle } from 'lucide-react'

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

  // Completely hide if the logged-in user owns the listing
  if (user && user.id === listerId) {
    return null
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
    } catch {
      setError('Failed to send message. Please try again.')
    } finally {
      setSending(false)
    }
  }

  if (conversationId) {
    return (
      <div className="rounded-card border border-gray-200 bg-white p-5 text-center">
        <div className="w-10 h-10 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-3">
          <Send className="w-5 h-5 text-success" />
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
