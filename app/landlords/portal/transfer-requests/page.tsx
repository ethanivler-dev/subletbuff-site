'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { CheckCircle, XCircle, Loader2, Search, ChevronDown, ChevronRight } from 'lucide-react'
import { EmptyState } from '@/components/landlord/EmptyState'

type Status = 'pending' | 'approved' | 'denied'
type FilterTab = 'all' | Status

interface TransferRequest {
  id: string
  listing_id: string
  landlord_id: string
  applicant_name: string
  applicant_email: string
  unit: string | null
  status: Status
  created_at: string
}

const TABS: { value: FilterTab; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'denied', label: 'Denied' },
]

function StatusBadge({ status }: { status: Status }) {
  const styles = {
    pending: 'bg-yellow-100 text-yellow-800',
    approved: 'bg-green-100 text-green-800',
    denied: 'bg-red-100 text-red-800',
  }

  return (
    <span className={['inline-flex items-center px-2.5 py-0.5 text-xs font-medium rounded-badge capitalize', styles[status]].join(' ')}>
      {status}
    </span>
  )
}

export default function TransferRequestsPage() {
  const router = useRouter()
  const [requests, setRequests] = useState<TransferRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<FilterTab>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  useEffect(() => {
    if (process.env.NEXT_PUBLIC_LANDLORD_PORTAL !== 'true') {
      router.replace('/')
      return
    }

    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.replace('/')
        return
      }

      const { data } = await supabase
        .from('transfer_requests')
        .select('*')
        .eq('landlord_id', user.id)
        .order('created_at', { ascending: false })

      setRequests((data ?? []) as TransferRequest[])
      setLoading(false)
    }

    load()
  }, [router])

  const filtered = requests
    .filter((r) => activeTab === 'all' || r.status === activeTab)
    .filter((r) =>
      searchQuery === '' ||
      r.applicant_name.toLowerCase().includes(searchQuery.toLowerCase())
    )

  async function updateStatus(id: string, newStatus: 'approved' | 'denied') {
    setUpdatingId(id)
    const previous = requests
    setRequests((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: newStatus } : r))
    )

    const supabase = createClient()
    const { error } = await supabase
      .from('transfer_requests')
      .update({ status: newStatus })
      .eq('id', id)

    if (error) {
      setRequests(previous)
    }
    setUpdatingId(null)
  }

  if (loading) {
    return (
      <div className="p-6 lg:p-8 space-y-6">
        <div className="h-7 w-48 bg-gray-200 rounded animate-pulse" />
        <div className="h-10 w-full max-w-xs bg-gray-200 rounded animate-pulse" />
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-16 bg-gray-200 rounded-card animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Transfer Requests</h1>
        <p className="text-sm text-gray-500 mt-1">{requests.length} total request{requests.length !== 1 ? 's' : ''}</p>
      </div>

      {/* Filter tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex bg-white rounded-lg border border-gray-200 p-0.5">
          {TABS.map((tab) => {
            const count = tab.value === 'all'
              ? requests.length
              : requests.filter((r) => r.status === tab.value).length
            return (
              <button
                key={tab.value}
                onClick={() => setActiveTab(tab.value)}
                className={[
                  'px-3 py-1.5 text-xs font-medium rounded-md transition-colors',
                  activeTab === tab.value
                    ? 'bg-primary-50 text-primary-700'
                    : 'text-gray-500 hover:text-gray-700',
                ].join(' ')}
              >
                {tab.label} ({count})
              </button>
            )
          })}
        </div>

        {/* Search */}
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500"
          />
        </div>
      </div>

      {/* Results */}
      {filtered.length === 0 ? (
        <EmptyState
          title={searchQuery ? 'No matching requests' : 'No requests found'}
          description={searchQuery ? `No requests match "${searchQuery}"` : 'No transfer requests in this category yet.'}
        />
      ) : (
        <div className="bg-white rounded-card border border-gray-200 shadow-card overflow-hidden divide-y divide-gray-100">
          {filtered.map((req) => {
            const isExpanded = expandedId === req.id
            return (
              <div key={req.id}>
                {/* Row */}
                <button
                  onClick={() => setExpandedId(isExpanded ? null : req.id)}
                  className="w-full text-left px-5 py-3.5 hover:bg-gray-50/50 transition-colors flex items-center gap-4"
                >
                  <span className="text-gray-400">
                    {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </span>
                  <span className="font-medium text-gray-900 min-w-[120px]">{req.applicant_name}</span>
                  <span className="text-sm text-gray-500 hidden sm:inline">{req.applicant_email}</span>
                  <span className="text-sm text-gray-500 hidden md:inline">{req.unit || '—'}</span>
                  <span className="text-xs text-gray-400 hidden lg:inline">
                    {new Date(req.created_at).toLocaleDateString('en-US', {
                      month: 'short', day: 'numeric', year: 'numeric',
                    })}
                  </span>
                  <span className="ml-auto">
                    <StatusBadge status={req.status} />
                  </span>
                </button>

                {/* Expanded detail */}
                {isExpanded && (
                  <div className="px-5 pb-4 pl-14 space-y-3 bg-gray-50/30">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-xs font-medium text-gray-500">Applicant Name</span>
                        <p className="text-gray-900">{req.applicant_name}</p>
                      </div>
                      <div>
                        <span className="text-xs font-medium text-gray-500">Email</span>
                        <p className="text-gray-900">{req.applicant_email}</p>
                      </div>
                      <div>
                        <span className="text-xs font-medium text-gray-500">Unit</span>
                        <p className="text-gray-900">{req.unit || '—'}</p>
                      </div>
                      <div>
                        <span className="text-xs font-medium text-gray-500">Date Submitted</span>
                        <p className="text-gray-900">
                          {new Date(req.created_at).toLocaleDateString('en-US', {
                            weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
                          })}
                        </p>
                      </div>
                      <div>
                        <span className="text-xs font-medium text-gray-500">Status</span>
                        <div className="mt-0.5"><StatusBadge status={req.status} /></div>
                      </div>
                      <div>
                        <span className="text-xs font-medium text-gray-500">Listing ID</span>
                        <p className="text-gray-900 font-mono text-xs">{req.listing_id}</p>
                      </div>
                    </div>

                    {req.status === 'pending' && (
                      <div className="flex items-center gap-2 pt-1">
                        {updatingId === req.id ? (
                          <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                        ) : (
                          <>
                            <button
                              onClick={(e) => { e.stopPropagation(); updateStatus(req.id, 'approved') }}
                              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-button bg-green-50 text-green-700 hover:bg-green-100 transition-colors"
                            >
                              <CheckCircle className="w-3.5 h-3.5" />
                              Approve
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); updateStatus(req.id, 'denied') }}
                              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-button bg-red-50 text-red-700 hover:bg-red-100 transition-colors"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              Deny
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
