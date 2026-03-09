'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Building2, Clock, CheckCircle2, Home, ArrowRight } from 'lucide-react'

interface DashboardStats {
  company_name: string | null
  plan_tier: string
  total_properties: number
  pending_requests: number
  approved_requests: number
}

export default function LandlordDashboardPage() {
  const router = useRouter()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const res = await fetch('/api/landlords/dashboard')
      if (res.status === 401) {
        router.replace('/auth/login?next=/landlords/dashboard')
        return
      }
      if (res.status === 403) {
        router.replace('/landlords/register')
        return
      }
      if (res.ok) {
        setStats(await res.json())
      }
      setLoading(false)
    }
    load()
  }, [router])

  if (loading || !stats) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex items-center gap-3 text-gray-500">
          <div className="w-5 h-5 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm">Loading dashboard…</span>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-20 pb-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-gray-900">
            {stats.company_name ? `Welcome, ${stats.company_name}` : 'Landlord Dashboard'}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage your properties and review sublet requests.
          </p>
        </div>

        {/* Stats cards */}
        <div className="grid sm:grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-card shadow-card p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-full bg-primary-50 flex items-center justify-center">
                <Home className="w-5 h-5 text-primary-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.total_properties}</p>
                <p className="text-xs text-gray-500">Properties</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-card shadow-card p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center">
                <Clock className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.pending_requests}</p>
                <p className="text-xs text-gray-500">Pending Requests</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-card shadow-card p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.approved_requests}</p>
                <p className="text-xs text-gray-500">Approved</p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick links */}
        <div className="flex flex-col gap-3">
          <Link
            href="/landlords/dashboard/properties"
            className="flex items-center justify-between bg-white rounded-card shadow-card p-5 hover:shadow-card-hover transition-shadow group"
          >
            <div className="flex items-center gap-4">
              <div className="w-11 h-11 rounded-full bg-primary-50 flex items-center justify-center">
                <Building2 className="w-5 h-5 text-primary-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">Manage Properties</p>
                <p className="text-xs text-gray-500">Add, edit, or remove properties</p>
              </div>
            </div>
            <ArrowRight className="w-5 h-5 text-gray-400 group-hover:translate-x-0.5 transition-transform" />
          </Link>

          <Link
            href="/landlords/dashboard/requests"
            className="flex items-center justify-between bg-white rounded-card shadow-card p-5 hover:shadow-card-hover transition-shadow group"
          >
            <div className="flex items-center gap-4">
              <div className="w-11 h-11 rounded-full bg-amber-50 flex items-center justify-center">
                <Clock className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">Sublet Requests</p>
                <p className="text-xs text-gray-500">
                  {stats.pending_requests > 0
                    ? `${stats.pending_requests} pending request${stats.pending_requests !== 1 ? 's' : ''} to review`
                    : 'Review and approve sublet requests'}
                </p>
              </div>
            </div>
            <ArrowRight className="w-5 h-5 text-gray-400 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>
      </div>
    </div>
  )
}
