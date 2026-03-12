import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { isAdminServer } from '@/lib/admin'
import {
  sendListingApprovedEmail, sendListingRejectedEmail,
  sendLeaseApprovedEmail, sendLeaseRejectedEmail,
} from '@/lib/email'

/**
 * GET /api/admin/listings/[id] — fetch a single listing for admin edit
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || !(await isAdminServer(supabase, user.id))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data, error } = await supabase
    .from('listings')
    .select(`
      id, title, description, neighborhood, room_type,
      rent_monthly, monthly_rent, available_from, available_to,
      start_date, end_date, status, paused, filled, test_listing,
      verified, furnished, is_intern_friendly, immediate_movein,
      bedrooms, bathrooms, beds, baths,
      deposit, security_deposit,
      house_rules, roommate_info, amenities,
      utilities_included, utilities_estimate,
      photo_urls, email, first_name, last_name,
      listing_photos(url, display_order, is_primary, storage_path)
    `)
    .eq('id', id)
    .single()

  if (error || !data) {
    return NextResponse.json({ error: 'Listing not found' }, { status: 404 })
  }

  return NextResponse.json(data)
}

const ADMIN_EDITABLE_FIELDS = [
  'title', 'description', 'rent_monthly', 'neighborhood', 'room_type',
  'available_from', 'available_to', 'status', 'paused', 'filled', 'test_listing',
  'furnished', 'is_intern_friendly', 'immediate_movein', 'verified', 'lease_status',
  'bedrooms', 'bathrooms', 'email', 'deposit',
  'house_rules', 'roommate_info', 'amenities',
  'utilities_included', 'utilities_estimate',
]

// Legacy alias columns that must be kept in sync
const ADMIN_LEGACY_ALIASES: Record<string, string> = {
  rent_monthly: 'monthly_rent',
  deposit: 'security_deposit',
  bedrooms: 'beds',
  bathrooms: 'baths',
  available_from: 'start_date',
  available_to: 'end_date',
}

/**
 * PATCH /api/admin/listings/[id] — admin edit a listing
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || !(await isAdminServer(supabase, user.id))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json()

  const updates: Record<string, unknown> = Object.fromEntries(
    Object.entries(body).filter(([key]) => ADMIN_EDITABLE_FIELDS.includes(key))
  )

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
  }

  // Write legacy alias columns to keep them in sync
  for (const [modern, legacy] of Object.entries(ADMIN_LEGACY_ALIASES)) {
    if (modern in updates) {
      updates[legacy] = updates[modern]
    }
  }

  // Track who reviewed and when for status changes
  if (updates.status === 'approved' || updates.status === 'rejected') {
    updates.reviewed_by = user.id
    updates.reviewed_at = new Date().toISOString()
  }

  const { error } = await supabase
    .from('listings')
    .update(updates)
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Send email notification on status or lease_status change (fire-and-forget)
  const statusChanged = updates.status === 'approved' || updates.status === 'rejected'
  const leaseChanged = updates.lease_status === 'verified' || updates.lease_status === 'rejected'

  if (statusChanged || leaseChanged) {
    const { data: listing } = await supabase
      .from('listings')
      .select('title, email, first_name, lister_id, user_id')
      .eq('id', id)
      .single()

    // Resolve email: try listing.email first, then fall back to auth user email
    let email = listing?.email
    if (!email && listing) {
      const ownerId = listing.lister_id ?? listing.user_id
      if (ownerId) {
        const { data: { user: ownerUser } } = await supabase.auth.admin.getUserById(ownerId)
        email = ownerUser?.email ?? null
      }
    }

    if (email && listing) {
      const name = listing.first_name || 'there'
      const title = listing.title || 'your listing'

      if (statusChanged) {
        if (updates.status === 'approved') {
          sendListingApprovedEmail(email, name, title, id)
        } else {
          sendListingRejectedEmail(email, name, title)
        }
      }

      if (leaseChanged) {
        if (updates.lease_status === 'verified') {
          sendLeaseApprovedEmail(email, name, title, id)
        } else {
          sendLeaseRejectedEmail(email, name, title)
        }
      }
    }
  }

  return NextResponse.json({ success: true })
}

/**
 * DELETE /api/admin/listings/[id] — admin permanently delete a listing
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || !(await isAdminServer(supabase, user.id))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  await supabase.from('listing_photos').delete().eq('listing_id', id)
  await supabase.from('saved_listings').delete().eq('listing_id', id)
  await supabase.from('messages').delete().eq('listing_id', id)

  const { error } = await supabase.from('listings').delete().eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
