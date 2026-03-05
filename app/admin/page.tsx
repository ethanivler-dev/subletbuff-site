'use client'

import { useEffect, useState, useCallback } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { CheckCircle, XCircle, Clock, AlertCircle, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { formatRent, formatDate, sanitizeListingTitle, formatRoomType } from '@/lib/utils'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface PendingListing {
  id: string
  title: string | null
  room_type: string | null
  neighborhood: string | null
  rent_monthly: number | null
  monthly_rent: number | null
  deposit: number | null
  security_deposit: number | null
  created_at: string | null
  lister_id: string | null
  user_id: string | null
  description: string | null
  listing_photos: Array<{ url: string; display_order: number; is_primary: boolean }> | null
  photo_urls: string[] | null
}

interface ListerProfile {
  id: string
  full_name: string | null
  email?: string | null
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function AdminPage() {
  const router = useRouter()
  const [authState, setAuthState] = useState<'loading' | 'authorized' | 'unauthorized'>('loading')
  const [listings, setListings] = useState<PendingListing[]>([])
  const [profiles, setProfiles] = useState<Record<string, ListerProfile>>({})
  const [loadingListings, setLoadingListings] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [rejectionReasons, setRejectionReasons] = useState<Record<string, string>>({})
  const [expandedRejection, setExpandedRejection] = useState<string | null>(null)

  /* ---- Auth check ---- */
  useEffect(() => {
    async function checkAdmin() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.replace('/')
        return
      }

      // Check admins table
      const { data: adminRow } = await supabase
        .from('admins')
        .select('id')
        .eq('id', user.id)
        .maybeSingle()

      if (!adminRow) {
        router.replace('/')
        return
      }

      setAuthState('authorized')
    }

    checkAdmin()
  }, [router])

  /* ---- Fetch pending listings ---- */
  const fetchPending = useCallback(async () => {
    setLoadingListings(true)
    const supabase = createClient()

    const { data, error } = await supabase
      .from('listings')
      .select(`
        id, title, room_type, neighborhood,
        rent_monthly, monthly_rent, deposit, security_deposit,
        created_at, lister_id, user_id, description,
        listing_photos(url, display_order, is_primary),
        photo_urls
      `)
      .eq('status', 'pending')
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Failed to fetch pending listings:', error)
      setLoadingListings(false)
      return
    }

    const rows = (data ?? []) as unknown as PendingListing[]
    setListings(rows)

    // Fetch lister profiles
    const ownerIds = Array.from(new Set(rows.map((r) => r.lister_id ?? r.user_id).filter(Boolean))) as string[]
    if (ownerIds.length > 0) {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', ownerIds)

      if (profileData) {
        const map: Record<string, ListerProfile> = {}
        for (const p of profileData as ListerProfile[]) {
          map[p.id] = p
        }
        setProfiles(map)
      }
    }

    setLoadingListings(false)
  }, [])

  useEffect(() => {
    if (authState === 'authorized') fetchPending()
  }, [authState, fetchPending])

  /* ---- Actions ---- */
  async function handleApprove(id: string) {
    setActionLoading(id)
    const supabase = createClient()
    const { error } = await supabase
      .from('listings')
      .update({ status: 'approved' })
      .eq('id', id)

    if (error) {
      alert(`Approve failed: ${error.message}`)
    } else {
      setListings((prev) => prev.filter((l) => l.id !== id))
    }
    setActionLoading(null)
  }

  async function handleReject(id: string) {
    setActionLoading(id)
    const supabase = createClient()
    const reason = rejectionReasons[id]?.trim() || null

    const { error } = await supabase
      .from('listings')
      .update({
        status: 'rejected',
        ...(reason ? { rejection_reason: reason } : {}),
      })
      .eq('id', id)

    if (error) {
      // If rejection_reason column doesn't exist, try without it
      if (error.message.includes('rejection_reason')) {
        const { error: err2 } = await supabase
          .from('listings')
          .update({ status: 'rejected' })
          .eq('id', id)

        if (err2) {
          alert(`Reject failed: ${err2.message}`)
          setActionLoading(null)
          return
        }
      } else {
        alert(`Reject failed: ${error.message}`)
        setActionLoading(null)
        return
      }
    }

    setListings((prev) => prev.filter((l) => l.id !== id))
    setRejectionReasons((prev) => {
      const next = { ...prev }
      delete next[id]
      return next
    })
    setExpandedRejection(null)
    setActionLoading(null)
  }

  /* ---- Loading state ---- */
  if (authState === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex items-center gap-3 text-gray-500">
          <div className="w-5 h-5 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm">Checking authorization…</span>
        </div>
      </div>
    )
  }

  if (authState === 'unauthorized') return null

  /* ---- Helpers ---- */
  function getPhotos(listing: PendingListing) {
    if (listing.listing_photos && listing.listing_photos.length > 0) {
      return [...listing.listing_photos].sort((a, b) => {
        if (a.is_primary && !b.is_primary) return -1
        if (!a.is_primary && b.is_primary) return 1
        return a.display_order - b.display_order
      })
    }
    return (listing.photo_urls ?? []).map((url, i) => ({
      url,
      display_order: i,
      is_primary: i === 0,
    }))
  }

  function getListerName(listing: PendingListing) {
    const ownerId = listing.lister_id ?? listing.user_id
    if (!ownerId) return 'Unknown'
    return profiles[ownerId]?.full_name ?? 'Unknown'
  }

  function getRent(listing: PendingListing) {
    const amount = listing.rent_monthly ?? listing.monthly_rent
    if (!amount) return '—'
    return formatRent(amount)
  }

  /* ---- Render ---- */
  return (
    <div className="min-h-screen bg-gray-50 pt-20 pb-16">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-serif text-3xl text-gray-900">Admin Review</h1>
            <p className="text-sm text-gray-500 mt-1">
              {loadingListings ? 'Loading…' : (
                <>
                  <span className="font-semibold text-gray-900">{listings.length}</span> pending listing{listings.length !== 1 ? 's' : ''}
                </>
              )}
            </p>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={fetchPending}
            disabled={loadingListings}
          >
            <RefreshCw className={`w-4 h-4 ${loadingListings ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Empty state */}
        {!loadingListings && listings.length === 0 && (
          <div className="bg-white rounded-card shadow-card p-12 text-center">
            <CheckCircle className="w-12 h-12 text-success mx-auto mb-3" />
            <h2 className="text-lg font-semibold text-gray-900 mb-1">All caught up!</h2>
            <p className="text-sm text-gray-500">No pending listings to review.</p>
          </div>
        )}

        {/* Listings */}
        <div className="flex flex-col gap-4">
          {listings.map((listing) => {
            const photos = getPhotos(listing)
            const coverUrl = photos[0]?.url
            const roomType = listing.room_type ?? 'private_room'
            const neighborhood = listing.neighborhood ?? 'Boulder'
            const title = sanitizeListingTitle(listing.title, roomType, neighborhood)
            const isActioning = actionLoading === listing.id
            const showRejectInput = expandedRejection === listing.id

            return (
              <div
                key={listing.id}
                className="bg-white rounded-card shadow-card overflow-hidden"
              >
                <div className="flex flex-col sm:flex-row">
                  {/* Photo */}
                  <div className="relative w-full sm:w-48 h-48 sm:h-auto flex-shrink-0 bg-gray-100">
                    {coverUrl ? (
                      <Image
                        src={coverUrl}
                        alt={title}
                        fill
                        className="object-cover"
                        sizes="(max-width: 640px) 100vw, 192px"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        <Clock className="w-8 h-8" />
                      </div>
                    )}
                    {photos.length > 1 && (
                      <span className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-0.5 rounded-full">
                        {photos.length} photos
                      </span>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 p-5 flex flex-col">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div>
                        <h3 className="font-semibold text-gray-900 text-base leading-tight">{title}</h3>
                        <p className="text-sm text-gray-500 mt-0.5">
                          {formatRoomType(roomType)} · {neighborhood}
                        </p>
                      </div>
                      <span className="text-lg font-semibold text-primary-600 flex-shrink-0">
                        {getRent(listing)}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 mb-3">
                      <span>Lister: <span className="text-gray-700 font-medium">{getListerName(listing)}</span></span>
                      {listing.deposit || listing.security_deposit ? (
                        <span>Deposit: <span className="text-gray-700">${listing.deposit ?? listing.security_deposit}</span></span>
                      ) : null}
                      {listing.created_at && (
                        <span>Submitted: <span className="text-gray-700">{formatDate(listing.created_at.split('T')[0])}</span></span>
                      )}
                    </div>

                    {listing.description && (
                      <p className="text-sm text-gray-600 line-clamp-2 mb-4">
                        {listing.description}
                      </p>
                    )}

                    {/* Photo thumbnails */}
                    {photos.length > 1 && (
                      <div className="flex gap-1.5 mb-4 overflow-x-auto pb-1">
                        {photos.slice(0, 6).map((p, i) => (
                          <div key={p.url + i} className="relative w-12 h-12 rounded overflow-hidden flex-shrink-0 bg-gray-100">
                            <Image src={p.url} alt="" fill className="object-cover" sizes="48px" />
                          </div>
                        ))}
                        {photos.length > 6 && (
                          <div className="w-12 h-12 rounded bg-gray-100 flex items-center justify-center text-xs text-gray-500 flex-shrink-0">
                            +{photos.length - 6}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Actions */}
                    <div className="mt-auto flex flex-col gap-2">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => handleApprove(listing.id)}
                          disabled={isActioning}
                        >
                          <CheckCircle className="w-4 h-4" />
                          {isActioning ? 'Processing…' : 'Approve'}
                        </Button>
                        <button
                          onClick={() => setExpandedRejection(showRejectInput ? null : listing.id)}
                          disabled={isActioning}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-button border border-red-200 text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                        >
                          <XCircle className="w-4 h-4" />
                          Reject
                          {showRejectInput ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        </button>
                      </div>

                      {/* Rejection reason input */}
                      {showRejectInput && (
                        <div className="flex items-center gap-2 mt-1">
                          <input
                            type="text"
                            placeholder="Rejection reason (optional)"
                            value={rejectionReasons[listing.id] ?? ''}
                            onChange={(e) => setRejectionReasons((prev) => ({ ...prev, [listing.id]: e.target.value }))}
                            className="flex-1 px-3 py-1.5 text-sm border border-gray-200 rounded-button focus:outline-none focus:ring-2 focus:ring-red-500"
                            maxLength={500}
                          />
                          <button
                            onClick={() => handleReject(listing.id)}
                            disabled={isActioning}
                            className="px-3 py-1.5 text-sm font-medium rounded-button bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-50"
                          >
                            {isActioning ? 'Rejecting…' : 'Confirm Reject'}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
