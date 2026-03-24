'use client'

import { useState } from 'react'
import { Shield } from 'lucide-react'
import { LeaseUpload } from '@/components/LeaseUpload'
import { EduGoogleVerify } from '@/components/EduGoogleVerify'

interface StepVerificationProps {
  userId: string
  leaseDocPath?: string
  eduEmail?: string | null
  onLeaseUpload: (path: string) => void
  onLeaseRemove?: () => void
  onEduVerified?: (email: string) => void
  onSkip: () => void
}

export function StepVerification({ userId, leaseDocPath, eduEmail: initialEduEmail, onLeaseUpload, onLeaseRemove, onEduVerified, onSkip }: StepVerificationProps) {
  const leaseStatus = leaseDocPath ? 'pending' : 'none'
  const [eduEmail, setEduEmail] = useState(initialEduEmail)

  return (
    <div className="max-w-xl mx-auto flex flex-col gap-5">
      <h2 className="text-xl font-semibold text-gray-900">Verification</h2>
      <p className="text-sm text-gray-500 -mt-3">
        Verified listings get 2× more inquiries. Verification is optional but recommended.
      </p>

      {/* Current level */}
      <div className="rounded-card bg-gray-50 border border-gray-200 p-4 flex items-center gap-3">
        <Shield className="w-6 h-6 text-primary-600 flex-shrink-0" />
        <div>
          <p className="text-sm font-medium text-gray-900">Build Trust</p>
          <p className="text-xs text-gray-500">
            Upload your lease or verify your student status to earn trust badges.
          </p>
        </div>
      </div>

      {/* Lease upload */}
      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium text-gray-900">Upload Your Lease (optional)</p>
        <p className="text-xs text-gray-500">
          Share a copy of your lease to prove you&apos;re the legitimate tenant.
          It&apos;s reviewed privately by our team.
        </p>
        <LeaseUpload
          userId={userId}
          currentStatus={leaseStatus}
          currentPath={leaseDocPath}
          onUploadComplete={onLeaseUpload}
          onRemove={onLeaseRemove}
        />
      </div>

      {/* CU Student verification via Google */}
      <EduGoogleVerify
        eduEmail={eduEmail}
        onVerified={(email) => {
          setEduEmail(email)
          onEduVerified?.(email)
        }}
      />

      <div className="text-center pt-2">
        <button
          type="button"
          onClick={onSkip}
          className="text-sm text-gray-500 hover:text-gray-700 underline transition-colors"
        >
          Skip for now — proceed to review
        </button>
      </div>
    </div>
  )
}
