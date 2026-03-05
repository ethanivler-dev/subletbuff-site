'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { createClient } from '@/lib/supabase/client'
import { Lock, Send } from 'lucide-react'
import type { User } from '@supabase/supabase-js'

interface InquiryFormProps {
  listingId: string
  listerId: string
  listerName: string
  user: { id: string; email: string } | null
}

export function InquiryForm({ listingId, listerId, listerName, user }: InquiryFormProps) {
  const router = useRouter()
  const [message, setMessage] = useState('')
  const [moveIn, setMoveIn] = useState('')
  const [moveOut, setMoveOut] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  if (!user) {
    return (
      <div className="rounded-card border border-gray-200 bg-white p-5">
        <h3 className="text-base font-semibold text-gray-900 mb-3">
          Contact {listerName}
        </h3>
        <div className="text-center py-6">
          <Lock className="w-8 h-8 mx-auto text-gray-300 mb-3" />
          <p className="text-sm text-gray-500 mb-4">
            Sign in to contact this lister
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
      const supabase = createClient()
      const { error: insertError } = await supabase.from('inquiries').insert({
        listing_id: listingId,
        renter_id: user!.id,
        lister_id: listerId,
        message: message.trim(),
        move_in_date: moveIn || null,
        move_out_date: moveOut || null,
      })

      if (insertError) throw insertError
      setSent(true)
    } catch {
      setError('Failed to send message. Please try again.')
    } finally {
      setSending(false)
    }
  }

  if (sent) {
    return (
      <div className="rounded-card border border-gray-200 bg-white p-5 text-center">
        <div className="w-10 h-10 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-3">
          <Send className="w-5 h-5 text-success" />
        </div>
        <h3 className="text-base font-semibold text-gray-900">Message Sent!</h3>
        <p className="text-sm text-gray-500 mt-1">
          {listerName} will receive your inquiry and can respond directly.
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-card border border-gray-200 bg-white p-5">
      <h3 className="text-base font-semibold text-gray-900 mb-4">
        Contact {listerName}
      </h3>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Hi! I'm interested in this sublet…"
          rows={4}
          className="w-full px-3 py-2 text-sm rounded-button border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent placeholder:text-gray-400 transition-colors duration-200 resize-none hover:border-gray-400"
        />

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Move-in date"
            type="date"
            value={moveIn}
            onChange={(e) => setMoveIn(e.target.value)}
          />
          <Input
            label="Move-out date"
            type="date"
            value={moveOut}
            onChange={(e) => setMoveOut(e.target.value)}
          />
        </div>

        {error && <p className="text-xs text-error">{error}</p>}

        <Button type="submit" variant="primary" size="lg" disabled={sending} className="w-full mt-1">
          {sending ? 'Sending…' : 'Send Inquiry'}
        </Button>

        <p className="text-xs text-gray-400 text-center">
          Exact address shared after the lister accepts your inquiry.
        </p>
      </form>
    </div>
  )
}
