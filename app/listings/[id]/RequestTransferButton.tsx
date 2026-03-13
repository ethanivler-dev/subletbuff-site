'use client'

import { useState } from 'react'
import { ArrowRightLeft } from 'lucide-react'
import { TransferRequestModal } from './TransferRequestModal'

interface RequestTransferButtonProps {
  listingId: string
  userId: string
  userEmail: string
  userName: string
}

export function RequestTransferButton({ listingId, userId, userEmail, userName }: RequestTransferButtonProps) {
  const [modalOpen, setModalOpen] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  if (submitted) {
    return (
      <div className="rounded-card border border-green-200 bg-green-50 p-4 text-sm text-green-800">
        Request sent! The landlord will be in touch.
      </div>
    )
  }

  return (
    <>
      <button
        onClick={() => setModalOpen(true)}
        className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold rounded-button bg-accent-500 text-gray-900 hover:bg-accent-400 transition-colors"
      >
        <ArrowRightLeft className="w-4 h-4" />
        Request Lease Transfer
      </button>

      <TransferRequestModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={() => {
          setModalOpen(false)
          setSubmitted(true)
        }}
        listingId={listingId}
        defaultName={userName}
        defaultEmail={userEmail}
      />
    </>
  )
}
