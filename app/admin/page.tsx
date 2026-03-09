'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  RefreshCw, Search, Trash2, Pause, Play, Pencil, X, Check,
  Clock, ExternalLink, CheckCircle, XCircle, ChevronDown, ChevronUp,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { ADMIN_USER_ID } from '@/lib/admin'
import { Button } from '@/components/ui/Button'
import { formatRent, formatDate, formatRoomType } from '@/lib/utils'

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
  listing_photos: Array<{ url: string; display_order: number; is_primary: boolean }> | null
}

interface ListerProfile {
  full_name: string | null
  email: string | null
}

type Tab = 'all' | 'approved' | 'paused' | 'pending' | 'rejected'

const NEIGHBORHOODS = [
  'The Hill', 'University Hill', 'Goss-Grove', 'Baseline Sub', 'Chautauqua',
  'Martin Acres', 'North Boulder', 'East Boulder', 'South Boulder',
]

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function AdminDashboard() {
  const router = useRouter()
  const [authState, setAuthState] = useState<'loading' | 'authorized' | 'unauthorized'>('loading')
  const [listings, setListings] = useState<AdminListing[]>([])
  const [profiles, setProfiles] = useState<Record<string, ListerProfile>>({})
  const [loading, setLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>('all')
  const [search, setSearch] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editData, setEditData] = useState<{
    title: string; rent_monthly: string; description: string;
    neighborhood: string; available_from: string; available_to: string;
  }>({
    title: '', rent_monthly: '', description: '',
    neighborhood: '', available_from: '', available_to: '',
  })

  // Pending review state
  const [rejectionReasons, setRejectionReasons] = useState<Record<string, string>>({})
  const [expandedRejection, setExpandedRejection] = useState<string | null>(null)

  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  /* ---- Auth check ---- */
  useEffect(() => {
    async function checkAdmin() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user || user.id !== ADMIN_USER_ID) {
        router.replace('/')
        return
      }

      setAuthState('authorized')
    }
    checkAdmin()
  }, [router])

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
    if (authState === 'authorized') fetchListings(tab, search)
  }, [authState, tab, fetchListings]) // eslint-disable-line react-hooks/exhaustive-deps

  /* ---- Debounced search ---- */
  function handleSearchChange(value: string) {
    setSearch(value)
    if (searchTimeout.current) clearTimeout(searchTimeout.current)
    searchTimeout.current = setTimeout(() => {
      fetchListings(tab, value)
    }, 300)
  }

  /* ---- Actions ---- */
  async function handlePause(id: string) {
    setActionLoading(id)
    const res = await fetch(`/api/admin/listings/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paused: true }),
    })
    if (res.ok) {
      setListings((prev) => prev.map((l) => l.id === id ? { ...l, paused: true } : l))
    } else {
      const body = await res.json().catch(() => ({}))
      alert(`Failed to pause listing: ${body.error ?? res.statusText}`)
    }
    setActionLoading(null)
  }

  async function handleUnpause(id: string) {
    setActionLoading(id)
    const res = await fetch(`/api/admin/listings/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paused: false }),
    })
    if (res.ok) {
      setListings((prev) => prev.map((l) => l.id === id ? { ...l, paused: false } : l))
    } else {
      const body = await res.json().catch(() => ({}))
      alert(`Failed to unpause listing: ${body.error ?? res.statusText}`)
    }
    setActionLoading(null)
  }

  async function handleDelete(id: string) {
    if (!confirm('Permanently delete this listing? This cannot be undone.')) return
    setActionLoading(id)
    const deleteRes = await fetch(`/api/admin/listings/${id}`, { method: 'DELETE' })
    if (deleteRes.ok) {
      setListings((prev) => prev.filter((l) => l.id !== id))
      setActionLoading(null)
      return
    }

    // Fallback: if hard delete is blocked, still allow admin takedown via pause.
    const takedownRes = await fetch(`/api/admin/listings/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paused: true }),
    })
    if (takedownRes.ok) {
      setListings((prev) => prev.map((l) => l.id === id ? { ...l, paused: true } : l))
      alert('Hard delete was blocked, but listing was taken down (paused).')
      setActionLoading(null)
      return
    }

    const deleteBody = await deleteRes.json().catch(() => ({}))
    const takedownBody = await takedownRes.json().catch(() => ({}))
    alert(
      `Failed to delete or take down listing. Delete: ${deleteBody.error ?? deleteRes.statusText}. `
      + `Takedown: ${takedownBody.error ?? takedownRes.statusText}.`
    )
    setActionLoading(null)
  }

  async function handleApprove(id: string) {
    setActionLoading(id)
    const res = await fetch(`/api/admin/listings/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'approved' }),
    })
    if (res.ok) {
      setListings((prev) => prev.map((l) => l.id === id ? { ...l, status: 'approved' } : l))
    } else {
      alert('Failed to approve listing')
    }
    setActionLoading(null)
  }

  async function handleReject(id: string) {
    setActionLoading(id)
    const reason = rejectionReasons[id]?.trim() || null
    const supabase = createClient()
    const updateData: Record<string, unknown> = { status: 'rejected' }
    if (reason) updateData.rejection_reason = reason

    const { error } = await supabase.from('listings').update(updateData).eq('id', id)
    if (error) {
      // Retry without rejection_reason if column doesn't exist
      if (error.message.includes('rejection_reason')) {
        await supabase.from('listings').update({ status: 'rejected' }).eq('id', id)
      } else {
        alert(`Reject failed: ${error.message}`)
        setActionLoading(null)
        return
      }
    }
    setListings((prev) => prev.map((l) => l.id === id ? { ...l, status: 'rejected' } : l))
    setRejectionReasons((prev) => { const n = { ...prev }; delete n[id]; return n })
    setExpandedRejection(null)
    setActionLoading(null)
  }

  function startEdit(listing: AdminListing) {
    setEditingId(listing.id)
    setEditData({
      title: listing.title ?? '',
      rent_monthly: String(listing.rent_monthly ?? listing.monthly_rent ?? ''),
      description: listing.description ?? '',
      neighborhood: listing.neighborhood ?? '',
      available_from: listing.available_from ?? listing.start_date ?? '',
      available_to: listing.available_to ?? listing.end_date ?? '',
    })
  }

  async function saveEdit(id: string) {
    setActionLoading(id)
    const updates: Record<string, unknown> = {}
    if (editData.title.trim()) updates.title = editData.title.trim()
    if (editData.rent_monthly) updates.rent_monthly = parseInt(editData.rent_monthly, 10)
    if (editData.description.trim()) updates.description = editData.description.trim()
    if (editData.neighborhood) updates.neighborhood = editData.neighborhood
    if (editData.available_from) updates.available_from = editData.available_from
    if (editData.available_to) updates.available_to = editData.available_to

    if (Object.keys(updates).length === 0) {
      setEditingId(null)
      setActionLoading(null)
      return
    }

    const res = await fetch(`/api/admin/listings/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    })

    if (res.ok) {
      setListings((prev) => prev.map((l) =>
        l.id === id
          ? {
              ...l,
              ...(updates.title ? { title: updates.title as string } : {}),
              ...(updates.rent_monthly ? { rent_monthly: updates.rent_monthly as number } : {}),
              ...(updates.description ? { description: updates.description as string } : {}),
              ...(updates.neighborhood ? { neighborhood: updates.neighborhood as string } : {}),
              ...(updates.available_from ? { available_from: updates.available_from as string } : {}),
              ...(updates.available_to ? { available_to: updates.available_to as string } : {}),
            }
          : l
      ))
      setEditingId(null)
    } else {
      alert('Failed to save changes')
    }
    setActionLoading(null)
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
    const f = from ? formatDate(from) : '?'
    const t = to ? formatDate(to) : '?'
    return `${f} – ${t}`
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
    return p?.full_name || p?.email || ownerId.slice(0, 8) + '…'
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

  /* ---- Loading / unauthorized ---- */
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

  const tabs: { key: Tab; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'approved', label: 'Live' },
    { key: 'paused', label: 'Paused' },
    { key: 'pending', label: 'Pending' },
    { key: 'rejected', label: 'Rejected' },
  ]

  return (
    <div className="min-h-screen bg-gray-50 pt-20 pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-serif text-3xl text-gray-900">Admin Dashboard</h1>
            <p className="text-sm text-gray-500 mt-1">
              {loading ? 'Loading…' : (
                <><span className="font-semibold text-gray-900">{listings.length}</span> listing{listings.length !== 1 ? 's' : ''}</>
              )}
            </p>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => fetchListings(tab, search)}
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Tabs + Search */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex gap-1 bg-white rounded-button border border-gray-200 p-1">
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={[
                  'px-3 py-1.5 text-sm font-medium rounded-button transition-colors',
                  tab === t.key
                    ? 'bg-primary-600 text-white'
                    : 'text-gray-600 hover:bg-gray-100',
                ].join(' ')}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search title, neighborhood, lister…"
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-button focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
            />
          </div>
        </div>

        {/* Empty state */}
        {!loading && listings.length === 0 && (
          <div className="bg-white rounded-card shadow-card p-12 text-center">
            <Search className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <h2 className="text-lg font-semibold text-gray-900 mb-1">No listings found</h2>
            <p className="text-sm text-gray-500">Try changing the tab or search query.</p>
          </div>
        )}

        {/* Listing table */}
        {listings.length > 0 && (
          <div className="bg-white rounded-card shadow-card overflow-hidden">
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
                    <th className="text-left px-4 py-3 font-medium text-gray-500 hidden md:table-cell">Posted</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-500 hidden lg:table-cell">Lister</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-500">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {listings.map((listing) => {
                    const coverUrl = getCoverUrl(listing)
                    const status = getStatus(listing)
                    const isEditing = editingId === listing.id
                    const isActioning = actionLoading === listing.id
                    const isPending = listing.status === 'pending'
                    const showRejectInput = expandedRejection === listing.id

                    return (
                      <tr
                        key={listing.id}
                        className={[
                          'border-b border-gray-50 hover:bg-gray-50/50 transition-colors',
                          isEditing ? 'bg-blue-50/30' : '',
                        ].join(' ')}
                      >
                        {/* Photo */}
                        <td className="px-4 py-3">
                          <div className="relative w-10 h-10 rounded overflow-hidden bg-gray-100 flex-shrink-0">
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
                          {isEditing ? (
                            <input
                              type="text"
                              value={editData.title}
                              onChange={(e) => setEditData((d) => ({ ...d, title: e.target.value }))}
                              className="w-full px-2 py-1 text-sm border border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          ) : (
                            <div>
                              <p className="font-medium text-gray-900 truncate">{listing.title || '(no title)'}</p>
                              <p className="text-xs text-gray-400 truncate">{formatRoomType(listing.room_type ?? 'private_room')}</p>
                            </div>
                          )}
                        </td>

                        {/* Price */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          {isEditing ? (
                            <input
                              type="number"
                              value={editData.rent_monthly}
                              onChange={(e) => setEditData((d) => ({ ...d, rent_monthly: e.target.value }))}
                              className="w-24 px-2 py-1 text-sm border border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          ) : (
                            <span className="font-medium text-gray-900">{getRent(listing)}</span>
                          )}
                        </td>

                        {/* Neighborhood */}
                        <td className="px-4 py-3 hidden md:table-cell whitespace-nowrap text-gray-600">
                          {isEditing ? (
                            <select
                              value={editData.neighborhood}
                              onChange={(e) => setEditData((d) => ({ ...d, neighborhood: e.target.value }))}
                              className="w-full px-2 py-1 text-sm border border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="">—</option>
                              {NEIGHBORHOODS.map((n) => (
                                <option key={n} value={n}>{n}</option>
                              ))}
                            </select>
                          ) : (
                            listing.neighborhood ?? '—'
                          )}
                        </td>

                        {/* Dates */}
                        <td className="px-4 py-3 hidden lg:table-cell whitespace-nowrap text-gray-600">
                          {isEditing ? (
                            <div className="flex items-center gap-1">
                              <input
                                type="date"
                                value={editData.available_from}
                                onChange={(e) => setEditData((d) => ({ ...d, available_from: e.target.value }))}
                                className="w-[130px] px-1 py-1 text-xs border border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                              <span className="text-gray-400">–</span>
                              <input
                                type="date"
                                value={editData.available_to}
                                onChange={(e) => setEditData((d) => ({ ...d, available_to: e.target.value }))}
                                className="w-[130px] px-1 py-1 text-xs border border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            </div>
                          ) : (
                            getDates(listing)
                          )}
                        </td>

                        {/* Status */}
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${status.color}`}>
                              {status.label}
                            </span>
                            {listing.verified && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                Verified
                              </span>
                            )}
                            {listing.test_listing && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                Test
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Posted */}
                        <td className="px-4 py-3 hidden md:table-cell whitespace-nowrap text-gray-500">
                          {listing.created_at ? formatDate(listing.created_at.split('T')[0]) : '—'}
                        </td>

                        {/* Lister */}
                        <td className="px-4 py-3 hidden lg:table-cell text-gray-600 max-w-[120px] truncate">
                          {getOwner(listing)}
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            {isEditing ? (
                              <>
                                <button
                                  onClick={() => saveEdit(listing.id)}
                                  disabled={isActioning}
                                  className="p-1.5 rounded hover:bg-green-100 text-green-600 transition-colors disabled:opacity-50"
                                  title="Save"
                                >
                                  <Check className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => setEditingId(null)}
                                  className="p-1.5 rounded hover:bg-gray-100 text-gray-500 transition-colors"
                                  title="Cancel"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </>
                            ) : (
                              <>
                                {/* Pending: Approve/Reject */}
                                {isPending && (
                                  <>
                                    <button
                                      onClick={() => handleApprove(listing.id)}
                                      disabled={isActioning}
                                      className="p-1.5 rounded hover:bg-green-100 text-green-600 transition-colors disabled:opacity-50"
                                      title="Approve"
                                    >
                                      <CheckCircle className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={() => setExpandedRejection(showRejectInput ? null : listing.id)}
                                      disabled={isActioning}
                                      className="p-1.5 rounded hover:bg-red-100 text-red-500 transition-colors disabled:opacity-50"
                                      title="Reject"
                                    >
                                      <XCircle className="w-4 h-4" />
                                    </button>
                                  </>
                                )}
                                {/* View */}
                                <Link
                                  href={`/listings/${listing.id}`}
                                  target="_blank"
                                  className="p-1.5 rounded hover:bg-gray-100 text-gray-500 transition-colors"
                                  title="View listing"
                                >
                                  <ExternalLink className="w-4 h-4" />
                                </Link>
                                {/* Edit */}
                                <button
                                  onClick={() => startEdit(listing)}
                                  disabled={isActioning}
                                  className="p-1.5 rounded hover:bg-blue-100 text-blue-600 transition-colors disabled:opacity-50"
                                  title="Edit"
                                >
                                  <Pencil className="w-4 h-4" />
                                </button>
                                {/* Pause/Unpause */}
                                {listing.status === 'approved' && (
                                  listing.paused ? (
                                    <button
                                      onClick={() => handleUnpause(listing.id)}
                                      disabled={isActioning}
                                      className="p-1.5 rounded hover:bg-green-100 text-green-600 transition-colors disabled:opacity-50"
                                      title="Unpause"
                                    >
                                      <Play className="w-4 h-4" />
                                    </button>
                                  ) : (
                                    <button
                                      onClick={() => handlePause(listing.id)}
                                      disabled={isActioning}
                                      className="p-1.5 rounded hover:bg-yellow-100 text-yellow-600 transition-colors disabled:opacity-50"
                                      title="Pause"
                                    >
                                      <Pause className="w-4 h-4" />
                                    </button>
                                  )
                                )}
                                {/* Delete */}
                                <button
                                  onClick={() => handleDelete(listing.id)}
                                  disabled={isActioning}
                                  className="p-1.5 rounded hover:bg-red-100 text-red-500 transition-colors disabled:opacity-50"
                                  title="Delete permanently"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </>
                            )}
                          </div>
                          {/* Rejection reason input row */}
                          {showRejectInput && !isEditing && (
                            <div className="flex items-center gap-2 mt-2">
                              <input
                                type="text"
                                placeholder="Reason (optional)"
                                value={rejectionReasons[listing.id] ?? ''}
                                onChange={(e) => setRejectionReasons((prev) => ({ ...prev, [listing.id]: e.target.value }))}
                                className="flex-1 px-2 py-1 text-xs border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-red-500"
                                maxLength={500}
                              />
                              <button
                                onClick={() => handleReject(listing.id)}
                                disabled={isActioning}
                                className="px-2 py-1 text-xs font-medium rounded bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-50"
                              >
                                Confirm
                              </button>
                            </div>
                          )}
                          {/* Inline edit description */}
                          {isEditing && (
                            <div className="mt-2">
                              <textarea
                                value={editData.description}
                                onChange={(e) => setEditData((d) => ({ ...d, description: e.target.value }))}
                                rows={2}
                                placeholder="Description…"
                                className="w-full px-2 py-1 text-xs border border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                              />
                            </div>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
