'use client'

import { Shield, Mail } from 'lucide-react'
import { LeaseUpload } from '@/components/LeaseUpload'

interface StepVerificationProps {
  userId: string
  leaseDocPath?: string
  onLeaseUpload: (path: string) => void
  onSkip: () => void
}

export function StepVerification({ userId, leaseDocPath, onLeaseUpload, onSkip }: StepVerificationProps) {
  const leaseStatus = leaseDocPath ? 'pending' : 'none'

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
            Upload your lease to earn a verified badge. Verified listings rank higher in search results.
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
        />
      </div>

      {/* .edu verification info */}
      <div className="rounded-card border border-gray-200 p-4 flex items-start gap-3">
        <Mail className="w-5 h-5 text-accent-600 mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-900">Connect .edu Email</p>
          <p className="text-xs text-gray-500 mt-0.5">
            Verify your CU or university email from your Account page to earn the &ldquo;CU Student&rdquo; badge.
          </p>
        </div>
      </div>

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
