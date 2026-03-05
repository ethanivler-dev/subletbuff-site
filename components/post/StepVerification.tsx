'use client'

import { Shield, Upload, Mail, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/Button'

interface StepVerificationProps {
  verificationLevel?: string
  onSkip: () => void
}

export function StepVerification({ verificationLevel, onSkip }: StepVerificationProps) {
  const level = verificationLevel ?? 'basic'

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
          <p className="text-sm font-medium text-gray-900">
            Current Level: <span className="capitalize">{level.replace('_', ' ')}</span>
          </p>
          <p className="text-xs text-gray-500">
            {level === 'basic' ? 'Upgrade below to boost trust.' : 'Great! You have an elevated trust level.'}
          </p>
        </div>
      </div>

      {/* Upgrade options */}
      <div className="flex flex-col gap-3">
        {/* Lease verification */}
        <div className="rounded-card border border-gray-200 p-4 flex items-start gap-3">
          <Upload className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-900">Upload Your Lease</p>
            <p className="text-xs text-gray-500 mt-0.5">
              Share a copy of your lease to prove you&apos;re the legitimate tenant.
              It&apos;s reviewed privately by our team.
            </p>
            <p className="text-xs text-gray-400 mt-2 italic">
              Coming soon — your listing will be reviewed manually for now.
            </p>
          </div>
        </div>

        {/* .edu verification */}
        <div className="rounded-card border border-gray-200 p-4 flex items-start gap-3">
          <Mail className="w-5 h-5 text-accent-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-900">Connect .edu Email</p>
            <p className="text-xs text-gray-500 mt-0.5">
              Verify your CU or university email to earn the &ldquo;CU Student&rdquo; badge.
            </p>
            <p className="text-xs text-gray-400 mt-2 italic">
              Coming soon — your listing will be reviewed manually for now.
            </p>
          </div>
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
