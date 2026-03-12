'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { formatRent, formatDate, sanitizeListingTitle, formatRoomType } from '@/lib/utils'
import {
  Eye, Heart, MessageSquare, TrendingUp,
  Plus, Star, ArrowLeft, ExternalLink, Pencil,
  Pause, Play, CheckCircle, Trash2, MoreVertical,
  X, RotateCcw,
} from 'lucide-react'
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend,
} from 'recharts'
import { useToast } from '@/components/ui/Toast'
import type { User as AuthUser } from '@supabase/supabase-js'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface UserListing {
  id: string
  title: string | null
  room_type: string
  neighborhood: string
  rent_monthly: number | null
  monthly_rent: number | null
  status: string
  paused: boolean
  filled: boolean
  created_at: string
  listing_photos: Array<{ url: string; is_primary: boolean; display_order: number }> | null
  views: number
  saves: number
  inquiries: number
}

interface RecentInquiry {
  id: string
  message: string
  created_at: string
  listing_id: string
  listing_title: string
  listing_neighborhood: string
  renter_name: string | null
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function statusInfo(listing: UserListing): { label: string; color: string } {
  if (listing.filled) return { label: 'Filled', color: 'text-blue-700 bg-blue-100' }
  if (listing.paused) return { label: 'Paused', color: 'text-gray-600 bg-gray-100' }
  switch (listing.status) {
    case 'approved': return { label: 'Active', color: 'text-green-700 bg-green-100' }
    case 'pending':  return { label: 'Pending', color: 'text-amber-700 bg-amber-100' }
    case 'rejected': return { label: 'Rejected', color: 'text-red-700 bg-red-100' }
    default:         return { label: listing.status, color: 'text-gray-600 bg-gray-100' }
  }
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function ListerDashboardPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [listings, setListings] = useState<UserListing[]>([])
  const [recentInquiries, setRecentInquiries] = useState<RecentInquiry[]>([])
  const [chartData, setChartData] = useState<Array<{ date: string; views: number; inquiries: number }>>([])

  const totalViews = listings.reduce((s, l) => s + l.views, 0)
  const totalInquiries = listings.reduce((s, l) => s + l.inquiries, 0)
  const conversionRate =
    totalViews > 0 ? ((totalInquiries / totalViews) * 100).toFixed(1) : '—'

  /* ---- Fetch data ---- */
  const fetchData = useCallback(async (userId: string) => {
    const supabase = createClient()

    const { data: listingsData } = await supabase
      .from('listings')
      .select(`
        id, title, room_type, neighborhood,
        rent_monthly, monthly_rent, status, paused, filled, created_at,
        listing_photos (url, is_primary, display_order)
      `)
      .or(`user_id.eq.${userId},lister_id.eq.${userId}`)
      .order('created_at', { ascending: false })

    if (!listingsData || listingsData.length === 0) {
      setLoading(false)
      return
    }

    const listingIds = listingsData.map((l: any) => l.id as string)

    const [viewsRes, savesRes, inqCountRes, recentInqRes] = await Promise.all([
      supabase
        .from('listing_views')
        .select('listing_id')
        .in('listing_id', listingIds),
      supabase
        .from('saved_listings')
        .select('listing_id')
        .in('listing_id', listingIds),
      supabase
        .from('inquiries')
        .select('listing_id')
        .eq('lister_id', userId),
      supabase
        .from('inquiries')
        .select(`
          id, message, created_at, listing_id,
          listings (title, neighborhood, room_type),
          profiles (full_name)
        `)
        .eq('lister_id', userId)
        .order('created_at', { ascending: false })
        .limit(6),
    ])

    // Build count maps
    const viewsMap: Record<string, number> = {}
    for (const v of viewsRes.data ?? []) {
      viewsMap[v.listing_id] = (viewsMap[v.listing_id] ?? 0) + 1
    }
    const savesMap: Record<string, number> = {}
    for (const s of savesRes.data ?? []) {
      savesMap[s.listing_id] = (savesMap[s.listing_id] ?? 0) + 1
    }
    const inqMap: Record<string, number> = {}
    for (const i of inqCountRes.data ?? []) {
      inqMap[i.listing_id] = (inqMap[i.listing_id] ?? 0) + 1
    }

    setListings(
      listingsData.map((l: any) => ({
        ...l,
        listing_photos: l.listing_photos ?? null,
        views: viewsMap[l.id] ?? 0,
        saves: savesMap[l.id] ?? 0,
        inquiries: inqMap[l.id] ?? 0,
      }))
    )

    setRecentInquiries(
      (recentInqRes.data ?? []).map((inq: any) => {
        const listing = Array.isArray(inq.listings) ? inq.listings[0] : inq.listings
        const profile = Array.isArray(inq.profiles) ? inq.profiles[0] : inq.profiles
        return {
          id: inq.id,
          message: inq.message,
          created_at: inq.created_at,
          listing_id: inq.listing_id,
          listing_title: sanitizeListingTitle(
            listing?.title,
            listing?.room_type ?? '',
            listing?.neighborhood ?? ''
          ),
          listing_neighborhood: listing?.neighborhood ?? '',
          renter_name: profile?.full_name ?? null,
        }
      })
    )

    // Build chart data: views & inquiries per day over last 30 days
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const isoThirty = thirtyDaysAgo.toISOString()

    const [chartViews, chartInqs] = await Promise.all([
      supabase
        .from('listing_views')
        .select('created_at')
        .in('listing_id', listingIds)
        .gte('created_at', isoThirty),
      supabase
        .from('inquiries')
        .select('created_at')
        .eq('lister_id', userId)
        .gte('created_at', isoThirty),
    ])

    const dayMap: Record<string, { views: number; inquiries: number }> = {}
    for (let d = 0; d < 30; d++) {
      const date = new Date()
      date.setDate(date.getDate() - 29 + d)
      const key = date.toISOString().slice(0, 10)
      dayMap[key] = { views: 0, inquiries: 0 }
    }
    for (const v of chartViews.data ?? []) {
      const key = v.created_at.slice(0, 10)
      if (dayMap[key]) dayMap[key].views++
    }
    for (const i of chartInqs.data ?? []) {
      const key = i.created_at.slice(0, 10)
      if (dayMap[key]) dayMap[key].inquiries++
    }
    setChartData(
      Object.entries(dayMap).map(([date, counts]) => ({ date, ...counts }))
    )

    setLoading(false)
  }, [])

  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [openMenu, setOpenMenu] = useState<string | null>(null)
  const [bannerDismissed, setBannerDismissed] = useState(false)

  const hasActiveUnfilledListing = listings.some(
    (l) => l.status === 'approved' && !l.paused && !l.filled
  )

  async function patchListing(id: string, body: Record<string, unknown>) {
    setActionLoading(id)
    try {
      const res = await fetch(`/api/listings/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const err = await res.json()
        alert(`Update failed: ${err.error}`)
        return
      }
      setListings((prev) =>
        prev.map((l) => (l.id === id ? { ...l, ...body } as UserListing : l))
      )
    } finally {
      setActionLoading(null)
      setOpenMenu(null)
    }
  }

  async function deleteListing(id: string) {
    if (!window.confirm('Are you sure you want to permanently delete this listing? This cannot be undone.')) return
    setActionLoading(id)
    try {
      const res = await fetch(`/api/listings/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const err = await res.json()
        alert(`Delete failed: ${err.error}`)
        return
      }
      setListings((prev) => prev.filter((l) => l.id !== id))
    } finally {
      setActionLoading(null)
      setOpenMenu(null)
    }
  }

  /* ---- Auth check ---- */
  useEffect(() => {
    async function init() {
      const supabase = createClient()
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) {
        router.replace('/auth/login?next=/account/listings')
        return
      }
      setUser(authUser)
      await fetchData(authUser.id)
    }
    init()
  }, [router, fetchData])

