'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import {
  RefreshCw, Search, Trash2, Pause, Play, Pencil,
  Clock, ExternalLink, CheckCircle, XCircle, Mail, Flag, BadgeCheck, FileText, AlertTriangle,
  Smartphone, Monitor,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { formatRent, formatDate, formatRoomType } from '@/lib/utils'
import { ListingDetailPanel } from '@/components/admin/ListingDetailPanel'
import { ContactListerModal } from '@/components/admin/ContactListerModal'
import { AdminEditModal } from '@/components/admin/AdminEditModal'
import { Modal } from '@/components/ui/Modal'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface AdminListing {
  id: string
  title: string | null
  description: string | null
  neighborhood: string | null
  room_type: string | null
  rent_monthly: number | null
  monthly_rent: number | null
  available_from: string | null
  available_to: string | null
  start_date: string | null
  end_date: string | null
  status: string | null
  paused: boolean | null
  filled: boolean | null
  test_listing: boolean | null
  verified: boolean | null
  created_at: string | null
  lister_id: string | null
  user_id: string | null
  address: string | null
  latitude: number | null
  longitude: number | null
  lease_status: string | null
  lease_document_path: string | null
  reviewed_by: string | null
  reviewed_at: string | null
  rejection_reason: string | null
  management_company: string | null
  furnished: boolean | string | null
  is_intern_friendly: boolean | null
  immediate_movein: boolean | null
  amenities: string[] | null
  house_rules: string | null
  roommate_info: string | null
  beds: string | null
  baths: string | null
  utilities_included: boolean | null
  utilities_estimate: number | null
  deposit: number | null
  pets: string | null
  admin_flag: string | null
  admin_notes: string | null
  auto_reduce_enabled: boolean | null
  created_device: string | null
  listing_photos: Array<{ url: string; display_order: number; is_primary: boolean }> | null
}

interface ListerProfile {
  full_name: string | null
  email: string | null
  verification_level: string | null
}

