'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Building2, ArrowRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function LandlordRegisterPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({ company_name: '', phone: '' })

  useEffect(() => {
    async function check() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.replace('/auth/login?next=/landlords/register')
        return
      }
      // Check if already registered
      const { data: existing } = await supabase
        .from('landlord_profiles')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle()
      if (existing) {
        router.replace('/landlords/dashboard')
        return
      }
      setLoading(false)
    }
    check()
  }, [router])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not logged in')

      const { error: insertErr } = await supabase
        .from('landlord_profiles')
        .insert({
          user_id: user.id,
          company_name: form.company_name || null,
          phone: form.phone || null,
        })

      if (insertErr) {
        console.error('[landlord register]', insertErr)
        throw new Error('Failed to create profile')
      }

      router.push('/landlords/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-5 h-5 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-24 pb-16 px-4">
      <div className="max-w-md mx-auto">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-full bg-primary-100 flex items-center justify-center mx-auto mb-4">
            <Building2 className="w-7 h-7 text-primary-600" />
          </div>
          <h1 className="font-serif text-2xl font-bold text-gray-900">Complete Your Landlord Profile</h1>
          <p className="text-sm text-gray-500 mt-2">
            Set up your profile to access the landlord dashboard and manage properties.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-card shadow-card p-6 flex flex-col gap-5">
          {error && (
            <div className="bg-red-50 text-red-700 text-sm p-3 rounded-button">{error}</div>
          )}

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-800">Company / Property Management Name</label>
            <input
              type="text"
              value={form.company_name}
              onChange={(e) => setForm((f) => ({ ...f, company_name: e.target.value }))}
              placeholder="Optional"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-button focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-800">Phone</label>
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              placeholder="Optional"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-button focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 text-base font-semibold rounded-button bg-primary-600 text-white hover:bg-primary-700 transition-colors disabled:opacity-50"
          >
            {submitting ? 'Setting up…' : 'Continue to Dashboard'}
            <ArrowRight className="w-4 h-4" />
          </button>

          <p className="text-xs text-center text-gray-400">
            Already registered?{' '}
            <Link href="/landlords/dashboard" className="text-primary-600 hover:underline">
              Go to dashboard
            </Link>
          </p>
        </form>
      </div>
    </div>
  )
}
