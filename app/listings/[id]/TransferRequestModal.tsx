'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'

interface TransferRequestModalProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  listingId: string
  defaultName: string
  defaultEmail: string
}

export function TransferRequestModal({
  open,
  onClose,
  onSuccess,
  listingId,
  defaultName,
  defaultEmail,
}: TransferRequestModalProps) {
  const [name, setName] = useState(defaultName)
  const [email, setEmail] = useState(defaultEmail)
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const res = await fetch('/api/transfer-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listing_id: listingId,
          applicant_name: name.trim(),
          applicant_email: email.trim(),
          message: message.trim() || undefined,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Something went wrong. Please try again.')
        return
      }

      onSuccess()
    } catch {
      setError('Network error. Please check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Request Lease Transfer">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label htmlFor="transfer-name" className="block text-sm font-medium text-gray-700 mb-1">
            Full Name
          </label>
          <input
            id="transfer-name"
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-button border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>

        <div>
          <label htmlFor="transfer-email" className="block text-sm font-medium text-gray-700 mb-1">
            Email
          </label>
          <input
            id="transfer-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-button border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>

        <div>
          <label htmlFor="transfer-message" className="block text-sm font-medium text-gray-700 mb-1">
            Message to Landlord <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <textarea
            id="transfer-message"
            value={message}
            onChange={(e) => setMessage(e.target.value.slice(0, 500))}
            maxLength={500}
            rows={3}
            placeholder="Tell the landlord a bit about yourself..."
            className="w-full rounded-button border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
          />
          <p className="text-xs text-gray-400 mt-1 text-right">{message.length}/500</p>
        </div>

        {error && (
          <div className="rounded-button bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="flex items-center gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2.5 text-sm font-medium rounded-button border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading || !name.trim() || !email.trim()}
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-button bg-primary-600 text-white hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Submitting...
              </>
            ) : (
              'Submit Request'
            )}
          </button>
        </div>
      </form>
    </Modal>
  )
}
