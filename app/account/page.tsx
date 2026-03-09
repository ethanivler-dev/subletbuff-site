'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { formatRent, formatDate, sanitizeListingTitle, formatRoomType } from '@/lib/utils'
import {
  Heart, MessageSquare, Settings, BarChart2,
  ChevronRight, MapPin, Calendar, Crown,
  ShieldCheck, Upload, GraduationCap, CheckCircle,
  Bell, Trash2, Search,
} from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import type { User as AuthUser } from '@supabase/supabase-js'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface SavedItem {
  saved_at: string
  listing: {
    id: string
    title: string | null
    room_type: string
    neighborhood: string
    rent_monthly: number | null
    monthly_rent: number | null
    available_from: string | null
    available_to: string | null
    start_date: string | null
    end_date: string | null
    listing_photos: Array<{ url: string; is_primary: boolean; display_order: number }> | null
  } | null
}

interface InquiryRow {
  id: string
  message: string
  created_at: string
  status: string | null
  listing_id: string
  listing: {
    id: string
    title: string | null
    room_type: string
    neighborhood: string
  } | null
}

interface SavedSearch {
  id: string
  neighborhoods: string[] | null
  min_price: number | null
  max_price: number | null
  move_in_after: string | null
  move_out_before: string | null
  room_types: string[] | null
  created_at: string
}

interface Profile {
  verification_level: string | null
  edu_email: string | null
  account_type: string | null
}

