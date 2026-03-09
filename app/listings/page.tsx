import { createClient } from '@/lib/supabase/server'
import { shouldHideTestListings } from '@/lib/appEnv'

function escapeLikePattern(str: string): string {
  return str.replace(/[%_\\]/g, '\\$&')
}
import { type ListingCardData } from '@/components/listings/ListingCard'
import { ListingsMapView } from '@/components/listings/ListingsMapView'
import { sanitizeListingTitle } from '@/lib/utils'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Summer Sublets in Boulder CO | Browse Verified Listings | SubletBuff',
  description: 'Browse verified summer sublets in Boulder near CU. Filter by neighborhood, price, dates, and amenities. Furnished rooms, apartments, and houses. Free to browse.',
  alternates: { canonical: '/listings' },
}

export const revalidate = 30

interface SearchParams {
  q?: string
  date_from?: string
  date_to?: string
  price_max?: string
  price_min?: string
  room_type?: string
  filter?: string
  sort?: string
  min_stay?: string // '1m' | '2m' | '3m' | '4m'
  neighborhood?: string
  furnished?: string     // 'true'
  intern_friendly?: string // 'true'
  parking?: string         // 'true'
  page?: string
}

const PAGE_SIZE = 24

async function fetchListings(params: SearchParams): Promise<{ listings: ListingCardData[]; total: number; page: number; totalPages: number }> {
  const supabase = await createClient()

  // Get current user to mark saved listings
  const { data: { user } } = await supabase.auth.getUser()

  let query = supabase
    .from('listings')
    .select(`
      id, title, neighborhood, rent_monthly, original_rent_monthly, available_from, available_to,
      room_type, furnished, is_featured, is_intern_friendly, immediate_movein, verified,
      save_count, photo_urls, public_latitude, public_longitude, user_id,
      listing_photos(url, display_order, is_primary)
    `, { count: 'exact' })
    .eq('status', 'approved')
    .eq('paused', false)
    .eq('filled', false)

  if (shouldHideTestListings()) {
    query = query.eq('test_listing', false)
  }


  // Text search on neighborhood or title
  if (params.q) {
    const safeQ = escapeLikePattern(params.q)
    query = query.or(`neighborhood.ilike.%${safeQ}%,title.ilike.%${safeQ}%`)
  }

  // Neighborhood exact match
  if (params.neighborhood) query = query.eq('neighborhood', params.neighborhood)

  // Price filters
  if (params.price_min) query = query.gte('rent_monthly', parseInt(params.price_min))
  if (params.price_max) query = query.lte('rent_monthly', parseInt(params.price_max))

  // Room type
  if (params.room_type) query = query.eq('room_type', params.room_type)

  // Date overlap: listing.available_to >= date_from AND listing.available_from <= date_to
  if (params.date_from) query = query.gte('available_to', params.date_from)
  if (params.date_to) query = query.lte('available_from', params.date_to)

  // Min stay: show listings whose min_stay_weeks <= selected threshold (0 = flexible, always included)
  if (params.min_stay) {
    const months = parseInt(params.min_stay.replace('m', ''))
    if (!isNaN(months)) {
      const maxWeeks = months * 4
      query = query.or(`min_stay_weeks.eq.0,min_stay_weeks.lte.${maxWeeks}`)
    }
  }

  // Quick filters
  if (params.filter === 'pets') query = query.eq('pets', 'Yes').or('pets.ilike.%yes%')
  if (params.filter === 'utilities_included') query = query.eq('utilities_included', true)
  if (params.filter === 'near_campus') {
    query = query.or('neighborhood.ilike.%the hill%,neighborhood.ilike.%near cu%')
  }
  if (params.filter === 'short_term') {
    query = query.or('min_stay_weeks.eq.0,min_stay_weeks.lte.8')
  }

  // New boolean filters
  if (params.furnished === 'true') query = query.or('furnished.eq.true,furnished.ilike.Yes%')
  if (params.intern_friendly === 'true') query = query.eq('is_intern_friendly', true)
  if (params.parking === 'true') query = query.contains('amenities', ['parking'])

  // Sort
  const sort = params.sort ?? 'newest'
  if (sort === 'price_asc') query = query.order('rent_monthly', { ascending: true })
  else if (sort === 'price_desc') query = query.order('rent_monthly', { ascending: false })
  else if (sort === 'soonest') query = query.order('available_from', { ascending: true })
  else query = query.order('created_at', { ascending: false })

  const page = Math.max(1, parseInt(params.page ?? '1') || 1)
  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1
  query = query.range(from, to)

  const { data, error, count } = await query

  if (error || !data) return { listings: [], total: 0, page: 1, totalPages: 0 }

  // Batch-fetch verification levels for listers
  const userIds = [...new Set(data.map((r: Record<string, unknown>) => r.user_id as string).filter(Boolean))]
  const verificationMap = new Map<string, string>()
  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, verification_level')
      .in('id', userIds)
    if (profiles) {
      for (const p of profiles) {
        if (p.verification_level) verificationMap.set(p.id, p.verification_level)
      }
    }
  }

  // Fetch user's saved listing IDs if logged in
  let savedIds = new Set<string>()
  if (user && data.length > 0) {
    const ids = data.map((r: Record<string, unknown>) => r.id as string)
    const { data: savedRows } = await supabase
      .from('saved_listings')
      .select('listing_id')
      .eq('user_id', user.id)
      .in('listing_id', ids)
    if (savedRows) savedIds = new Set(savedRows.map((r: { listing_id: string }) => r.listing_id))
  }

  const listings = data.map((row: Record<string, unknown>) => {
    const photos = (row.listing_photos as Array<{ url: string; display_order: number; is_primary: boolean }> | null) ?? []
    const primaryPhoto =
      photos.find((p) => p.is_primary)?.url ??
      photos.sort((a, b) => a.display_order - b.display_order)[0]?.url ??
      (Array.isArray(row.photo_urls) ? (row.photo_urls as string[])[0] : undefined)

    const roomType = (row.room_type as string) ?? 'private_room'
    const neighborhood = (row.neighborhood as string) ?? 'Boulder'

    return {
      id: row.id as string,
      title: sanitizeListingTitle(row.title as string, roomType, neighborhood),
      rent_monthly: (row.rent_monthly as number) ?? 0,
      room_type: roomType,
      neighborhood,
      available_from: row.available_from as string,
      available_to: row.available_to as string,
      furnished: row.furnished as boolean | string,
      is_featured: (row.is_featured as boolean) ?? false,
      is_intern_friendly: (row.is_intern_friendly as boolean) ?? false,
      immediate_movein: (row.immediate_movein as boolean) ?? false,
      primary_photo_url: primaryPhoto,
      save_count: (row.save_count as number) ?? 0,
      is_saved: savedIds.has(row.id as string),
      public_latitude: row.public_latitude as number | undefined,
      public_longitude: row.public_longitude as number | undefined,
      original_rent_monthly: row.original_rent_monthly as number | undefined,
      verified: (row.verified as boolean) ?? false,
      verification_level: verificationMap.get(row.user_id as string),
    }
  })

  const totalCount = count ?? listings.length
  return { listings, total: totalCount, page, totalPages: Math.ceil(totalCount / PAGE_SIZE) }
}

export default async function ListingsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const params = await searchParams
  const { listings, total, page, totalPages } = await fetchListings(params)

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://subletbuff.com'
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Boulder Sublets',
    numberOfItems: total,
    itemListElement: listings.slice(0, 20).map((l, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: `${baseUrl}/listings/${l.id}`,
      name: l.title,
    })),
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {/* Page header */}
      <div className="bg-white border-b border-gray-100 pt-20 pb-4">
        <div className="max-w-content mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-2xl font-semibold text-gray-900">
            {params.q ? `"${params.q}"` : 'Boulder Sublets'}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {total} listing{total !== 1 ? 's' : ''} available
          </p>
        </div>
      </div>

      <ListingsMapView listings={listings} total={total} params={params} page={page} totalPages={totalPages} />
    </div>
  )
}
