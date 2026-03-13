import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { isAdminServer } from '@/lib/admin'

/**
 * GET /api/admin/listings — fetch all listings for admin dashboard
 * Query params: ?status=approved&search=term
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || !(await isAdminServer(supabase, user.id))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const url = request.nextUrl
  const status = url.searchParams.get('status')
  const search = url.searchParams.get('search')?.trim()

  let query = supabase
    .from('listings')
    .select(`
      id, title, description, neighborhood, room_type,
      rent_monthly, monthly_rent,
      available_from, available_to, start_date, end_date,
      status, paused, filled, test_listing, verified, created_at,
      lister_id, user_id,
      address, latitude, longitude,
      lease_status, lease_document_path,
      reviewed_by, reviewed_at, rejection_reason,
      management_company, furnished, is_intern_friendly, immediate_movein,
      amenities, house_rules, roommate_info, beds, baths,
      utilities_included, utilities_estimate, deposit, pets,
      admin_flag, admin_notes, auto_reduce_enabled, created_device,
      listing_photos(url, display_order, is_primary)
    `)
    .order('created_at', { ascending: false })

  if (status === 'paused') {
    query = query.eq('paused', true)
  } else if (status && status !== 'all') {
    query = query.eq('status', status).eq('paused', false)
  }

  const { data: listings, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Fetch profiles for all listers
  const ownerIds = Array.from(
    new Set((listings ?? []).map((l) => l.lister_id ?? l.user_id).filter(Boolean))
  ) as string[]

  let profiles: Record<string, { full_name: string | null; email: string | null; verification_level: string | null }> = {}
  if (ownerIds.length > 0) {
    const { data: profileData } = await supabase
      .from('profiles')
      .select('id, full_name, email, verification_level')
      .in('id', ownerIds)

    if (profileData) {
      for (const p of profileData) {
        profiles[p.id] = { full_name: p.full_name, email: p.email, verification_level: p.verification_level }
      }
    }
  }

  // Server-side search filter
  let filtered = listings ?? []
  if (search) {
    const lower = search.toLowerCase()
    filtered = filtered.filter((l) => {
      const title = (l.title ?? '').toLowerCase()
      const hood = (l.neighborhood ?? '').toLowerCase()
      const addr = (l.address ?? '').toLowerCase()
      const ownerId = l.lister_id ?? l.user_id
      const ownerName = (ownerId && profiles[ownerId]?.full_name) || ''
      const ownerEmail = (ownerId && profiles[ownerId]?.email) || ''
      return (
        title.includes(lower) ||
        hood.includes(lower) ||
        addr.includes(lower) ||
        ownerName.toLowerCase().includes(lower) ||
        ownerEmail.toLowerCase().includes(lower)
      )
    })
  }

  return NextResponse.json({ listings: filtered, profiles })
}