  /* ---- Toast from edit redirect ---- */
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const toastParam = params.get('toast')
    if (toastParam === 'updated') {
      toast('Listing updated.', 'success')
      window.history.replaceState({}, '', '/account/listings')
    } else if (toastParam === 'resubmitted') {
      toast('Listing updated and resubmitted for review.', 'success')
      window.history.replaceState({}, '', '/account/listings')
    }
  }, [toast])

  /* ---- Loading ---- */
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex items-center gap-3 text-gray-500">
          <div className="w-5 h-5 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm">Loading dashboard…</span>
        </div>
      </div>
    )
  }

  if (!user) return null

  /* ---- Render ---- */
  return (
    <div className="min-h-screen bg-gray-50 pt-20 pb-16">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <Link
              href="/account"
              className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 mb-2 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Account
            </Link>
            <h1 className="font-serif text-3xl text-gray-900">Lister Dashboard</h1>
          </div>
          <Link href="/post">
            <Button variant="primary" size="sm">
              <Plus className="w-4 h-4" />
              New Listing
            </Button>
          </Link>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-card shadow-card p-5">
            <div className="flex items-center gap-2 mb-1">
              <Eye className="w-4 h-4 text-primary-500" />
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Total Views</p>
            </div>
            <p className="text-3xl font-bold text-gray-900">{totalViews.toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-card shadow-card p-5">
            <div className="flex items-center gap-2 mb-1">
              <MessageSquare className="w-4 h-4 text-primary-500" />
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Total Inquiries</p>
            </div>
            <p className="text-3xl font-bold text-gray-900">{totalInquiries}</p>
          </div>
          <div className="bg-white rounded-card shadow-card p-5">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-4 h-4 text-primary-500" />
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Conversion Rate</p>
            </div>
            <p className="text-3xl font-bold text-gray-900">
              {conversionRate === '—' ? '—' : `${conversionRate}%`}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">inquiries / views</p>
          </div>
        </div>

        {/* Performance chart */}
        {chartData.length > 0 && (
          <div className="bg-white rounded-card shadow-card p-5 mb-6">
            <h2 className="text-base font-semibold text-gray-900 mb-4">Performance — Last 30 Days</h2>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11, fill: '#9CA3AF' }}
                    tickFormatter={(v: string) => {
                      const d = new Date(v + 'T00:00:00')
                      return `${d.getMonth() + 1}/${d.getDate()}`
                    }}
                    interval={4}
                  />
                  <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} allowDecimals={false} />
                  <Tooltip
                    labelFormatter={(v) => {
                      const d = new Date(String(v) + 'T00:00:00')
                      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                    }}
                    contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #E5E7EB' }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Line type="monotone" dataKey="views" stroke="#3B82F6" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="inquiries" stroke="#F59E0B" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Mark as Filled banner */}
        {hasActiveUnfilledListing && !bannerDismissed && (
          <div className="relative flex items-center gap-3 bg-primary-50 border border-primary-200 rounded-card px-5 py-4 mb-6">
            <CheckCircle className="w-5 h-5 text-primary-600 flex-shrink-0" />
            <p className="text-sm text-primary-800">
              <span className="font-medium">Did SubletBuff help you find someone?</span>{' '}
              Let us know by marking your listing as filled!
            </p>
            <button
              onClick={() => setBannerDismissed(true)}
              className="absolute top-3 right-3 p-1 rounded hover:bg-primary-100 text-primary-400 hover:text-primary-600 transition-colors"
              aria-label="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Listings table */}
        <div className="bg-white rounded-card shadow-card overflow-hidden mb-6">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-900">My Listings</h2>
            <span className="text-xs text-gray-400">
              {listings.length} listing{listings.length !== 1 ? 's' : ''}
            </span>
          </div>

          {listings.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-sm text-gray-500 mb-4">No listings yet</p>
              <Link href="/post">
                <Button variant="primary" size="sm">Post Your First Listing</Button>
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 text-left">
                    <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">
                      Listing
                    </th>
                    <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide text-center">
                      <span className="inline-flex items-center gap-1">
                        <Eye className="w-3.5 h-3.5" /> Views
                      </span>
                    </th>
                    <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide text-center">
                      <span className="inline-flex items-center gap-1">
                        <Heart className="w-3.5 h-3.5" /> Saves
                      </span>
                    </th>
                    <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide text-center">
                      <span className="inline-flex items-center gap-1">
                        <MessageSquare className="w-3.5 h-3.5" /> Inquiries
                      </span>
                    </th>
                    <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide text-center">
                      Status
                    </th>
                    <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">
                      Action
                    </th>
                    <th className="px-4 py-3" />
               </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {listings.map((listing) => {
                    const photos = listing.listing_photos
                      ? [...listing.listing_photos].sort((a, b) => {
                          if (a.is_primary && !b.is_primary) return -1
                          if (!a.is_primary && b.is_primary) return 1
                          return a.display_order - b.display_order
                        })
                      : []
                    const coverUrl = photos[0]?.url
                    const title = sanitizeListingTitle(
                      listing.title,
                      listing.room_type,
                      listing.neighborhood
                    )
                    const rent = listing.rent_monthly ?? listing.monthly_rent
                    const si = statusInfo(listing)
                    const isActive = listing.status === 'approved' && !listing.paused && !listing.filled
                    const isDisabled = actionLoading === listing.id

                    return (
                      <tr key={listing.id} className="hover:bg-gray-50/50 transition-colors">
                        {/* Listing info */}
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="relative w-12 h-10 rounded overflow-hidden bg-gray-100 flex-shrink-0">
                              {coverUrl ? (
                                <Image
                                  src={coverUrl}
                                  alt={title}
                                  fill
                                  className="object-cover"
                                  sizes="48px"
                                />
                              ) : (
                                <div className="w-full h-full bg-gradient-to-br from-primary-100 to-primary-200" />
                              )}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-900 line-clamp-1 max-w-[220px]">
                                {title}
                              </p>
                              <p className="text-xs text-gray-400">
                                {listing.neighborhood}
                                {rent ? ` · ${formatRent(rent)}` : ''}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-center">
                          <span className="text-sm font-medium text-gray-900">{listing.views}</span>
                        </td>
                        <td className="px-4 py-4 text-center">
                          <span className="text-sm font-medium text-gray-900">{listing.saves}</span>
                        </td>
                        <td className="px-4 py-4 text-center">
                          <span className="text-sm font-medium text-gray-900">{listing.inquiries}</span>
                        </td>
                        <td className="px-4 py-4 text-center">
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-badge ${si.color}`}>
                            {si.label}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-center">
                          {isActive && (
                            <button
                              onClick={() => patchListing(listing.id, { filled: true })}
                              disabled={isDisabled}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-button bg-green-600 text-white hover:bg-green-700 transition-colors disabled:opacity-50"
                            >
                              <CheckCircle className="w-3.5 h-3.5" />
                              Mark as Filled
                            </button>
                          )}
                          {listing.filled && (
                            <button
                              onClick={() => patchListing(listing.id, { filled: false })}
                              disabled={isDisabled}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-button border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              Reopen Listing
                            </button>
                          )}
                        </td>
                        <td className="px-4 py-4 text-right">
                          <div className="relative inline-block">
                            <button
                              onClick={() => setOpenMenu(openMenu === listing.id ? null : listing.id)}
                              disabled={isDisabled}
                              className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors disabled:opacity-50"
                              aria-label="Actions"
                            >
                              {isDisabled ? (
                                <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                              ) : (
                                <MoreVertical className="w-4 h-4" />
                              )}
                            </button>
                            {openMenu === listing.id && (
                              <>
                                <div className="fixed inset-0 z-40" onClick={() => setOpenMenu(null)} />
                                <div className="absolute right-0 mt-1 w-44 bg-white rounded-card shadow-card-hover border border-gray-100 py-1 z-50">
                                  <Link
                                    href={`/listings/${listing.id}`}
                                    onClick={() => setOpenMenu(null)}
                                    className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                                  >
                                    <ExternalLink className="w-3.5 h-3.5" />
                                    View Listing
                                  </Link>
                                  {(listing.status === 'pending' || listing.status === 'approved') && !listing.filled && (
                                    <Link
                                      href={`/account/listings/${listing.id}/edit`}
                                      onClick={() => setOpenMenu(null)}
                                      className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                                    >
                                      <Pencil className="w-3.5 h-3.5" />
                                      Edit Listing
                                    </Link>
                                  )}
                                  {listing.status === 'approved' && !listing.filled && (
                                    <button
                                      onClick={() => patchListing(listing.id, { paused: !listing.paused })}
                                      className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                                    >
                                      {listing.paused ? (
                                        <><Play className="w-3.5 h-3.5" /> Unpause</>
                                      ) : (
                                        <><Pause className="w-3.5 h-3.5" /> Pause Listing</>
                                      )}
                                    </button>
                                  )}
                                  {listing.status === 'approved' && !listing.paused && (
                                    <button
                                      onClick={() => patchListing(listing.id, { filled: !listing.filled })}
                                      className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                                    >
                                      <CheckCircle className="w-3.5 h-3.5" />
                                      {listing.filled ? 'Reopen Listing' : 'Mark as Filled'}
                                    </button>
                                  )}
                                  <div className="border-t border-gray-100 my-1" />
                                  <button
                                    onClick={() => deleteListing(listing.id)}
                                    className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    Delete Listing
                                  </button>
                                </div>
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
        </div>

        {/* Bottom row: Recent Inquiries + Featured CTA */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Recent Inquiries */}
          <div className="lg:col-span-2 bg-white rounded-card shadow-card overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h2 className="text-base font-semibold text-gray-900">Recent Inquiries</h2>
            </div>
            {recentInquiries.length === 0 ? (
              <div className="p-10 text-center">
                <MessageSquare className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                <p className="text-sm text-gray-500">No inquiries yet</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {recentInquiries.map((inq) => (
                  <div key={inq.id} className="px-5 py-4">
                    <div className="flex items-start justify-between gap-3 mb-1.5">
                      <div>
                        <p className="text-xs font-medium text-gray-900">
                          {inq.renter_name ?? 'Renter'}{' '}
                          <span className="font-normal text-gray-500">re:</span>{' '}
                          <Link
                            href={`/listings/${inq.listing_id}`}
                            className="hover:text-primary-600 transition-colors"
                          >
                            {inq.listing_title}
                          </Link>
                        </p>
                        {inq.listing_neighborhood && (
                          <p className="text-xs text-gray-400">{inq.listing_neighborhood}</p>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 flex-shrink-0">
                        {formatDate(inq.created_at.split('T')[0])}
                      </p>
                    </div>
                    <p className="text-sm text-gray-600 line-clamp-2">{inq.message}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Upgrade to Featured CTA */}
          <div className="bg-gradient-to-br from-amber-50 to-amber-50/30 border border-amber-200 rounded-card p-5 flex flex-col">
            <div className="flex items-center gap-2 mb-2">
              <Star className="w-5 h-5 text-amber-500" />
              <h3 className="text-sm font-semibold text-gray-900">Upgrade to Featured</h3>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Get your listing in front of more renters with a featured placement at the top of search results.
            </p>
            <ul className="text-xs text-gray-500 space-y-2 mb-5 flex-1">
              <li className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" />
                Top placement on browse page
              </li>
              <li className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" />
                Featured badge on your listing
              </li>
              <li className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" />
                More views, faster fills
              </li>
            </ul>
            <Button variant="accent" size="sm" disabled className="w-full mt-auto">
              Coming Soon
            </Button>
          </div>
        </div>

      </div>
    </div>
  )
}
