import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { isStagingEnvironment, shouldHideTestListings } from '@/lib/appEnv'
import { rateLimit } from '@/lib/rate-limit'

function escapeLikePattern(str: string): string {
  return str.replace(/[%_\\]/g, '\\$&')
}

/**
 * GET /api/listings — search/filter active listings
 * Never returns address, latitude, or longitude fields.
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const params = request.nextUrl.searchParams

  const q = params.get('q')
  const neighborhood = params.get('neighborhood')
  const price_min = params.get('price_min')
  const price_max = params.get('price_max')
  const room_type = params.get('room_type')
  const date_from = params.get('date_from')
  const date_to = params.get('date_to')
  const min_stay = params.get('min_stay')
  const filter = params.get('filter')
  const furnished = params.get('furnished')
  const intern_friendly = params.get('intern_friendly')
  const parking = params.get('parking')
  const sort = params.get('sort') ?? 'newest'
  const limit = Math.min(parseInt(params.get('limit') ?? '50'), 100)
  const page = parseInt(params.get('page') ?? '1')

  // Map bounds filtering
  const lat_min = params.get('lat_min')
  const lat_max = params.get('lat_max')
  const lng_min = params.get('lng_min')
  const lng_max = params.get('lng_max')

  let query = supabase
    .from('listings')
    .select(`
      id, title, neighborhood, rent_monthly, original_rent_monthly,
      available_from, available_to,
      room_type, furnished, is_featured, is_intern_friendly, immediate_movein, verified,
      save_count, photo_urls, public_latitude, public_longitude,
      listing_photos(url, display_order, is_primary)
    `, { count: 'exact' })
    .eq('status', 'approved')
    .eq('paused', false)
    .eq('filled', false)

  if (shouldHideTestListings()) {
    query = query.eq('test_listing', false)
  }


  // Text search
  if (q) {
    const safeQ = escapeLikePattern(q)
    query = query.or(`neighborhood.ilike.%${safeQ}%,title.ilike.%${safeQ}%`)
  }

  // Neighborhood exact match
  if (neighborhood) query = query.eq('neighborhood', neighborhood)

  // Price range
  if (price_min) query = query.gte('rent_monthly', parseInt(price_min))
  if (price_max) query = query.lte('rent_monthly', parseInt(price_max))

  // Room type
  if (room_type) query = query.eq('room_type', room_type)

  // Date overlap
  if (date_from) query = query.gte('available_to', date_from)
  if (date_to) query = query.lte('available_from', date_to)

  // Min stay
  if (min_stay) {
    const months = parseInt(min_stay.replace('m', ''))
    if (!isNaN(months)) {
      const maxWeeks = months * 4
      query = query.or(`min_stay_weeks.eq.0,min_stay_weeks.lte.${maxWeeks}`)
    }
  }

  // Quick filters
  if (filter === 'pets') query = query.or('pets.eq.Yes,pets.ilike.%yes%')
  if (filter === 'utilities_included') query = query.eq('utilities_included', true)
  if (filter === 'near_campus') {
    query = query.or('neighborhood.ilike.%university hill%,neighborhood.ilike.%the hill%,neighborhood.ilike.%near cu%')
  }

  // Boolean filters
  if (furnished === 'true') query = query.or('furnished.eq.true,furnished.ilike.Yes%')
  if (intern_friendly === 'true') query = query.eq('is_intern_friendly', true)
  if (parking === 'true') query = query.contains('amenities', ['parking'])

  // Map bounds
  if (lat_min) query = query.gte('public_latitude', parseFloat(lat_min))
  if (lat_max) query = query.lte('public_latitude', parseFloat(lat_max))
  if (lng_min) query = query.gte('public_longitude', parseFloat(lng_min))
  if (lng_max) query = query.lte('public_longitude', parseFloat(lng_max))

  // Sort
  if (sort === 'price_asc') query = query.order('rent_monthly', { ascending: true })
  else if (sort === 'price_desc') query = query.order('rent_monthly', { ascending: false })
  else if (sort === 'soonest') query = query.order('available_from', { ascending: true })
  else query = query.order('created_at', { ascending: false })

  // Pagination
  const offset = (page - 1) * limit
  query = query.range(offset, offset + limit - 1)

  const { data, error, count } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Check saved status for logged-in user
  const { data: { user } } = await supabase.auth.getUser()
  let savedIds = new Set<string>()
  if (user && data && data.length > 0) {
    const ids = data.map((r: Record<string, unknown>) => r.id as string)
    const { data: savedRows } = await supabase
      .from('saved_listings')
      .select('listing_id')
      .eq('user_id', user.id)
      .in('listing_id', ids)
    if (savedRows) savedIds = new Set(savedRows.map((r: { listing_id: string }) => r.listing_id))
  }

  const listings = (data ?? []).map((row: Record<string, unknown>) => {
    const photos = (row.listing_photos as Array<{ url: string; display_order: number; is_primary: boolean }> | null) ?? []
    const primaryPhoto =
      photos.find((p) => p.is_primary)?.url ??
      photos.sort((a, b) => a.display_order - b.display_order)[0]?.url ??
      (Array.isArray(row.photo_urls) ? (row.photo_urls as string[])[0] : undefined)

    return {
      id: row.id,
      title: row.title,
      rent_monthly: row.rent_monthly ?? 0,
      original_rent_monthly: row.original_rent_monthly,
      room_type: row.room_type ?? 'private_room',
      neighborhood: row.neighborhood ?? 'Boulder',
      available_from: row.available_from,
      available_to: row.available_to,
      furnished: row.furnished,
      is_featured: row.is_featured ?? false,
      is_intern_friendly: row.is_intern_friendly ?? false,
      immediate_movein: row.immediate_movein ?? false,
      primary_photo_url: primaryPhoto,
      save_count: row.save_count ?? 0,
      is_saved: savedIds.has(row.id as string),
      public_latitude: row.public_latitude,
      public_longitude: row.public_longitude,
      // NOTE: address, latitude, longitude are intentionally excluded
    }
  })

  return NextResponse.json({ listings, total: count ?? listings.length, page, limit })
}

/**
 * POST /api/listings — create a new listing
 * Auth required. Auto-jitters coordinates. Sets status to 'pending'.
 */
