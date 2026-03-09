import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { shouldHideTestListings } from '@/lib/appEnv'

/**
 * GET /api/listings/[id] — single listing detail
 * Never returns address/latitude/longitude unless address_shared for current user.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('listings')
    .select(`
      id, title, description, neighborhood,
      public_latitude, public_longitude,
      room_type, bedrooms, bathrooms, sqft,
      rent_monthly, monthly_rent, deposit, security_deposit,
      utilities_included, utilities_estimate,
      available_from, available_to, start_date, end_date,
      min_stay_weeks, flexible_dates,
      furnished, amenities, house_rules, roommate_info,
      is_featured, is_intern_friendly, immediate_movein,
      created_at, lister_id, user_id, status, paused, filled, test_listing, save_count,
      original_rent_monthly, management_company,
      listing_photos(url, display_order, is_primary, caption),
      photo_urls
    `)
    .eq('id', id)
    .single()

  if (error || !data) {
    return NextResponse.json({ error: 'Listing not found' }, { status: 404 })
  }

  const isPublic =
    data.status === 'approved' &&
    !data.paused &&
    !data.filled &&
    (!shouldHideTestListings() || !data.test_listing)

  // Check auth early so we know if owner
  const { data: { user } } = await supabase.auth.getUser()
  const ownerId = data.lister_id ?? data.user_id
  const isOwner = !!user && user.id === ownerId

  // Only show public listings unless owner
  if (!isPublic && !isOwner) {
    return NextResponse.json({ error: 'Listing not found' }, { status: 404 })
  }

  // If owner, fetch private fields for editing
  let ownerFields: Record<string, unknown> = {}
  if (isOwner) {
    const { data: privateData } = await supabase
      .from('listings')
      .select(`
        address, latitude, longitude,
        auto_reduce_enabled, auto_reduce_amount,
        auto_reduce_interval_days, auto_reduce_max_times
      `)
      .eq('id', id)
      .single()
    if (privateData) ownerFields = privateData
  }

  // Check if current user has address_shared via inquiry
  let address: string | null = null
  if (user && !isOwner) {
    const { data: inquiry } = await supabase
      .from('inquiries')
      .select('address_shared')
      .eq('listing_id', id)
      .eq('renter_id', user.id)
      .eq('address_shared', true)
      .maybeSingle()
    if (inquiry?.address_shared) {
      const { data: addressRow } = await supabase
        .from('listings')
        .select('address')
        .eq('id', id)
        .single()
      address = addressRow?.address ?? null
    }
  }
  let profile = null
  if (ownerId) {
    const { data: profileData } = await supabase
      .from('profiles')
      .select('id, full_name, verification_level, created_at')
      .eq('id', ownerId)
      .single()
    profile = profileData
  }

  // Check saved status
  let isSaved = false
  if (user) {
    const { data: savedRow } = await supabase
      .from('saved_listings')
      .select('listing_id')
      .eq('user_id', user.id)
      .eq('listing_id', id)
      .maybeSingle()
    isSaved = !!savedRow
  }

  return NextResponse.json({
    listing: {
      ...data,
      ...ownerFields,
      address_shared: address,
    },
    profile,
    is_saved: isSaved,
    is_owner: isOwner,
  })
}

/**
 * PATCH /api/listings/[id] — update a listing
 * Auth required. Only the lister can update their own listing.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  // Verify ownership
  const { data: listing } = await supabase
    .from('listings')
    .select('lister_id, user_id, status')
    .eq('id', id)
    .single()

  if (!listing) {
    return NextResponse.json({ error: 'Listing not found' }, { status: 404 })
  }

  const ownerId = listing.lister_id ?? listing.user_id
  if (ownerId !== user.id) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
  }

  const body = await request.json()

  const ALLOWED_FIELDS = [
    'title', 'description', 'neighborhood', 'room_type',
    'rent_monthly', 'deposit', 'available_from', 'available_to',
    'min_stay_weeks', 'flexible_dates', 'furnished', 'amenities',
    'utilities_included', 'utilities_estimate', 'house_rules',
    'roommate_info', 'is_intern_friendly', 'immediate_movein',
    'paused', 'filled',
    'auto_reduce_enabled', 'auto_reduce_amount',
    'auto_reduce_interval_days', 'auto_reduce_max_times',
    'address', 'latitude', 'longitude',
    'public_latitude', 'public_longitude',
  ]

  const updates: Record<string, unknown> = Object.fromEntries(
    Object.entries(body).filter(([key]) => ALLOWED_FIELDS.includes(key))
  )

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
  }

  // Re-review: if address or photos changed on an approved listing, send back to pending
  const RE_REVIEW_FIELDS = ['address', 'latitude', 'longitude']
  const needsReReview = RE_REVIEW_FIELDS.some((f) => f in updates) || body._photos_changed
  if (needsReReview && listing.status === 'approved') {
    updates.status = 'pending'
    updates.reviewed_by = null
    updates.reviewed_at = null
  }

  const { data: updated, error } = await supabase
    .from('listings')
    .update(updates)
    .eq('id', id)
    .select('id, status')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ id: updated.id, status: updated.status })
}

/**
 * DELETE /api/listings/[id] — delete a listing
 * Auth required. Only the lister can delete their own listing.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  // Verify ownership
  const { data: listing } = await supabase
    .from('listings')
    .select('lister_id, user_id')
    .eq('id', id)
    .single()

  if (!listing) {
    return NextResponse.json({ error: 'Listing not found' }, { status: 404 })
  }

  const ownerId = listing.lister_id ?? listing.user_id
  if (ownerId !== user.id) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
  }

  const { error } = await supabase.rpc('delete_listing_safe', { p_listing_id: id })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
