'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const UNIT_OPTIONS = ['1-5', '6-20', '21-50', '50+']
const REFERRAL_OPTIONS = [
  'CU Boulder referral',
  'Google',
  'Student referral',
  'Other',
]

export function OnboardingForm({
  defaultFullName,
  defaultPhone,
}: {
  defaultFullName: string
  defaultPhone: string
}) {
  const router = useRouter()
  const [fullName, setFullName] = useState(defaultFullName)
  const [company, setCompany] = useState('')
  const [phone, setPhone] = useState(defaultPhone)
  const [units, setUnits] = useState('')
  const [referral, setReferral] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/landlords/onboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: fullName,
          phone,
          company,
          units,
          referral_source: referral,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Something went wrong. Please try again.')
        setLoading(false)
        return
      }
    } catch {
      setError('Something went wrong. Please try again.')
      setLoading(false)
      return
    }

    router.push('/landlords/onboard/success')
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 rounded-xl shadow-sm border border-gray-200">
      <div>
        <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-1">
          Full name
        </label>
        <input
          id="fullName"
          type="text"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
        />
      </div>

      <div>
        <label htmlFor="company" className="block text-sm font-medium text-gray-700 mb-1">
          Company / Property management name
          <span className="text-gray-400 ml-1">(optional)</span>
        </label>
        <input
          id="company"
          type="text"
          value={company}
          onChange={(e) => setCompany(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
        />
      </div>

      <div>
        <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
          Phone number
          <span className="text-gray-400 ml-1">(optional)</span>
        </label>
        <input
          id="phone"
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
        />
      </div>

      <div>
        <label htmlFor="units" className="block text-sm font-medium text-gray-700 mb-1">
          Number of units managed
        </label>
        <select
          id="units"
          value={units}
          onChange={(e) => setUnits(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
        >
          <option value="">Select...</option>
          {UNIT_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="referral" className="block text-sm font-medium text-gray-700 mb-1">
          How did you hear about SubletBuff?
        </label>
        <select
          id="referral"
          value={referral}
          onChange={(e) => setReferral(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
        >
          <option value="">Select...</option>
          {REFERRAL_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      </div>

      {error && (
        <p className="text-red-600 text-sm">{error}</p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? 'Setting up...' : 'Continue'}
      </button>
    </form>
  )
}
