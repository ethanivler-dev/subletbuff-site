'use client'

import { useState, useCallback } from 'react'
import { GoogleOAuthProvider, useGoogleLogin } from '@react-oauth/google'
import { GraduationCap, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'

interface EduGoogleVerifyInnerProps {
  eduEmail?: string | null
  onVerified: (email: string) => void
}

function EduGoogleVerifyInner({ eduEmail, onVerified }: EduGoogleVerifyInnerProps) {
  const [verifying, setVerifying] = useState(false)
  const [error, setError] = useState('')

  const login = useGoogleLogin({
    onSuccess: useCallback(async (tokenResponse: { access_token: string }) => {
      setVerifying(true)
      setError('')

      try {
        // Get user info from Google using access token
        const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
        })
        if (!userInfoRes.ok) {
          setError('Could not verify your Google account. Please try again.')
          setVerifying(false)
          return
        }
        const userInfo = await userInfoRes.json()
        const googleEmail = userInfo.email?.toLowerCase()

        if (!googleEmail?.endsWith('@colorado.edu')) {
          setError('Please use your @colorado.edu Google account. The account you selected is not a CU email.')
          setVerifying(false)
          return
        }

        // Send to our API to update the profile
        const res = await fetch('/api/verify-edu-google', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ access_token: tokenResponse.access_token }),
        })
        const data = await res.json()

        if (!res.ok) {
          setError(data.error || 'Verification failed')
          setVerifying(false)
          return
        }

        onVerified(data.email)
      } catch {
        setError('Verification failed. Please try again.')
      } finally {
        setVerifying(false)
      }
    }, [onVerified]),
    onError: () => {
      setError('Google sign-in was cancelled or failed.')
    },
    hosted_domain: 'colorado.edu',
  })

  // Already verified
  if (eduEmail) {
    return (
      <div className="rounded-card border border-green-200 bg-green-50 p-4 flex items-start gap-3">
        <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-sm font-medium text-gray-900">CU Student Verified</p>
          <p className="text-xs text-gray-500 mt-0.5">Verified: {eduEmail}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-card border border-gray-200 p-4 flex flex-col gap-3">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-full flex items-center justify-center text-accent-600 bg-accent-400/10 flex-shrink-0">
          <GraduationCap className="w-4 h-4" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-900">Verify CU Student Status</p>
          <p className="text-xs text-gray-500 mt-0.5">
            Tap the button below and sign in with your @colorado.edu Google account.
            This only checks your email — it won&apos;t change your SubletBuff login or link your accounts.
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={() => login()}
        disabled={verifying}
        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-button border border-gray-200 bg-white hover:bg-gray-50 text-sm font-medium text-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {verifying ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
        )}
        {verifying ? 'Verifying...' : 'Verify with Google'}
      </button>

      {error && (
        <div className="flex items-start gap-2 text-xs text-red-600">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
          {error}
        </div>
      )}
    </div>
  )
}

interface EduGoogleVerifyProps {
  eduEmail?: string | null
  onVerified: (email: string) => void
}

export function EduGoogleVerify({ eduEmail, onVerified }: EduGoogleVerifyProps) {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID

  if (!clientId) {
    return (
      <div className="rounded-card border border-gray-200 p-4">
        <p className="text-xs text-gray-400">Google verification is not configured.</p>
      </div>
    )
  }

  return (
    <GoogleOAuthProvider clientId={clientId}>
      <EduGoogleVerifyInner eduEmail={eduEmail} onVerified={onVerified} />
    </GoogleOAuthProvider>
  )
}
