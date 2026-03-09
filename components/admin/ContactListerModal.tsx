'use client'

import { useState } from 'react'
import { Modal } from '@/components/ui/Modal'

const REASONS = [
  { value: 'revision', label: 'Listing needs revision' },
  { value: 'missing_info', label: 'Missing information' },
  { value: 'photo_quality', label: 'Photo quality issue' },
  { value: 'price_issue', label: 'Price verification' },
  { value: 'custom', label: 'Custom message' },
]

interface Props {
  open: boolean
  onClose: () => void
  listingId: string
  listingTitle: string
  listerEmail: string
  listerName: string
}

export function ContactListerModal({ open, onClose, listingId, listingTitle, listerEmail, listerName }: Props) {
  const [reason, setReason] = useState('revision')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSend() {
    if (!message.trim()) {
      setError('Please enter a message')
      return
    }
    setSending(true)
    setError(null)

    const res = await fetch('/api/admin/contact-lister', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ listing_id: listingId, reason, message: message.trim() }),
    })

    if (res.ok) {
      setSent(true)
      setTimeout(() => {
        onClose()
        setSent(false)
        setMessage('')
        setReason('revision')
      }, 1500)
    } else {
      const data = await res.json().catch(() => ({}))
      setError(data.error ?? 'Failed to send email')
    }
    setSending(false)
  }

  return (
    <Modal open={open} onClose={onClose} title="Contact Lister">
      {sent ? (
        <div className="text-center py-6">
          <p className="text-green-600 font-medium">Email sent successfully!</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">To</label>
            <p className="text-sm text-gray-900">{listerName} ({listerEmail})</p>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Regarding</label>
            <p className="text-sm text-gray-700 truncate">{listingTitle}</p>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Reason</label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              {REASONS.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Message</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              placeholder="Write your message to the lister..."
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex justify-end gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              onClick={handleSend}
              disabled={sending}
              className="px-4 py-2 text-sm font-medium bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
            >
              {sending ? 'Sending...' : 'Send Email'}
            </button>
          </div>
        </div>
      )}
    </Modal>
  )
}
