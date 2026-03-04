import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { ListingCard, type ListingCardData } from '@/components/listings/ListingCard'
import { ListingCardSkeleton } from '@/components/ui/Skeleton'
import { ListingsFilters } from './ListingsFilters'
import { sanitizeListingTitle } from '@/lib/utils'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Browse Listings',
  description: 'Search verified short-term sublets in Boulder, CO.',
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
}

async function fetchListings(params: SearchParams): Promise<{ listings: ListingCardData[]; total: number }> {
  const supabase = await createClient()

  let query = supabase
    .from('listings')
    .select(`
      id, title, neighborhood, rent_monthly, available_from, available_to,
      room_type, furnished, is_featured, is_intern_friendly, immediate_movein,
      photo_urls,
      listing_photos(url, display_order, is_primary)
    `, { count: 'exact' })
    .eq('status', 'approved')
    .eq('paused', false)
    .eq('filled', false)

  // Text search on neighborhood or title
  if (params.q) {
    query = query.or(`neighborhood.ilike.%${params.q}%,title.ilike.%${params.q}%`)
  }

  // Price filters
  if (params.price_min) query = query.gte('rent_monthly', parseInt(params.price_min))
  if (params.price_max) query = query.lte('rent_monthly', parseInt(params.price_max))

  // Room type
  if (params.room_type) query = query.eq('room_type', params.room_type)

  // Quick filters
  if (params.filter === 'pets') query = query.eq('pets', 'Yes').or('pets.ilike.%yes%')
  if (params.filter === 'utilities_included') query = query.eq('utilities_included', true)
  if (params.filter === 'near_campus') {
    query = query.or('neighborhood.ilike.%university hill%,neighborhood.ilike.%the hill%,neighborhood.ilike.%near cu%')
  }

  // Sort
  const sort = params.sort ?? 'newest'
  if (sort === 'price_asc') query = query.order('rent_monthly', { ascending: true })
  else if (sort === 'price_desc') query = query.order('rent_monthly', { ascending: false })
  else if (sort === 'soonest') query = query.order('available_from', { ascending: true })
  else query = query.order('created_at', { ascending: false })

  query = query.limit(50)

  const { data, error, count } = await query

  if (error || !data) return { listings: [], total: 0 }

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
    }
  })

  return { listings, total: count ?? listings.length }
}

export default async function ListingsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const params = await searchParams
  const { listings, total } = await fetchListings(params)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Page header */}
      <div className="bg-white border-b border-gray-100 pt-20 pb-4">
        <div className="max-w-content mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-2xl font-semibold text-gray-900">
            {params.q ? `"${params.q}"` : 'Boulder Sublets'}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">{total} listing{total !== 1 ? 's' : ''} available</p>
        </div>
      </div>

      <div className="max-w-content mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Filters */}
        <ListingsFilters params={params} total={total} />

        {/* Results */}
        {listings.length === 0 ? (
          <div className="text-center py-20 text-gray-500">
            <p className="text-lg font-medium mb-2">No listings found</p>
            <p className="text-sm">Try adjusting your filters or search term.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4 mt-6">
            {listings.map((listing) => (
              <ListingCard key={listing.id} listing={listing} variant="horizontal" />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
