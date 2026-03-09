'use client'

import { useState, useRef, Suspense } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter, useSearchParams } from 'next/navigation'
import { AlertCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'

function VerifyForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const email = searchParams.get('email') ?? ''
  const next = searchParams.get('next') ?? '/'

  const [code, setCode] = useState(['', '', '', '', '', '', '', ''])
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)
  const [error, setError] = useState('')
  const [resent, setResent] = useState(false)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  function handleChange(index: number, value: string) {
    // Handle paste of full code
    if (value.length > 1) {
      const digits = value.replace(/\D/g, '').slice(0, 8).split('')
      const newCode = [...code]
      digits.forEach((d, i) => {
        if (index + i < 8) newCode[index + i] = d
      })
      setCode(newCode)
      const nextIndex = Math.min(index + digits.length, 7)
      inputRefs.current[nextIndex]?.focus()
      return
    }

    if (value && !/^\d$/.test(value)) return

    const newCode = [...code]
    newCode[index] = value
    setCode(newCode)

    if (value && index < 7) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent) {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const token = code.join('')
    if (token.length !== 8) {
      setError('Please enter the full 8-digit code.')
      return
    }
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { error: err } = await supabase.auth.verifyOtp({
      email,
      token,
      type: 'signup',
    })
    setLoading(false)
    if (err) {
      setError(err.message)
      return
    }
    router.push(next)
  }

  async function handleResend() {
    if (!email) {
      setError('Email address is missing. Please go back and sign up again.')
      return
    }
    setResending(true)
    setError('')
    setResent(false)
    const supabase = createClient()
    const { error: err } = await supabase.auth.resend({
      type: 'signup',
      email,
    })
    setResending(false)
    if (err) {
      setError(err.message)
      return
    }
    setResent(true)
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-20">
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-8">
          <Link href="/">
            <Image src="/logo.png" alt="SubletBuff" width={3772} height={1120} className="h-10 w-auto" unoptimized />
          </Link>
        </div>

        <div className="bg-white rounded-card shadow-card p-8">
          <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>

          <h1 className="text-xl font-semibold text-gray-900 mb-2 text-center">Check your email</h1>
          <p className="text-sm text-gray-500 text-center mb-6">
            Enter the 8-digit code we sent to <strong>{email}</strong>
          </p>

          {error && (
            <div className="flex items-start gap-2 bg-red-50 text-error text-sm p-3 rounded-button mb-4">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            <div className="flex justify-center gap-1.5">
              {code.map((digit, i) => (
                <input
                  key={i}
                  ref={(el) => { inputRefs.current[i] = el }}
                  type="text"
                  inputMode="numeric"
                  maxLength={8}
                  value={digit}
                  onChange={(e) => handleChange(i, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(i, e)}
                  className="w-9 h-11 text-center text-lg font-semibold border border-gray-200 rounded-button focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  autoFocus={i === 0}
                />
              ))}
            </div>

            <Button type="submit" variant="primary" size="md" className="w-full" disabled={loading}>
              {loading ? 'Verifying…' : 'Verify Email'}
            </Button>
          </form>

          <div className="text-center mt-4">
            {resent ? (
              <p className="text-sm text-green-600">Code resent! Check your email.</p>
            ) : (
              <button
                onClick={handleResend}
                disabled={resending}
                className="text-sm text-primary-600 hover:underline disabled:opacity-50"
              >
                {resending ? 'Resending…' : "Didn't get the code? Resend"}
              </button>
            )}
          </div>

          <p className="text-center text-sm text-gray-500 mt-4">
            <Link href={`/auth/login?next=${encodeURIComponent(next)}`} className="text-primary-600 font-medium hover:underline">
              Back to sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default function VerifyPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50" />}>
      <VerifyForm />
    </Suspense>
  )
}