type Tab = 'saved' | 'searches' | 'inquiries' | 'settings'

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function inquiryStatusInfo(inquiry: InquiryRow): { label: string; color: string } {
  const s = inquiry.status?.toLowerCase()
  if (s === 'replied') return { label: 'Replied', color: 'text-green-700 bg-green-100' }
  const daysSince = (Date.now() - new Date(inquiry.created_at).getTime()) / 86_400_000
  if (daysSince > 3 && (!s || s === 'pending')) {
    return { label: 'No Response', color: 'text-gray-600 bg-gray-100' }
  }
  return { label: 'Pending', color: 'text-amber-700 bg-amber-100' }
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function AccountPage() {
  const router = useRouter()
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<Tab>('saved')

  // Counts for header stats
  const [savedCount, setSavedCount] = useState(0)
  const [inquiriesCount, setInquiriesCount] = useState(0)
  const [hasListings, setHasListings] = useState(false)

  // Profile
  const [profile, setProfile] = useState<Profile | null>(null)

  // Tab data
  const [savedListings, setSavedListings] = useState<SavedItem[]>([])
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([])
  const [inquiries, setInquiries] = useState<InquiryRow[]>([])
  const [tabLoading, setTabLoading] = useState(false)

  // Settings: edit name
  const [editingName, setEditingName] = useState(false)
  const [nameValue, setNameValue] = useState('')
  const [nameSaving, setNameSaving] = useState(false)

  // Settings: change password
  const [changingPassword, setChangingPassword] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordSaving, setPasswordSaving] = useState(false)
  const [passwordMessage, setPasswordMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Settings: edu verification
  const [eduStep, setEduStep] = useState<'idle' | 'email' | 'code' | 'done'>('idle')
  const [eduEmail, setEduEmail] = useState('')
  const [eduCode, setEduCode] = useState('')
  const [eduSending, setEduSending] = useState(false)
  const [eduVerifying, setEduVerifying] = useState(false)
  const [eduError, setEduError] = useState('')
  const [eduSuccess, setEduSuccess] = useState('')

  // Settings: delete account
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [deleting, setDeleting] = useState(false)

  /* ---- Auth + initial counts ---- */
  useEffect(() => {
    async function init() {
      const supabase = createClient()
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) {
        router.replace('/auth/login?next=/account')
        return
      }
      setUser(authUser)

      const [savedRes, inqRes, listingsRes, profileRes] = await Promise.all([
        supabase
          .from('saved_listings')
          .select('listing_id', { count: 'exact', head: true })
          .eq('user_id', authUser.id),
        supabase
          .from('inquiries')
          .select('id', { count: 'exact', head: true })
          .eq('renter_id', authUser.id),
        supabase
          .from('listings')
          .select('id', { count: 'exact', head: true })
          .or(`user_id.eq.${authUser.id},lister_id.eq.${authUser.id}`),
        supabase
          .from('profiles')
          .select('verification_level, edu_email, account_type')
          .eq('id', authUser.id)
          .maybeSingle(),
      ])

      setSavedCount(savedRes.count ?? 0)
      setInquiriesCount(inqRes.count ?? 0)
      setHasListings((listingsRes.count ?? 0) > 0)
      if (profileRes.data) setProfile(profileRes.data as Profile)
      setLoading(false)
    }
    init()
  }, [router])

  /* ---- Fetch tab data ---- */
  const fetchTab = useCallback(async (tab: Tab, userId: string) => {
    if (tab === 'settings') return
    setTabLoading(true)
    const supabase = createClient()

    if (tab === 'searches') {
      try {
        const res = await fetch('/api/saved-searches')
        if (res.ok) {
          const data = await res.json()
          setSavedSearches(data)
        }
      } catch { /* ignore */ }
      setTabLoading(false)
      return
    }

    if (tab === 'saved') {
      const { data } = await supabase
        .from('saved_listings')
        .select(`
          created_at,
          listings (
            id, title, room_type, neighborhood,
            rent_monthly, monthly_rent,
            available_from, available_to, start_date, end_date,
            listing_photos (url, is_primary, display_order)
          )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (data) {
        setSavedListings(
          data.map((row: any) => ({
            saved_at: row.created_at,
            listing: Array.isArray(row.listings) ? (row.listings[0] ?? null) : row.listings,
          }))
        )
      }
    } else if (tab === 'inquiries') {
      const { data } = await supabase
        .from('inquiries')
        .select(`
          id, message, status, created_at, listing_id,
          listings (id, title, room_type, neighborhood)
        `)
        .eq('renter_id', userId)
        .order('created_at', { ascending: false })

      if (data) {
        setInquiries(
          data.map((row: any) => ({
            ...row,
            listing: Array.isArray(row.listings) ? (row.listings[0] ?? null) : row.listings,
          }))
        )
      }
    }

    setTabLoading(false)
  }, [])

  useEffect(() => {
    if (user) fetchTab(activeTab, user.id)
  }, [user, activeTab, fetchTab])

  /* ---- Loading ---- */
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex items-center gap-3 text-gray-500">
          <div className="w-5 h-5 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm">Loading account…</span>
        </div>
      </div>
    )
  }

  if (!user) return null

  const displayName =
    user.user_metadata?.full_name ?? user.email?.split('@')[0] ?? 'User'
  const initials = displayName
    .split(' ')
    .map((n: string) => n[0] ?? '')
    .join('')
    .toUpperCase()
    .slice(0, 2)

  /* ---- Render ---- */
  return (
    <div className="min-h-screen bg-gray-50 pt-20 pb-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">

        {/* Profile header */}
        <div className="mb-6">
          <div className="flex items-center gap-4 mb-5">
            <div className="w-14 h-14 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-semibold text-xl">
              {initials}
            </div>
            <div>
              <h1 className="font-serif text-2xl text-gray-900">{displayName}</h1>
              <p className="text-sm text-gray-500">{user.email}</p>
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white rounded-card shadow-card p-4 text-center">
              <p className="text-2xl font-bold text-gray-900">{savedCount}</p>
              <p className="text-xs text-gray-500 mt-0.5">Saved</p>
            </div>
            <div className="bg-white rounded-card shadow-card p-4 text-center">
              <p className="text-2xl font-bold text-gray-900">{inquiriesCount}</p>
              <p className="text-xs text-gray-500 mt-0.5">Inquiries Sent</p>
            </div>
            <div className="bg-white rounded-card shadow-card p-4 text-center">
              <p className="text-lg font-bold text-gray-900">{profile?.account_type === 'renter_premium' ? 'Premium' : 'Free'}</p>
              <p className="text-xs text-gray-500 mt-0.5">Account Level</p>
            </div>
          </div>
        </div>

        {/* Upgrade to Premium CTA */}
        <div className="bg-gradient-to-r from-primary-50 to-blue-50 border border-primary-200 rounded-card p-4 mb-6">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
              <Crown className="w-5 h-5 text-primary-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-gray-900">Upgrade to Renter Premium</h3>
              <p className="text-xs text-gray-500 mt-0.5 mb-3">
                Get priority inquiry responses, see listings before they go public, and unlock advanced search filters.
              </p>
              <Button variant="primary" size="sm" disabled>
                Coming Soon
              </Button>
            </div>
          </div>
        </div>

        {/* Lister dashboard link */}
        {hasListings && (
          <Link
            href="/account/listings"
            className="flex items-center justify-between bg-primary-50 border border-primary-200 rounded-card px-4 py-3 mb-6 hover:bg-primary-100 transition-colors group"
          >
            <div className="flex items-center gap-3">
              <BarChart2 className="w-5 h-5 text-primary-600" />
              <div>
                <p className="text-sm font-semibold text-primary-800">Lister Dashboard</p>
                <p className="text-xs text-primary-600">View stats and inquiries for your listings</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-primary-400 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        )}

        {/* Tabs + content */}
        <div className="bg-white rounded-card shadow-card overflow-hidden">
          {/* Tab bar */}
          <div className="flex border-b border-gray-100">
            {(
              [
                { key: 'saved' as Tab, label: 'Saved Listings', Icon: Heart },
                { key: 'searches' as Tab, label: 'Saved Searches', Icon: Bell },
                { key: 'inquiries' as Tab, label: 'Inquiries', Icon: MessageSquare },
                { key: 'settings' as Tab, label: 'Settings', Icon: Settings },
              ] as const
            ).map(({ key, label, Icon }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={[
                  'flex-1 flex items-center justify-center gap-2 py-3.5 text-sm font-medium transition-colors',
                  activeTab === key
                    ? 'text-primary-700 border-b-2 border-primary-600 -mb-px'
                    : 'text-gray-500 hover:text-gray-700',
                ].join(' ')}
              >
                <Icon className="w-4 h-4" />
                <span className="hidden sm:inline">{label}</span>
              </button>
            ))}
          </div>

          <div className="p-4 sm:p-6">
            {/* Spinner */}
            {tabLoading && (
              <div className="flex items-center justify-center py-12">
                <div className="w-5 h-5 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
              </div>
            )}

            {/* ---- Saved Listings ---- */}
            {!tabLoading && activeTab === 'saved' && (
              <>
                {savedListings.length === 0 ? (
                  <div className="text-center py-12">
                    <Heart className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                    <p className="text-sm text-gray-500 mb-3">No saved listings yet</p>
                    <Link href="/listings">
                      <Button variant="secondary" size="sm">Browse Listings</Button>
                    </Link>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {savedListings.map((item) => {
                      if (!item.listing) return null
                      const l = item.listing
                      const photos = l.listing_photos
                        ? [...l.listing_photos].sort((a, b) => {
                            if (a.is_primary && !b.is_primary) return -1
                            if (!a.is_primary && b.is_primary) return 1
                            return a.display_order - b.display_order
                          })
                        : []
                      const coverUrl = photos[0]?.url
                      const rent = l.rent_monthly ?? l.monthly_rent
                      const from = l.available_from ?? l.start_date
                      const to = l.available_to ?? l.end_date
                      const title = sanitizeListingTitle(l.title, l.room_type, l.neighborhood)

                      return (
                        <Link
                          key={l.id}
                          href={`/listings/${l.id}`}
                          className="flex gap-3 p-3 rounded-card border border-gray-100 hover:border-gray-200 hover:shadow-card transition-all"
                        >
                          <div className="relative w-20 h-16 rounded overflow-hidden bg-gray-100 flex-shrink-0">
                            {coverUrl ? (
                              <Image
                                src={coverUrl}
                                alt={title}
                                fill
                                className="object-cover"
                                sizes="80px"
                              />
                            ) : (
                              <div className="w-full h-full bg-gradient-to-br from-primary-100 to-primary-200" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-900 line-clamp-1">{title}</p>
                            <div className="flex items-center gap-1 text-xs text-gray-500 mt-0.5">
                              <MapPin className="w-3 h-3 flex-shrink-0" />
                              <span>{l.neighborhood} · {formatRoomType(l.room_type)}</span>
                            </div>
                            {from && to && (
                              <div className="flex items-center gap-1 text-xs text-gray-400 mt-0.5">
                                <Calendar className="w-3 h-3 flex-shrink-0" />
                                <span>{formatDate(from)} – {formatDate(to)}</span>
                              </div>
                            )}
                          </div>
                          <div className="flex-shrink-0 text-right">
                            {rent && (
                              <p className="text-sm font-bold text-gray-900">{formatRent(rent)}</p>
                            )}
                            <p className="text-xs text-gray-400 mt-0.5">
                              saved {formatDate(item.saved_at.split('T')[0])}
                            </p>
                          </div>
                        </Link>
                      )
                    })}
                  </div>
                )}
              </>
            )}

            {/* ---- Saved Searches ---- */}
            {!tabLoading && activeTab === 'searches' && (
              <>
                {savedSearches.length === 0 ? (
                  <div className="text-center py-12">
                    <Bell className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                    <p className="text-sm text-gray-500 mb-1">No saved searches yet</p>
                    <p className="text-xs text-gray-400 mb-3">Apply filters on the listings page and click &quot;Save this search&quot; to get alerts.</p>
                    <Link href="/listings">
                      <Button variant="secondary" size="sm">Browse Listings</Button>
                    </Link>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {savedSearches.map((search) => {
                      const parts: string[] = []
                      if (search.neighborhoods?.length) parts.push(search.neighborhoods.join(', '))
                      if (search.room_types?.length) parts.push(search.room_types.map(formatRoomType).join(', '))
                      if (search.min_price || search.max_price) {
                        const min = search.min_price ? `$${search.min_price}` : '$0'
                        const max = search.max_price ? `$${search.max_price}` : 'any'
                        parts.push(`${min}–${max}`)
                      }
                      if (search.move_in_after) parts.push(`from ${formatDate(search.move_in_after)}`)
                      if (search.move_out_before) parts.push(`until ${formatDate(search.move_out_before)}`)

                      const searchParams = new URLSearchParams()
                      if (search.neighborhoods?.[0]) searchParams.set('neighborhood', search.neighborhoods[0])
                      if (search.room_types?.[0]) searchParams.set('room_type', search.room_types[0])
                      if (search.min_price) searchParams.set('price_min', String(search.min_price))
                      if (search.max_price) searchParams.set('price_max', String(search.max_price))
                      if (search.move_in_after) searchParams.set('date_from', search.move_in_after)
                      if (search.move_out_before) searchParams.set('date_to', search.move_out_before)

                      return (
                        <div key={search.id} className="flex items-center gap-3 p-4 rounded-card border border-gray-100">
                          <div className="w-9 h-9 rounded-full bg-primary-50 flex items-center justify-center flex-shrink-0">
                            <Search className="w-4 h-4 text-primary-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 line-clamp-1">
                              {parts.length > 0 ? parts.join(' · ') : 'All listings'}
                            </p>
                            <p className="text-xs text-gray-400 mt-0.5">
                              Saved {formatDate(search.created_at.split('T')[0])}
                            </p>
                          </div>
                          <Link
                            href={`/listings?${searchParams.toString()}`}
                            className="text-xs font-medium text-primary-600 hover:text-primary-800 flex-shrink-0"
                          >
                            View
                          </Link>
                          <button
                            onClick={async () => {
                              await fetch('/api/saved-searches', {
                                method: 'DELETE',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ id: search.id }),
                              })
                              setSavedSearches((prev) => prev.filter((s) => s.id !== search.id))
                            }}
                            className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors flex-shrink-0"
                            title="Delete saved search"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )
                    })}
                  </div>
                )}
              </>
            )}

            {/* ---- Inquiry History ---- */}
            {!tabLoading && activeTab === 'inquiries' && (
              <>
                {inquiries.length === 0 ? (
                  <div className="text-center py-12">
                    <MessageSquare className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                    <p className="text-sm text-gray-500 mb-3">No inquiries sent yet</p>
                    <Link href="/listings">
                      <Button variant="secondary" size="sm">Browse Listings</Button>
                    </Link>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {inquiries.map((inquiry) => {
                      const statusInfo = inquiryStatusInfo(inquiry)
                      const listingTitle = inquiry.listing
                        ? sanitizeListingTitle(
                            inquiry.listing.title,
                            inquiry.listing.room_type,
                            inquiry.listing.neighborhood
                          )
                        : 'Listing'
                      return (
                        <div key={inquiry.id} className="p-4 rounded-card border border-gray-100">
                          <div className="flex items-start justify-between gap-3 mb-2">
                            <div>
                              <Link
                                href={`/listings/${inquiry.listing_id}`}
                                className="text-sm font-semibold text-gray-900 hover:text-primary-600 transition-colors"
                              >
                                {listingTitle}
                              </Link>
                              {inquiry.listing && (
                                <p className="text-xs text-gray-400 mt-0.5">
                                  {inquiry.listing.neighborhood} · {formatRoomType(inquiry.listing.room_type)}
                                </p>
                              )}
                            </div>
                            <span
                              className={`flex-shrink-0 text-xs font-medium px-2 py-0.5 rounded-badge ${statusInfo.color}`}
                            >
                              {statusInfo.label}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 line-clamp-2">{inquiry.message}</p>
                          <p className="text-xs text-gray-400 mt-2">
                            Sent {formatDate(inquiry.created_at.split('T')[0])}
                          </p>
                        </div>
                      )
                    })}
                  </div>
                )}
              </>
            )}

            {/* ---- Settings ---- */}
            {activeTab === 'settings' && (
              <div className="max-w-lg">
                {/* Verification Status */}
                <div className="mb-8">
                  <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-primary-600" />
                    Verification Status
                  </h3>

                  {/* Current level */}
                  <div className="bg-gray-50 rounded-card border border-gray-100 p-4 mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-600">Current Level</span>
                      {profile?.verification_level && profile.verification_level !== 'basic' ? (
                        <Badge variant={
                          profile.verification_level === 'edu_verified' ? 'edu_verified' :
                          profile.verification_level === 'lease_verified' ? 'lease_verified' :
                          profile.verification_level === 'id_verified' ? 'id_verified' :
                          'verified'
                        } />
                      ) : (
                        <span className="text-xs font-medium text-gray-500 bg-gray-200 px-2 py-0.5 rounded-badge">Member</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400">
                      Higher verification levels build trust and help you get faster responses from listers.
                    </p>
                  </div>

                  {/* Verification tiers */}
                  <div className="flex flex-col gap-3">
                    {/* Email Verified */}
                    <VerificationTier
                      icon={<CheckCircle className="w-4 h-4" />}
                      title="Email Verified"
                      description="Confirm your email address"
                      completed={!!user.email_confirmed_at}
                      color="text-blue-600 bg-blue-50"
                    />

                    {/* Lease Verified */}
                    <VerificationTier
                      icon={<Upload className="w-4 h-4" />}
                      title="Lease Verified"
                      description="Upload your lease when posting a listing to earn this badge"
                      completed={false}
                      color="text-green-600 bg-green-50"
                    />

                    {/* CU Student */}
                    {profile?.verification_level === 'edu_verified' || eduStep === 'done' ? (
                      <VerificationTier
                        icon={<GraduationCap className="w-4 h-4" />}
                        title="CU Student"
                        description={profile?.edu_email ? `Verified: ${profile.edu_email}` : 'Verified CU Boulder student'}
                        completed
                        color="text-accent-600 bg-accent-400/10"
                      />
                    ) : eduStep === 'idle' ? (
                      <VerificationTier
                        icon={<GraduationCap className="w-4 h-4" />}
                        title="CU Student"
                        description="Connect a @colorado.edu email address"
                        completed={false}
                        color="text-accent-600 bg-accent-400/10"
                        actionLabel="Connect .edu Email"
                        onAction={() => setEduStep('email')}
                      />
                    ) : (
                      <div className="px-4 py-4 rounded-card border border-accent-200 bg-accent-400/5">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center text-accent-600 bg-accent-400/10 flex-shrink-0">
                            <GraduationCap className="w-4 h-4" />
                          </div>
                          <p className="text-sm font-medium text-gray-900">Verify CU Email</p>
                        </div>

                        {eduError && (
                          <p className="text-xs text-red-600 mb-2">{eduError}</p>
                        )}
                        {eduSuccess && (
                          <p className="text-xs text-green-600 mb-2">{eduSuccess}</p>
                        )}

                        {eduStep === 'email' && (
                          <div className="flex flex-col gap-2">
                            <input
                              type="email"
                              placeholder="yourname@colorado.edu"
                              value={eduEmail}
                              onChange={(e) => setEduEmail(e.target.value)}
                              className="text-sm px-3 py-2 rounded-button border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
                            />
                            <div className="flex gap-2">
                              <Button
                                variant="primary"
                                size="sm"
                                disabled={eduSending || !eduEmail.trim().toLowerCase().endsWith('@colorado.edu')}
                                onClick={async () => {
                                  setEduSending(true)
                                  setEduError('')
                                  const res = await fetch('/api/verify-edu', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ email: eduEmail.trim() }),
                                  })
                                  const data = await res.json()
                                  setEduSending(false)
                                  if (!res.ok) {
                                    setEduError(data.error || 'Failed to send code')
                                    return
                                  }
                                  setEduSuccess('Code sent! Check your .edu inbox.')
                                  setEduStep('code')
                                }}
                              >
                                {eduSending ? 'Sending...' : 'Send Code'}
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => { setEduStep('idle'); setEduError(''); setEduSuccess('') }}>
                                Cancel
                              </Button>
                            </div>
                          </div>
                        )}

                        {eduStep === 'code' && (
                          <div className="flex flex-col gap-2">
                            <p className="text-xs text-gray-500">
                              Enter the 6-digit code sent to <strong>{eduEmail}</strong>
                            </p>
                            <input
                              type="text"
                              inputMode="numeric"
                              placeholder="123456"
                              maxLength={6}
                              value={eduCode}
                              onChange={(e) => setEduCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                              className="text-sm px-3 py-2 rounded-button border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500 tracking-widest font-mono"
                            />
                            <div className="flex gap-2">
                              <Button
                                variant="primary"
                                size="sm"
                                disabled={eduVerifying || eduCode.length !== 6}
                                onClick={async () => {
                                  setEduVerifying(true)
                                  setEduError('')
                                  setEduSuccess('')
                                  const res = await fetch('/api/verify-edu', {
                                    method: 'PUT',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ code: eduCode, email: eduEmail.trim() }),
                                  })
                                  const data = await res.json()
                                  setEduVerifying(false)
                                  if (!res.ok) {
                                    setEduError(data.error || 'Verification failed')
                                    return
                                  }
                                  setEduStep('done')
                                  setProfile((prev) => prev ? { ...prev, verification_level: 'edu_verified', edu_email: eduEmail.trim().toLowerCase() } : prev)
                                }}
                              >
                                {eduVerifying ? 'Verifying...' : 'Verify'}
                              </Button>
                              <button
                                onClick={() => { setEduStep('email'); setEduCode(''); setEduError(''); setEduSuccess('') }}
                                className="text-xs text-primary-600 hover:text-primary-700"
                              >
                                Resend code
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Account Information */}
                <h3 className="text-sm font-semibold text-gray-900 mb-4">Account Information</h3>
                <div className="flex flex-col gap-3">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Display Name</p>
                    {editingName ? (
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={nameValue}
                          onChange={(e) => setNameValue(e.target.value)}
                          className="flex-1 text-sm px-3 py-2 rounded-button border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
                          maxLength={100}
                        />
                        <Button
                          variant="primary"
                          size="sm"
                          disabled={nameSaving || !nameValue.trim()}
                          onClick={async () => {
                            setNameSaving(true)
                            const supabase = createClient()
                            await supabase.from('profiles').update({ full_name: nameValue.trim() }).eq('id', user.id)
                            await supabase.auth.updateUser({ data: { full_name: nameValue.trim() } })
                            setEditingName(false)
                            setNameSaving(false)
                            window.location.reload()
                          }}
                        >
                          {nameSaving ? 'Saving...' : 'Save'}
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => setEditingName(false)}>
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-button border border-gray-100">
                        <p className="text-sm text-gray-900">{displayName}</p>
                        <button
                          onClick={() => { setNameValue(displayName); setEditingName(true) }}
                          className="text-xs text-primary-600 hover:text-primary-700 font-medium"
                        >
                          Edit
                        </button>
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Email</p>
                    <p className="text-sm text-gray-900 px-3 py-2 bg-gray-50 rounded-button border border-gray-100">
                      {user.email}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Account Level</p>
                    <p className="text-sm text-gray-900 px-3 py-2 bg-gray-50 rounded-button border border-gray-100">
                      {profile?.account_type === 'renter_premium' ? 'Renter Premium' : profile?.account_type === 'lister_pro' ? 'Lister Pro' : 'Free'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Member Since</p>
                    <p className="text-sm text-gray-900 px-3 py-2 bg-gray-50 rounded-button border border-gray-100">
                      {user.created_at ? formatDate(user.created_at.split('T')[0]) : '—'}
                    </p>
                  </div>
                </div>

                {/* Change Password */}
                <div className="mt-6 pt-4 border-t border-gray-100">
                  <h3 className="text-sm font-semibold text-gray-900 mb-4">Change Password</h3>
                  {changingPassword ? (
                    <div className="flex flex-col gap-3">
                      <input
                        type="password"
                        placeholder="New password (min 8 characters)"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        minLength={8}
                        className="text-sm px-3 py-2 rounded-button border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                      <input
                        type="password"
                        placeholder="Confirm new password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="text-sm px-3 py-2 rounded-button border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                      {passwordMessage && (
                        <p className={`text-xs ${passwordMessage.type === 'error' ? 'text-red-600' : 'text-green-600'}`}>
                          {passwordMessage.text}
                        </p>
                      )}
                      <div className="flex gap-2">
                        <Button
                          variant="primary"
                          size="sm"
                          disabled={passwordSaving || newPassword.length < 8 || newPassword !== confirmPassword}
                          onClick={async () => {
                            setPasswordSaving(true)
                            setPasswordMessage(null)
                            const supabase = createClient()
                            const { error } = await supabase.auth.updateUser({ password: newPassword })
                            setPasswordSaving(false)
                            if (error) {
                              setPasswordMessage({ type: 'error', text: error.message })
                            } else {
                              setPasswordMessage({ type: 'success', text: 'Password updated successfully.' })
                              setNewPassword('')
                              setConfirmPassword('')
                              setTimeout(() => { setChangingPassword(false); setPasswordMessage(null) }, 2000)
                            }
                          }}
                        >
                          {passwordSaving ? 'Updating...' : 'Update Password'}
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => { setChangingPassword(false); setPasswordMessage(null); setNewPassword(''); setConfirmPassword('') }}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button variant="secondary" size="sm" onClick={() => setChangingPassword(true)}>
                      Change Password
                    </Button>
                  )}
                </div>

                {/* Sign Out & Delete Account */}
                <div className="mt-6 pt-4 border-t border-gray-100 flex flex-col gap-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-gray-600 hover:bg-gray-100 self-start"
                    onClick={async () => {
                      const supabase = createClient()
                      await supabase.auth.signOut()
                      router.push('/')
                    }}
                  >
                    Sign Out
                  </Button>

                  <div className="pt-4 border-t border-gray-100">
                    {showDeleteConfirm ? (
                      <div className="bg-red-50 border border-red-200 rounded-card p-4">
                        <p className="text-sm font-semibold text-red-800 mb-2">Delete your account?</p>
                        <p className="text-xs text-red-600 mb-3">
                          This will permanently delete your account, listings, messages, and all associated data. This cannot be undone.
                        </p>
                        <p className="text-xs text-gray-600 mb-2">Type <span className="font-mono font-bold">DELETE</span> to confirm:</p>
                        <input
                          type="text"
                          value={deleteConfirmText}
                          onChange={(e) => setDeleteConfirmText(e.target.value)}
                          className="w-full text-sm px-3 py-2 rounded-button border border-red-200 focus:outline-none focus:ring-2 focus:ring-red-500 mb-3"
                          placeholder="Type DELETE"
                        />
                        <div className="flex gap-2">
                          <Button
                            variant="primary"
                            size="sm"
                            className="!bg-red-600 hover:!bg-red-700"
                            disabled={deleteConfirmText !== 'DELETE' || deleting}
                            onClick={async () => {
                              setDeleting(true)
                              const res = await fetch('/api/account/delete', { method: 'POST' })
                              if (res.ok) {
                                const supabase = createClient()
                                await supabase.auth.signOut()
                                router.push('/')
                              } else {
                                setDeleting(false)
                                setDeleteConfirmText('')
                              }
                            }}
                          >
                            {deleting ? 'Deleting...' : 'Permanently Delete Account'}
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => { setShowDeleteConfirm(false); setDeleteConfirmText('') }}>
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => setShowDeleteConfirm(true)}
                        className="text-xs text-gray-400 hover:text-red-500 transition-colors"
                      >
                        Delete account
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function VerificationTier({
  icon,
  title,
  description,
  completed,
  pending,
  color,
  actionLabel,
  comingSoon,
  onAction,
}: {
  icon: React.ReactNode
  title: string
  description: string
  completed: boolean
  pending?: boolean
  color: string
  actionLabel?: string
  comingSoon?: boolean
  onAction?: () => void
}) {
  return (
    <div className={[
      'flex items-center gap-3 px-4 py-3 rounded-card border',
      completed ? 'border-gray-200 bg-white' : 'border-gray-100 bg-gray-50',
    ].join(' ')}>
      <div className={['w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0', color].join(' ')}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900">{title}</p>
        <p className="text-xs text-gray-500">{description}</p>
      </div>
      {completed ? (
        <span className="text-xs font-medium text-green-700 bg-green-100 px-2 py-0.5 rounded-badge flex-shrink-0">
          {pending ? 'Pending Review' : 'Complete'}
        </span>
      ) : actionLabel ? (
        <Button variant="secondary" size="sm" disabled={comingSoon} className="flex-shrink-0" onClick={onAction}>
          {comingSoon ? 'Coming Soon' : actionLabel}
        </Button>
      ) : null}
    </div>
  )
}