type Tab = 'all' | 'approved' | 'paused' | 'pending' | 'rejected'
type FlagFilter = 'all' | 'flagged' | 'needs_email' | 'waiting_response' | 'note' | 'urgent' | 'unflagged'
type SortOption = 'created_at' | 'flagged_first' | 'flag_type'

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function AdminDashboard() {
  const [listings, setListings] = useState<AdminListing[]>([])
  const [profiles, setProfiles] = useState<Record<string, ListerProfile>>({})
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>('all')
  const [search, setSearch] = useState('')
  const [selectedListing, setSelectedListing] = useState<AdminListing | null>(null)
  const [contactListing, setContactListing] = useState<AdminListing | null>(null)
  const [quickEditId, setQuickEditId] = useState<string | null>(null)
  const [flagMenuId, setFlagMenuId] = useState<string | null>(null)
  const [flagNote, setFlagNote] = useState('')
  const [confirmFillId, setConfirmFillId] = useState<string | null>(null)
  const [flagFilter, setFlagFilter] = useState<FlagFilter>('all')
  const [sortOption, setSortOption] = useState<SortOption>('created_at')

  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  const flagMenuRef = useRef<HTMLDivElement>(null)

  // Close flag dropdown on outside click
  useEffect(() => {
    if (!flagMenuId) return
    const handler = (e: MouseEvent) => {
      if (flagMenuRef.current && !flagMenuRef.current.contains(e.target as Node)) {
        setFlagMenuId(null)
        setFlagNote('')
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [flagMenuId])

  /* ---- Fetch listings ---- */
  const fetchListings = useCallback(async (statusFilter: Tab, searchTerm: string) => {
    setLoading(true)
    const params = new URLSearchParams()
    if (statusFilter !== 'all') params.set('status', statusFilter)
    else params.set('status', 'all')
    if (searchTerm) params.set('search', searchTerm)

    const res = await fetch(`/api/admin/listings?${params.toString()}`)
    if (res.ok) {
      const data = await res.json()
      setListings(data.listings)
      setProfiles(data.profiles)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchListings(tab, search)
  }, [tab, fetchListings]) // eslint-disable-line react-hooks/exhaustive-deps

  /* ---- Debounced search ---- */
  function handleSearchChange(value: string) {
    setSearch(value)
    if (searchTimeout.current) clearTimeout(searchTimeout.current)
    searchTimeout.current = setTimeout(() => {
      fetchListings(tab, value)
    }, 300)
  }

  /* ---- Actions ---- */
  async function patchListing(id: string, body: Record<string, unknown>) {
    setActionLoading(id)
    const res = await fetch(`/api/admin/listings/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      alert(`Action failed: ${data.error ?? res.statusText}`)
    }
    setActionLoading(null)
    return res.ok
  }

  async function handleAction(id: string, action: string) {
    let ok = false
    switch (action) {
      case 'approve':
        ok = await patchListing(id, { status: 'approved' })
        if (ok) setListings((prev) => prev.map((l) => l.id === id ? { ...l, status: 'approved' } : l))
        break
      case 'reject':
        ok = await patchListing(id, { status: 'rejected' })
        if (ok) setListings((prev) => prev.map((l) => l.id === id ? { ...l, status: 'rejected' } : l))
        break
      case 'pause':
        ok = await patchListing(id, { paused: true })
        if (ok) setListings((prev) => prev.map((l) => l.id === id ? { ...l, paused: true } : l))
        break
      case 'unpause':
        ok = await patchListing(id, { paused: false })
        if (ok) setListings((prev) => prev.map((l) => l.id === id ? { ...l, paused: false } : l))
        break
      case 'fill':
        ok = await patchListing(id, { filled: true })
        if (ok) setListings((prev) => prev.map((l) => l.id === id ? { ...l, filled: true } : l))
        break
      case 'unfill':
        ok = await patchListing(id, { filled: false })
        if (ok) setListings((prev) => prev.map((l) => l.id === id ? { ...l, filled: false } : l))
        break
      case 'flag_needs_email':
        ok = await patchListing(id, { admin_flag: 'needs_email', admin_notes: flagNote || null })
        if (ok) setListings((prev) => prev.map((l) => l.id === id ? { ...l, admin_flag: 'needs_email', admin_notes: flagNote || null } : l))
        setFlagNote('')
        break
      case 'flag_waiting':
        ok = await patchListing(id, { admin_flag: 'waiting_response', admin_notes: flagNote || null })
        if (ok) setListings((prev) => prev.map((l) => l.id === id ? { ...l, admin_flag: 'waiting_response', admin_notes: flagNote || null } : l))
        setFlagNote('')
        break
      case 'flag_note':
        ok = await patchListing(id, { admin_flag: 'note', admin_notes: flagNote || null })
        if (ok) setListings((prev) => prev.map((l) => l.id === id ? { ...l, admin_flag: 'note', admin_notes: flagNote || null } : l))
        setFlagNote('')
        break
      case 'flag_urgent':
        ok = await patchListing(id, { admin_flag: 'urgent', admin_notes: flagNote || null })
        if (ok) setListings((prev) => prev.map((l) => l.id === id ? { ...l, admin_flag: 'urgent', admin_notes: flagNote || null } : l))
        setFlagNote('')
        break
      case 'flag_clear':
        ok = await patchListing(id, { admin_flag: null, admin_notes: null })
        if (ok) setListings((prev) => prev.map((l) => l.id === id ? { ...l, admin_flag: null, admin_notes: null } : l))
        setFlagNote('')
        break
      case 'delete':
        if (!confirm('Permanently delete this listing? This cannot be undone.')) return
        setActionLoading(id)
        const deleteRes = await fetch(`/api/admin/listings/${id}`, { method: 'DELETE' })
        if (deleteRes.ok) {
          setListings((prev) => prev.filter((l) => l.id !== id))
          setSelectedListing(null)
        } else {
          alert('Failed to delete listing')
        }
        setActionLoading(null)
        break
    }
  }

  /* ---- Helpers ---- */
  function getRent(l: AdminListing) {
    const amount = l.rent_monthly ?? l.monthly_rent
    return amount ? formatRent(amount) : '—'
  }

  function getDates(l: AdminListing) {
    const from = l.available_from ?? l.start_date
    const to = l.available_to ?? l.end_date
    if (!from && !to) return '—'
    return `${from ? formatDate(from) : '?'} – ${to ? formatDate(to) : '?'}`
  }

  function getStatus(l: AdminListing) {
    if (l.paused) return { label: 'Paused', color: 'bg-yellow-100 text-yellow-800' }
    if (l.filled) return { label: 'Filled', color: 'bg-gray-100 text-gray-600' }
    if (l.status === 'approved') return { label: 'Live', color: 'bg-green-100 text-green-800' }
    if (l.status === 'pending') return { label: 'Pending', color: 'bg-blue-100 text-blue-800' }
    if (l.status === 'rejected') return { label: 'Rejected', color: 'bg-red-100 text-red-800' }
    return { label: l.status ?? 'Unknown', color: 'bg-gray-100 text-gray-600' }
  }

  function getOwner(l: AdminListing) {
    const ownerId = l.lister_id ?? l.user_id
    if (!ownerId) return 'Unknown'
    const p = profiles[ownerId]
    return p?.full_name || p?.email || ownerId.slice(0, 8) + '...'
  }

  function getProfile(l: AdminListing): ListerProfile | null {
    const ownerId = l.lister_id ?? l.user_id
    return ownerId ? profiles[ownerId] ?? null : null
  }

  function getCoverUrl(l: AdminListing) {
    if (!l.listing_photos?.length) return null
    const sorted = [...l.listing_photos].sort((a, b) => {
      if (a.is_primary && !b.is_primary) return -1
      if (!a.is_primary && b.is_primary) return 1
      return a.display_order - b.display_order
    })
    return sorted[0]?.url ?? null
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'approved', label: 'Live' },
    { key: 'paused', label: 'Paused' },
    { key: 'pending', label: 'Pending' },
    { key: 'rejected', label: 'Rejected' },
  ]

  /* ---- Stat counts ---- */
  const statCounts = {
    all: listings.length,
    live: listings.filter((l) => l.status === 'approved' && !l.paused && !l.filled).length,
    pending: listings.filter((l) => l.status === 'pending').length,
    paused: listings.filter((l) => l.paused).length,
    rejected: listings.filter((l) => l.status === 'rejected').length,
    fulfilled: listings.filter((l) => l.filled).length,
  }

  const statCounts2 = {
    flagged: listings.filter((l) => !!l.admin_flag).length,
  }

  const stats: { label: string; value: number; color: string }[] = [
    { label: 'All', value: statCounts.all, color: 'bg-gray-50 text-gray-900' },
    { label: 'Live', value: statCounts.live, color: 'bg-green-50 text-green-800' },
    { label: 'Pending', value: statCounts.pending, color: 'bg-blue-50 text-blue-800' },
    { label: 'Paused', value: statCounts.paused, color: 'bg-yellow-50 text-yellow-800' },
    { label: 'Rejected', value: statCounts.rejected, color: 'bg-red-50 text-red-800' },
    { label: 'Fulfilled', value: statCounts.fulfilled, color: 'bg-purple-50 text-purple-800' },
    { label: 'Flagged', value: statCounts2.flagged, color: 'bg-orange-50 text-orange-800' },
  ]

  /* ---- Flag filtering + sorting ---- */
  const FLAG_TYPE_ORDER: Record<string, number> = { urgent: 0, needs_email: 1, waiting_response: 2, note: 3 }

  const displayListings = (() => {
    // 1. Apply flag filter
    let result = listings
    if (flagFilter === 'flagged') {
      result = result.filter((l) => !!l.admin_flag)
    } else if (flagFilter === 'unflagged') {
      result = result.filter((l) => !l.admin_flag)
    } else if (flagFilter !== 'all') {
      result = result.filter((l) => l.admin_flag === flagFilter)
    }

    // 2. Apply sort
    if (sortOption === 'flagged_first') {
      result = [...result].sort((a, b) => {
        const aFlagged = a.admin_flag ? 0 : 1
        const bFlagged = b.admin_flag ? 0 : 1
        if (aFlagged !== bFlagged) return aFlagged - bFlagged
        // Secondary: urgent first among flagged
        const aOrder = a.admin_flag ? (FLAG_TYPE_ORDER[a.admin_flag] ?? 99) : 99
        const bOrder = b.admin_flag ? (FLAG_TYPE_ORDER[b.admin_flag] ?? 99) : 99
        if (aOrder !== bOrder) return aOrder - bOrder
        // Tertiary: created_at desc
        return new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime()
      })
    } else if (sortOption === 'flag_type') {
      result = [...result].sort((a, b) => {
        const aOrder = a.admin_flag ? (FLAG_TYPE_ORDER[a.admin_flag] ?? 99) : 100
        const bOrder = b.admin_flag ? (FLAG_TYPE_ORDER[b.admin_flag] ?? 99) : 100
        if (aOrder !== bOrder) return aOrder - bOrder
        return new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime()
      })
    }
    // sortOption === 'created_at' keeps server default order

    return result
  })()

  return (
    <div className="p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 md:mb-6">
        <div>
          <h1 className="font-serif text-xl md:text-2xl text-gray-900">Listings</h1>
          <p className="text-sm text-gray-500 mt-1">
            {loading ? 'Loading...' : (
              <><span className="font-semibold text-gray-900">{listings.length}</span> listing{listings.length !== 1 ? 's' : ''}</>
            )}
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={() => fetchListings(tab, search)} disabled={loading}>
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">Refresh</span>
        </Button>
      </div>

      {/* Stat cards */}
      {!loading && (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 sm:gap-3 mb-4 md:mb-6">
          {stats.map((s) => (
            <div key={s.label} className={`rounded-card px-4 py-3 ${s.color} border border-gray-200`}>
              <p className="text-xs font-medium opacity-70">{s.label}</p>
              <p className="text-xl font-semibold">{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Tabs + Search */}
      <div className="flex flex-col gap-3 mb-4 md:mb-6">
        {/* Tabs row - horizontally scrollable on mobile */}
        <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
          <div className="flex gap-1 bg-white rounded-button border border-gray-200 p-1 w-max md:w-auto">
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={[
                  'px-3 py-1.5 text-sm font-medium rounded-button transition-colors whitespace-nowrap',
                  tab === t.key ? 'bg-primary-600 text-white' : 'text-gray-600 hover:bg-gray-100',
                ].join(' ')}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
        {/* Search + Filters row */}
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
          <div className="relative flex-1 sm:max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search title, neighborhood, lister, address..."
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-button focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
            />
          </div>
          <div className="flex gap-2">
            {/* Flag filter */}
            <select
              value={flagFilter}
              onChange={(e) => setFlagFilter(e.target.value as FlagFilter)}
              className="flex-1 sm:flex-none px-3 py-2 text-sm border border-gray-200 rounded-button bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="all">All Flags</option>
              <option value="flagged">Flagged Only</option>
              <option value="unflagged">Unflagged Only</option>
              <option value="needs_email">Needs Email</option>
              <option value="waiting_response">Waiting Response</option>
              <option value="note">Note</option>
              <option value="urgent">Urgent</option>
            </select>
            {/* Sort */}
            <select
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value as SortOption)}
              className="flex-1 sm:flex-none px-3 py-2 text-sm border border-gray-200 rounded-button bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="created_at">Sort: Newest</option>
              <option value="flagged_first">Sort: Flagged</option>
              <option value="flag_type">Sort: Flag Type</option>
            </select>
          </div>
        </div>
      </div>

      {/* Empty state */}
      {!loading && displayListings.length === 0 && (
        <div className="bg-white rounded-card shadow-card p-12 text-center">
          <Search className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <h2 className="text-lg font-semibold text-gray-900 mb-1">No listings found</h2>
          <p className="text-sm text-gray-500">Try changing the tab, search query, or flag filter.</p>
        </div>
      )}

      {/* Mobile card layout */}
      {displayListings.length > 0 && (
        <div className="md:hidden space-y-2">
          {displayListings.map((listing) => {
            const coverUrl = getCoverUrl(listing)
            const status = getStatus(listing)
            const isActioning = actionLoading === listing.id
            const isPending = listing.status === 'pending'

            return (
              <div
                key={listing.id}
                onClick={() => setSelectedListing(listing)}
                className="bg-white rounded-card shadow-card p-3 cursor-pointer active:bg-gray-50 transition-colors"
              >
                <div className="flex gap-3">
                  {/* Cover photo */}
                  <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-gray-100 shrink-0">
                    {coverUrl ? (
                      <Image src={coverUrl} alt="" fill className="object-cover" sizes="64px" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Clock className="w-5 h-5 text-gray-300" />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-medium text-gray-900 text-sm truncate">{listing.title || '(no title)'}</p>
                      <span className="font-semibold text-gray-900 text-sm whitespace-nowrap">{getRent(listing)}</span>
                    </div>
                    <p className="text-xs text-gray-500 truncate mt-0.5">
                      {formatRoomType(listing.room_type ?? 'private_room')}
                      {listing.neighborhood ? ` · ${listing.neighborhood}` : ''}
                    </p>

                    {/* Badges */}
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${status.color}`}>
                        {status.label}
                      </span>
                      {listing.test_listing && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                          Test
                        </span>
                      )}
                      {listing.lease_status === 'pending' && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                          Lease
                        </span>
                      )}
                      {listing.admin_flag === 'needs_email' && (
                        <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                          <Mail className="w-3 h-3" /> Email
                        </span>
                      )}
                      {listing.admin_flag === 'waiting_response' && (
                        <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-xs font-medium bg-cyan-100 text-cyan-800">
                          <Clock className="w-3 h-3" /> Waiting
                        </span>
                      )}
                      {listing.admin_flag === 'note' && (
                        <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                          <FileText className="w-3 h-3" /> Note
                        </span>
                      )}
                      {listing.admin_flag === 'urgent' && (
                        <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          <Flag className="w-3 h-3" /> Urgent
                        </span>
                      )}
                      {listing.auto_reduce_enabled && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-teal-100 text-teal-800">
                          Auto-reduce
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Bottom row: lister + date + quick actions */}
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100">
                  <div className="text-xs text-gray-500 truncate">
                    {getOwner(listing)}
                    {listing.created_at && (
                      <> · {new Date(listing.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</>
                    )}
                  </div>
                  {/* Quick action buttons for mobile */}
                  <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                    {isPending && (
                      <>
                        <button
                          onClick={() => handleAction(listing.id, 'approve')}
                          disabled={isActioning}
                          className="p-1.5 rounded hover:bg-green-100 text-green-600 transition-colors disabled:opacity-50"
                          title="Approve"
                        >
                          <CheckCircle className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleAction(listing.id, 'reject')}
                          disabled={isActioning}
                          className="p-1.5 rounded hover:bg-red-100 text-red-500 transition-colors disabled:opacity-50"
                          title="Reject"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      </>
                    )}
                    <Link
                      href={`/listings/${listing.id}`}
                      target="_blank"
                      className="p-1.5 rounded hover:bg-gray-100 text-gray-500 transition-colors"
                      title="View listing"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Desktop listing table */}
      {displayListings.length > 0 && (
        <div className="hidden md:block bg-white rounded-card shadow-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="text-left px-4 py-3 font-medium text-gray-500 w-12"></th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Title</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Price</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 hidden md:table-cell">Neighborhood</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 hidden lg:table-cell">Dates</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 hidden lg:table-cell">Lister</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 hidden xl:table-cell">Submitted</th>
                  <th className="text-center px-2 py-3 font-medium text-gray-500 hidden xl:table-cell w-10" title="Created on device">Dev</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody>
                {displayListings.map((listing) => {
                  const coverUrl = getCoverUrl(listing)
                  const status = getStatus(listing)
                  const isActioning = actionLoading === listing.id
                  const isPending = listing.status === 'pending'

                  return (
                    <tr
                      key={listing.id}
                      onClick={() => setSelectedListing(listing)}
                      className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors cursor-pointer"
                    >
                      {/* Photo */}
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

                      {/* Title */}
                      <td className="px-4 py-3 max-w-[200px]">
                        <p className="font-medium text-gray-900 truncate">{listing.title || '(no title)'}</p>
                        <p className="text-xs text-gray-400 truncate">{formatRoomType(listing.room_type ?? 'private_room')}</p>
                      </td>

                      {/* Price */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="font-medium text-gray-900">{getRent(listing)}</span>
                      </td>

                      {/* Neighborhood */}
                      <td className="px-4 py-3 hidden md:table-cell whitespace-nowrap text-gray-600">
                        {listing.neighborhood ?? '—'}
                      </td>

                      {/* Dates */}
                      <td className="px-4 py-3 hidden lg:table-cell whitespace-nowrap text-gray-600">
                        {getDates(listing)}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${status.color}`}>
                            {status.label}
                          </span>
                          {listing.test_listing && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                              Test
                            </span>
                          )}
                          {listing.lease_status === 'pending' && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                              Lease
                            </span>
                          )}
                          {listing.admin_flag === 'needs_email' && (
                            <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800 cursor-default" title={listing.admin_notes ?? undefined}>
                              <Mail className="w-3 h-3" /> Email
                            </span>
                          )}
                          {listing.admin_flag === 'waiting_response' && (
                            <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-xs font-medium bg-cyan-100 text-cyan-800 cursor-default" title={listing.admin_notes ?? undefined}>
                              <Clock className="w-3 h-3" /> Waiting
                            </span>
                          )}
                          {listing.admin_flag === 'note' && (
                            <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800 cursor-default" title={listing.admin_notes ?? undefined}>
                              <FileText className="w-3 h-3" /> Note
                            </span>
                          )}
                          {listing.admin_flag === 'urgent' && (
                            <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 cursor-default" title={listing.admin_notes ?? undefined}>
                              <Flag className="w-3 h-3" /> Urgent
                            </span>
                          )}
                          {listing.auto_reduce_enabled && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-teal-100 text-teal-800">
                              Auto-reduce
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Lister */}
                      <td className="px-4 py-3 hidden lg:table-cell text-gray-600 max-w-[120px] truncate">
                        {getOwner(listing)}
                      </td>

                      {/* Submitted */}
                      <td className="px-4 py-3 hidden xl:table-cell whitespace-nowrap text-gray-500 text-xs">
                        {listing.created_at
                          ? new Date(listing.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                            + ', ' + new Date(listing.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
                          : '—'}
                      </td>

                      {/* Device */}
                      <td className="px-2 py-3 hidden xl:table-cell text-center">
                        {listing.created_device === 'mobile' ? (
                          <span title="Created on mobile"><Smartphone className="w-4 h-4 text-gray-400 mx-auto" /></span>
                        ) : listing.created_device === 'desktop' ? (
                          <span title="Created on desktop"><Monitor className="w-4 h-4 text-gray-400 mx-auto" /></span>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          {isPending && (
                            <>
                              <button
                                onClick={() => handleAction(listing.id, 'approve')}
                                disabled={isActioning}
                                className="p-1.5 rounded hover:bg-green-100 text-green-600 transition-colors disabled:opacity-50"
                                title="Approve"
                              >
                                <CheckCircle className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleAction(listing.id, 'reject')}
                                disabled={isActioning}
                                className="p-1.5 rounded hover:bg-red-100 text-red-500 transition-colors disabled:opacity-50"
                                title="Reject"
                              >
                                <XCircle className="w-4 h-4" />
                              </button>
                            </>
                          )}
                          {(() => {
                            const profile = getProfile(listing)
                            return profile?.email ? (
                              <button
                                onClick={() => { window.open(`https://mail.google.com/mail/?view=cm&to=${encodeURIComponent(profile.email!)}`, '_blank') }}
                                className="p-1.5 rounded hover:bg-blue-100 text-blue-500 transition-colors"
                                title={`Email ${profile.full_name || profile.email}`}
                              >
                                <Mail className="w-4 h-4" />
                              </button>
                            ) : null
                          })()}
                          {/* Admin flag dropdown */}
                          <div className="relative" ref={flagMenuId === listing.id ? flagMenuRef : undefined}>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                if (flagMenuId === listing.id) {
                                  setFlagMenuId(null)
                                  setFlagNote('')
                                } else {
                                  setFlagMenuId(listing.id)
                                  setFlagNote(listing.admin_notes ?? '')
                                }
                              }}
                              className={[
                                'p-1.5 rounded transition-colors',
                                listing.admin_flag
                                  ? 'text-orange-500 hover:bg-orange-100'
                                  : 'text-gray-400 hover:bg-gray-100',
                              ].join(' ')}
                              title={listing.admin_notes ? `Flag: ${listing.admin_notes}` : 'Flag for follow-up'}
                            >
                              <Flag className={`w-4 h-4 ${listing.admin_flag ? 'fill-current' : ''}`} />
                            </button>
                            {flagMenuId === listing.id && (
                              <div className="absolute right-0 top-full mt-1 z-50 bg-white rounded-lg shadow-lg border border-gray-200 p-3 min-w-[220px]">
                                <textarea
                                  value={flagNote}
                                  onChange={(e) => setFlagNote(e.target.value)}
                                  placeholder="Add a note..."
                                  rows={2}
                                  className="w-full text-xs border border-gray-200 rounded px-2 py-1.5 mb-2 focus:outline-none focus:ring-1 focus:ring-primary-500 resize-none"
                                />
                                <div className="flex flex-col gap-1">
                                  <button
                                    onClick={() => { handleAction(listing.id, 'flag_needs_email'); setFlagMenuId(null) }}
                                    className="w-full text-left px-2 py-1.5 text-xs rounded hover:bg-orange-50 text-gray-700 flex items-center gap-2"
                                  >
                                    <Mail className="w-3 h-3 text-orange-500" /> Needs Email
                                  </button>
                                  <button
                                    onClick={() => { handleAction(listing.id, 'flag_waiting'); setFlagMenuId(null) }}
                                    className="w-full text-left px-2 py-1.5 text-xs rounded hover:bg-cyan-50 text-gray-700 flex items-center gap-2"
                                  >
                                    <Clock className="w-3 h-3 text-cyan-500" /> Waiting on Response
                                  </button>
                                  <button
                                    onClick={() => { handleAction(listing.id, 'flag_note'); setFlagMenuId(null) }}
                                    className="w-full text-left px-2 py-1.5 text-xs rounded hover:bg-indigo-50 text-gray-700 flex items-center gap-2"
                                  >
                                    <FileText className="w-3 h-3 text-indigo-500" /> Note
                                  </button>
                                  <button
                                    onClick={() => { handleAction(listing.id, 'flag_urgent'); setFlagMenuId(null) }}
                                    className="w-full text-left px-2 py-1.5 text-xs rounded hover:bg-red-50 text-gray-700 flex items-center gap-2"
                                  >
                                    <AlertTriangle className="w-3 h-3 text-red-500" /> Urgent
                                  </button>
                                  {listing.admin_flag && (
                                    <button
                                      onClick={() => { handleAction(listing.id, 'flag_clear'); setFlagMenuId(null) }}
                                      className="w-full text-left px-2 py-1.5 text-xs rounded hover:bg-gray-50 text-gray-500 flex items-center gap-2 border-t border-gray-100 mt-1 pt-1"
                                    >
                                      <XCircle className="w-3 h-3" /> Clear Flag
                                    </button>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                          <Link
                            href={`/listings/${listing.id}`}
                            target="_blank"
                            className="p-1.5 rounded hover:bg-gray-100 text-gray-500 transition-colors"
                            title="View listing"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </Link>
                          <Link
                            href={`/admin/listings/${listing.id}/edit`}
                            className="p-1.5 rounded hover:bg-blue-100 text-blue-600 transition-colors"
                            title="Edit"
                          >
                            <Pencil className="w-4 h-4" />
                          </Link>
                          {listing.status === 'approved' && (
                            listing.filled ? (
                              <button
                                onClick={() => handleAction(listing.id, 'unfill')}
                                disabled={isActioning}
                                className="p-1.5 rounded hover:bg-green-100 text-green-600 transition-colors disabled:opacity-50"
                                title="Mark as unfilled"
                              >
                                <BadgeCheck className="w-4 h-4" />
                              </button>
                            ) : (
                              <button
                                onClick={() => setConfirmFillId(listing.id)}
                                disabled={isActioning}
                                className="p-1.5 rounded hover:bg-gray-100 text-gray-400 transition-colors disabled:opacity-50"
                                title="Mark as filled"
                              >
                                <BadgeCheck className="w-4 h-4" />
                              </button>
                            )
                          )}
                          {listing.status === 'approved' && (
                            listing.paused ? (
                              <button
                                onClick={() => handleAction(listing.id, 'unpause')}
                                disabled={isActioning}
                                className="p-1.5 rounded hover:bg-green-100 text-green-600 transition-colors disabled:opacity-50"
                                title="Unpause"
                              >
                                <Play className="w-4 h-4" />
                              </button>
                            ) : (
                              <button
                                onClick={() => handleAction(listing.id, 'pause')}
                                disabled={isActioning}
                                className="p-1.5 rounded hover:bg-yellow-100 text-yellow-600 transition-colors disabled:opacity-50"
                                title="Pause"
                              >
                                <Pause className="w-4 h-4" />
                              </button>
                            )
                          )}
                          <button
                            onClick={() => handleAction(listing.id, 'delete')}
                            disabled={isActioning}
                            className="p-1.5 rounded hover:bg-red-100 text-red-500 transition-colors disabled:opacity-50"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Slide-over detail panel */}
      {selectedListing && (
        <ListingDetailPanel
          listing={selectedListing}
          profile={getProfile(selectedListing)}
          onClose={() => setSelectedListing(null)}
          onContactLister={() => {
            setContactListing(selectedListing)
          }}
          onAction={(action) => handleAction(selectedListing.id, action)}
          actionLoading={actionLoading === selectedListing.id}
          onQuickEdit={() => setQuickEditId(selectedListing.id)}
        />
      )}

      {/* Contact lister modal */}
      {contactListing && (
        <ContactListerModal
          open={!!contactListing}
          onClose={() => setContactListing(null)}
          listingId={contactListing.id}
          listingTitle={contactListing.title || 'Untitled listing'}
          listerEmail={getProfile(contactListing)?.email || ''}
          listerName={getProfile(contactListing)?.full_name || 'Lister'}
        />
      )}

      {/* Quick edit modal */}
      <AdminEditModal
        open={!!quickEditId}
        onClose={() => setQuickEditId(null)}
        listingId={quickEditId}
        onSaved={() => fetchListings(tab, search)}
      />

      <Modal open={!!confirmFillId} onClose={() => setConfirmFillId(null)} title="Mark as Filled">
        <p className="text-sm text-gray-600 mb-6">Are you sure you want to mark this listing as filled?</p>
        <div className="flex items-center justify-end gap-3">
          <button onClick={() => setConfirmFillId(null)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-button hover:bg-gray-200 transition-colors">Cancel</button>
          <button onClick={() => { if (confirmFillId) { handleAction(confirmFillId, 'fill'); setConfirmFillId(null) } }} className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-button hover:bg-green-700 transition-colors">Confirm</button>
        </div>
      </Modal>
    </div>
  )
}
