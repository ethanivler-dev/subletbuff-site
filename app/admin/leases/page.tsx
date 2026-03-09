'use client'

import { useEffect, useState, useCallback } from 'react'
import Image from 'next/image'
import { RefreshCw, FileText, CheckCircle, XCircle, Clock, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { formatDate } from '@/lib/utils'

interface LeaseListing {
  id: string
  title: string | null
  neighborhood: string | null
  lease_status: string | null
  lease_document_path: string | null
  created_at: string | null
  lister_id: string | null
  user_id: string | null
  listing_photos: Array<{ url: string; display_order: number; is_primary: boolean }> | null
}

interface ListerProfile {
  full_name: string | null
  email: string | null
}

export default function LeaseReviewPage() {
  const [listings, setListings] = useState<LeaseListing[]>([])
  const [profiles, setProfiles] = useState<Record<string, ListerProfile>>({})
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [viewingDoc, setViewingDoc] = useState<{ listingId: string; url: string; type: string } | null>(null)
  const [tab, setTab] = useState<'pending' | 'all'>('pending')

  const fetchListings = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/admin/listings?status=all')
    if (res.ok) {
      const data = await res.json()
      const filtered = (data.listings as LeaseListing[]).filter((l) =>
        tab === 'pending'
          ? l.lease_status === 'pending'
          : l.lease_status && l.lease_status !== 'none'
      )
      setListings(filtered)
      setProfiles(data.profiles)
    }
    setLoading(false)
  }, [tab])

  useEffect(() => {
    fetchListings()
  }, [fetchListings])

  async function viewDocument(listingId: string, path: string) {
    const res = await fetch(`/api/admin/lease-document/${listingId}`)
    if (res.ok) {
      const data = await res.json()
      const ext = path.split('.').pop()?.toLowerCase() ?? ''
      const type = ext === 'pdf' ? 'pdf' : 'image'
      setViewingDoc({ listingId, url: data.url, type })
    } else {
      alert('Failed to load document')
    }
  }

  async function handleLeaseAction(listingId: string, action: 'verify' | 'reject') {
    setActionLoading(listingId)
    const leaseStatus = action === 'verify' ? 'verified' : 'rejected'
    const res = await fetch(`/api/admin/listings/${listingId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lease_status: leaseStatus }),
    })
    if (res.ok) {
      setListings((prev) =>
        prev.map((l) => l.id === listingId ? { ...l, lease_status: leaseStatus } : l)
      )
      if (viewingDoc?.listingId === listingId) setViewingDoc(null)
    } else {
      alert('Failed to update lease status')
    }
    setActionLoading(null)
  }

  function getOwner(l: LeaseListing) {
    const ownerId = l.lister_id ?? l.user_id
    if (!ownerId) return 'Unknown'
    const p = profiles[ownerId]
    return p?.full_name || p?.email || ownerId.slice(0, 8) + '...'
  }

  function getCoverUrl(l: LeaseListing) {
    if (!l.listing_photos?.length) return null
    const sorted = [...l.listing_photos].sort((a, b) => {
      if (a.is_primary && !b.is_primary) return -1
      if (!a.is_primary && b.is_primary) return 1
      return a.display_order - b.display_order
    })
    return sorted[0]?.url ?? null
  }

  function leaseStatusBadge(status: string | null) {
    if (status === 'pending') return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">Pending</span>
    if (status === 'verified') return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Verified</span>
    if (status === 'rejected') return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">Rejected</span>
    return null
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-serif text-2xl text-gray-900">Lease Reviews</h1>
          <p className="text-sm text-gray-500 mt-1">
            {loading ? 'Loading...' : `${listings.length} document${listings.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={fetchListings} disabled={loading}>
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white rounded-button border border-gray-200 p-1 mb-6 w-fit">
        <button
          onClick={() => setTab('pending')}
          className={['px-3 py-1.5 text-sm font-medium rounded-button transition-colors',
            tab === 'pending' ? 'bg-primary-600 text-white' : 'text-gray-600 hover:bg-gray-100',
          ].join(' ')}
        >
          Pending
        </button>
        <button
          onClick={() => setTab('all')}
          className={['px-3 py-1.5 text-sm font-medium rounded-button transition-colors',
            tab === 'all' ? 'bg-primary-600 text-white' : 'text-gray-600 hover:bg-gray-100',
          ].join(' ')}
        >
          All
        </button>
      </div>

      {!loading && listings.length === 0 && (
        <div className="bg-white rounded-card shadow-card p-12 text-center">
          <FileText className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <h2 className="text-lg font-semibold text-gray-900 mb-1">No lease documents to review</h2>
          <p className="text-sm text-gray-500">All caught up!</p>
        </div>
      )}

      {listings.length > 0 && (
        <div className="bg-white rounded-card shadow-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="text-left px-4 py-3 font-medium text-gray-500 w-12"></th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Listing</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Lister</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Status</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500 hidden md:table-cell">Created</th>
                <th className="text-right px-4 py-3 font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody>
              {listings.map((listing) => {
                const coverUrl = getCoverUrl(listing)
                const isActioning = actionLoading === listing.id

                return (
                  <tr key={listing.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="relative w-10 h-10 rounded overflow-hidden bg-gray-100 shrink-0">
                        {coverUrl ? (
                          <Image src={coverUrl} alt="" fill className="object-cover" sizes="40px" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Clock className="w-4 h-4 text-gray-300" />
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900 truncate max-w-[200px]">{listing.title || '(no title)'}</p>
                      <p className="text-xs text-gray-400">{listing.neighborhood ?? '—'}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{getOwner(listing)}</td>
                    <td className="px-4 py-3">{leaseStatusBadge(listing.lease_status)}</td>
                    <td className="px-4 py-3 hidden md:table-cell text-gray-500">
                      {listing.created_at ? formatDate(listing.created_at.split('T')[0]) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {listing.lease_document_path && (
                          <button
                            onClick={() => viewDocument(listing.id, listing.lease_document_path!)}
                            className="p-1.5 rounded hover:bg-gray-100 text-gray-500 transition-colors"
                            title="View document"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </button>
                        )}
                        {listing.lease_status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleLeaseAction(listing.id, 'verify')}
                              disabled={isActioning}
                              className="p-1.5 rounded hover:bg-green-100 text-green-600 transition-colors disabled:opacity-50"
                              title="Verify lease"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleLeaseAction(listing.id, 'reject')}
                              disabled={isActioning}
                              className="p-1.5 rounded hover:bg-red-100 text-red-500 transition-colors disabled:opacity-50"
                              title="Reject lease"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Document viewer overlay */}
      {viewingDoc && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setViewingDoc(null)} />
          <div className="fixed inset-8 bg-white rounded-xl shadow-2xl z-50 flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="font-medium text-gray-900">Lease Document</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleLeaseAction(viewingDoc.listingId, 'verify')}
                  disabled={actionLoading === viewingDoc.listingId}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
                >
                  Verify
                </button>
                <button
                  onClick={() => handleLeaseAction(viewingDoc.listingId, 'reject')}
                  disabled={actionLoading === viewingDoc.listingId}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
                >
                  Reject
                </button>
                <button
                  onClick={() => setViewingDoc(null)}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200"
                >
                  Close
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-auto p-4">
              {viewingDoc.type === 'pdf' ? (
                <iframe src={viewingDoc.url} className="w-full h-full min-h-[600px] rounded border border-gray-200" />
              ) : (
                <div className="flex items-center justify-center h-full">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={viewingDoc.url} alt="Lease document" className="max-w-full max-h-full object-contain rounded" />
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