export async function POST(request: NextRequest) {
  const limited = rateLimit(request, { key: 'listings', limit: 5, windowSeconds: 60 })
  if (limited) return limited

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  const body = await request.json()
  const isStaging = isStagingEnvironment()

  // Jitter coordinates for privacy
  const baseLat = body.latitude ?? 40.0150
  const baseLng = body.longitude ?? -105.2705
  const jitterLat = baseLat + (Math.random() - 0.5) * 0.004
  const jitterLng = baseLng + (Math.random() - 0.5) * 0.004

  const rentNum = parseInt(body.rent_monthly) || 0
  const depositNum = body.deposit ? parseInt(body.deposit) : null
  const minStayMonths = body.min_stay === 'flexible'
    ? null
    : parseInt(String(body.min_stay).replace('m', ''))

  const { data: listing, error: insertError } = await supabase
    .from('listings')
    .insert({
      user_id: user.id,
      lister_id: user.id,
      email: user.email ?? '',
      first_name: user.user_metadata?.full_name?.split(' ')[0] ?? '',
      last_name: user.user_metadata?.full_name?.split(' ').slice(1).join(' ') ?? '',

      address: body.address,
      unit_number: body.unit_number || null,
      neighborhood: body.neighborhood,
      lat: baseLat,
      lng: baseLng,
      latitude: baseLat,
      longitude: baseLng,
      public_latitude: jitterLat,
      public_longitude: jitterLng,

      monthly_rent: rentNum,
      rent_monthly: rentNum,
      security_deposit: depositNum,
      deposit: depositNum,

      start_date: body.available_from,
      end_date: body.available_to,
      available_from: body.available_from,
      available_to: body.available_to,

      room_type: body.room_type,
      title: body.title,
      beds: body.beds ?? '1',
      baths: body.baths ?? '1',

      min_stay_weeks: minStayMonths ? minStayMonths * 4 : 0,
      min_stay_months: minStayMonths,

      description: body.description,
      furnished: body.furnished,
      amenities: body.amenities ?? [],
      utilities_included: body.utilities_included ?? false,
      utilities_estimate: body.utilities_estimate ? parseInt(body.utilities_estimate) : null,
      house_rules: body.house_rules || null,
      roommate_info: body.roommate_info || null,
      is_intern_friendly: body.is_intern_friendly ?? false,
      immediate_movein: body.immediate_movein ?? false,

      auto_reduce_enabled: body.auto_reduce_enabled ?? false,
      auto_reduce_amount: body.auto_reduce_amount ? parseInt(body.auto_reduce_amount) : null,
      auto_reduce_interval_days: body.auto_reduce_interval_days ? parseInt(body.auto_reduce_interval_days) : null,
      auto_reduce_max_times: body.auto_reduce_max_times ? parseInt(body.auto_reduce_max_times) : null,

      management_company: body.management_company || null,

      photo_urls: body.photo_urls ?? [],
      test_listing: isStaging,
      status: 'pending',
      paused: false,
      filled: false,
    })
    .select('id')
    .single()

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  // Move photos to listing-scoped path and insert listing_photos rows
  if (listing && Array.isArray(body.photos) && body.photos.length > 0) {
    const movedPhotos: { url: string; storagePath: string; caption: string | null }[] = []

    for (const p of body.photos as { url: string; storagePath?: string; caption?: string }[]) {
      const oldPath = p.storagePath
      if (oldPath) {
        const filename = oldPath.split('/').pop() ?? oldPath
        const newPath = `listings/${listing.id}/${filename}`

        const { error: moveErr } = await supabase.storage
          .from('listing-photos')
          .move(oldPath, newPath)

        if (!moveErr) {
          const { data: urlData } = supabase.storage
            .from('listing-photos')
            .getPublicUrl(newPath)
          movedPhotos.push({ url: urlData.publicUrl, storagePath: newPath, caption: p.caption || null })
        } else {
          movedPhotos.push({ url: p.url, storagePath: oldPath, caption: p.caption || null })
        }
      } else {
        movedPhotos.push({ url: p.url, storagePath: '', caption: p.caption || null })
      }
    }

    const photoRows = movedPhotos.map((ph, i) => ({
      listing_id: listing.id,
      url: ph.url,
      storage_path: ph.storagePath,
      display_order: i,
      is_primary: i === 0,
      caption: ph.caption,
    }))
    await supabase.from('listing_photos').insert(photoRows)

    // Update photo_urls on the listing with final URLs
    await supabase
      .from('listings')
      .update({ photo_urls: movedPhotos.map((ph) => ph.url) })
      .eq('id', listing.id)
  }

  return NextResponse.json({ id: listing.id }, { status: 201 })
}
