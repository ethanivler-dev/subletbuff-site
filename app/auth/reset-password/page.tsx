'use client'

import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter, useSearchParams } from 'next/navigation'
import { Lock, Eye, EyeOff, AlertCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'

function ResetPasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [exchanging, setExchanging] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const supabase = createClient()

    // Listen for PASSWORD_RECOVERY event (works for both PKCE code and hash fragment flows)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') {
        setExchanging(false)
      }
    })

    // If there's a code param, exchange it (PKCE flow)
    const code = searchParams.get('code')
    if (code) {
      supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
        if (error) {
          setError('Reset link is invalid or expired. Please request a new one.')
          setExchanging(false)
        }
        // onAuthStateChange will fire on success
      })
    } else {
      // No code — check if already authenticated (hash fragment may have been auto-processed)
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) {
          setExchanging(false)
        } else {
          // Wait briefly for hash fragment auto-processing, then give up
          setTimeout(() => {
            supabase.auth.getSession().then(({ data: { session: s } }) => {
              if (!s) {
                setError('No active reset session. Please request a new password reset.')
              }
              setExchanging(false)
            })
          }, 1500)
        }
      })
    }

    return () => subscription.unsubscribe()
  }, [searchParams])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { error: err } = await supabase.auth.updateUser({ password })
    setLoading(false)
    if (err) {
      setError(err.message)
      return
    }
    await supabase.auth.signOut()
    router.push('/auth/login?message=password_updated')
  }

  if (exchanging) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-20">
        <div className="w-full max-w-sm text-center">
          <p className="text-sm text-gray-500">Verifying reset link…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-20">
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-8">
          <Link href="/">
            <Image src="/logo.png" alt="SubletBuff" width={160} height={40} className="h-10 w-auto" unoptimized />
          </Link>
        </div>

        <div className="bg-white rounded-card shadow-card p-8">
          <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center mx-auto mb-4">
            <Lock className="w-6 h-6 text-primary-600" />
          </div>

          <h1 className="text-xl font-semibold text-gray-900 mb-2 text-center">Set new password</h1>
          <p className="text-sm text-gray-500 text-center mb-6">
            Enter your new password below.
          </p>

          {error && (
            <div className="flex items-start gap-2 bg-red-50 text-error text-sm p-3 rounded-button mb-4">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-800">New Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min. 8 characters"
                  className="w-full pl-9 pr-10 py-2 text-sm border border-gray-200 rounded-button focus:outline-none focus:ring-2 focus:ring-primary-500"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-800">Confirm Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={8}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
                  className="w-full pl-9 pr-10 py-2 text-sm border border-gray-200 rounded-button focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>

            <Button type="submit" variant="primary" size="md" className="w-full" disabled={loading}>
              {loading ? 'Updating…' : 'Update Password'}
            </Button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-4">
            <Link href="/auth/login" className="text-primary-600 font-medium hover:underline">
              Back to sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  )
}
