'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeft, CheckCircle2, XCircle, Clock, MapPin, Calendar } from 'lucide-react'
import { formatRent, formatDateRange, formatRoomType, sanitizeListingTitle } from '@/lib/utils'

interface SubletRequest {
  id: string
  status: string
  decision_notes: string | null
  requested_at: string
  decided_at: string | null
  listings: {
    id: string
    title: string | null
    room_type: string
    neighborhood: string
    rent_monthly: number
    available_from: string
    available_to: string
    listing_photos: Array<{ url: string; display_order: number; is_primary: boolean }> | null
  } | null
  properties: { id: string; address: string } | null
  subtenant: { email: string } | null
}

type FilterStatus = 'all' | 'pending' | 'approved' | 'rejected'

export default function RequestsPage() {
  const router = useRouter()
  const [requests, setRequests] = useState<SubletRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<FilterStatus>('all')
  const [rejectingId, setRejectingId] = useState<string | null>(null)
  const [rejectNotes, setRejectNotes] = useState('')

  useEffect(() => {
    async function load() {
      const url = filter === 'all' ? '/api/landlords/requests' : `/api/landlords/requests?status=${filter}`
      const res = await fetch(url)
      if (res.status === 401) { router.replace('/auth/login?next=/landlords/dashboard/requests'); return }
      if (res.status === 403) { router.replace('/landlords/register'); return }
      if (res.ok) {
        const data = await res.json()
        setRequests(data.map((r: Record<string, unknown>) => ({
          ...r,
          listings: Array.isArray(r.listings) ? r.listings[0] ?? null : r.listings,
          properties: Array.isArray(r.properties) ? r.properties[0] ?? null : r.properties,
          subtenant: Array.isArray(r.subtenant) ? r.subtenant[0] ?? null : r.subtenant,
        })))
      }
      setLoading(false)
    }
    load()
  }, [router, filter])

  async function handleApprove(id: string) {
    const res = await fetch(`/api/landlords/requests/${id}/approve`, { method: 'POST' })
    if (res.ok) {
      setRequests((prev) =>
        prev.map((r) => r.id === id ? { ...r, status: 'approved', decided_at: new Date().toISOString() } : r)
      )
    }
  }

  async function handleReject(id: string) {
    const res = await fetch(`/api/landlords/requests/${id}/reject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes: rejectNotes || null }),
    })
    if (res.ok) {
      setRequests((prev) =>
        prev.map((r) => r.id === id ? { ...r, status: 'rejected', decision_notes: rejectNotes || null, decided_at: new Date().toISOString() } : r)
      )
      setRejectingId(null)
      setRejectNotes('')
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
    <div className="min-h-screen bg-gray-50 pt-20 pb-16">
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        <Link href="/landlords/dashboard" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4">
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </Link>

        <h1 className="font-serif text-2xl font-bold text-gray-900 mb-6">Sublet Requests</h1>

        {/* Filter tabs */}
        <div className="flex gap-1 mb-6 bg-white rounded-button border border-gray-200 p-1 w-fit">
          {(['all', 'pending', 'approved', 'rejected'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={[
                'px-3 py-1.5 text-sm rounded-button transition-colors capitalize',
                filter === s
                  ? 'bg-primary-600 text-white'
                  : 'text-gray-600 hover:bg-gray-50',
              ].join(' ')}
            >
              {s}
            </button>
          ))}
        </div>

        {requests.length === 0 ? (
          <div className="bg-white rounded-card shadow-card p-12 text-center">
            <Clock className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="text-sm text-gray-500">
              {filter === 'all' ? 'No sublet requests yet' : `No ${filter} requests`}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {requests.map((req) => {
              const listing = req.listings
              const photos = listing?.listing_photos
                ? [...listing.listing_photos].sort((a, b) => {
                    if (a.is_primary && !b.is_primary) return -1
                    if (!a.is_primary && b.is_primary) return 1
                    return a.display_order - b.display_order
                  })
                : []
              const coverUrl = photos[0]?.url
              const title = listing
                ? sanitizeListingTitle(listing.title, listing.room_type, listing.neighborhood)
                : 'Unknown Listing'

              return (
                <div key={req.id} className="bg-white rounded-card shadow-card p-5">
                  <div className="flex gap-4">
                    {/* Listing thumbnail */}
                    <div className="relative w-20 h-16 rounded overflow-hidden bg-gray-100 flex-shrink-0">
                      {coverUrl ? (
                        <Image src={coverUrl} alt={title} fill className="object-cover" sizes="80px" />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-primary-100 to-primary-200" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      {listing && (
                        <Link
                          href={`/listings/${listing.id}`}
                          className="text-sm font-semibold text-gray-900 hover:text-primary-600 line-clamp-1"
                        >
                          {title}
                        </Link>
                      )}
                      <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                        {listing && (
                          <>
                            <span className="flex items-center gap-0.5">
                              <MapPin className="w-3 h-3" /> {listing.neighborhood}
                            </span>
                            <span>{formatRoomType(listing.room_type)}</span>
                            <span>{formatRent(listing.rent_monthly)}</span>
                          </>
                        )}
                      </div>
                      {listing && (
                        <div className="flex items-center gap-1 text-xs text-gray-400 mt-0.5">
                          <Calendar className="w-3 h-3" />
                          <span>{formatDateRange(listing.available_from, listing.available_to)}</span>
                        </div>
                      )}
                      {req.properties && (
                        <p className="text-xs text-gray-400 mt-0.5">Property: {req.properties.address}</p>
                      )}
                      {req.subtenant && (
                        <p className="text-xs text-gray-400 mt-0.5">Subtenant: {req.subtenant.email}</p>
                      )}
                    </div>

                    {/* Status / Actions */}
                    <div className="flex flex-col items-end gap-2 flex-shrink-0">
                      {req.status === 'pending' ? (
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleApprove(req.id)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-button bg-green-600 text-white hover:bg-green-700 transition-colors"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                          </button>
                          <button
                            onClick={() => setRejectingId(rejectingId === req.id ? null : req.id)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-button bg-white text-red-600 border border-red-200 hover:bg-red-50 transition-colors"
                          >
                            <XCircle className="w-3.5 h-3.5" /> Reject
                          </button>
                        </div>
                      ) : (
                        <span className={[
                          'text-xs font-medium px-2 py-0.5 rounded-badge',
                          req.status === 'approved' ? 'text-green-700 bg-green-100' : 'text-red-700 bg-red-100',
                        ].join(' ')}>
                          {req.status === 'approved' ? 'Approved' : 'Rejected'}
                        </span>
                      )}
                      <span className="text-xs text-gray-400">
                        {new Date(req.requested_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  {/* Reject notes input */}
                  {rejectingId === req.id && (
                    <div className="mt-3 pt-3 border-t border-gray-100 flex gap-2">
                      <input
                        type="text"
                        value={rejectNotes}
                        onChange={(e) => setRejectNotes(e.target.value)}
                        placeholder="Rejection reason (optional)"
                        className="flex-1 px-3 py-1.5 text-sm border border-gray-200 rounded-button focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                      <button
                        onClick={() => handleReject(req.id)}
                        className="px-3 py-1.5 text-xs font-medium rounded-button bg-red-600 text-white hover:bg-red-700 transition-colors"
                      >
                        Confirm Reject
                      </button>
                    </div>
                  )}

                  {req.decision_notes && req.status === 'rejected' && (
                    <p className="mt-2 text-xs text-gray-500 italic">Note: {req.decision_notes}</p>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
