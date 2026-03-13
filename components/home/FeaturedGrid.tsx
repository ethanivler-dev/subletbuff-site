import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { ListingCard, type ListingCardData } from '@/components/listings/ListingCard'
import { StaggeredGrid } from '@/components/home/StaggeredGrid'
import { sanitizeListingTitle } from '@/lib/utils'
import { shouldHideTestListings } from '@/lib/appEnv'
import { fetchWalkingTimesToCU } from '@/lib/walking-time'

async function fetchFeaturedListings(): Promise<ListingCardData[]> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  let query = supabase
    .from('listings')
    .select(`
      id, title, neighborhood, rent_monthly, available_from, available_to,
      room_type, furnished, is_featured, is_intern_friendly, immediate_movein, verified,
      save_count, photo_urls, user_id, latitude, longitude, public_latitude, public_longitude,
      listing_photos(url, display_order, is_primary)
    `)
    .eq('status', 'approved')
    .eq('paused', false)
    .eq('filled', false)
  if (shouldHideTestListings()) {
    query = query.eq('test_listing', false)
  }
  const { data, error } = await query.order('created_at', { ascending: false }).limit(8)

  if (error || !data) return []

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

  // Fetch user's saved IDs if logged in
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

  const listings: ListingCardData[] = data.map((row: Record<string, unknown>) => {
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
      verified: (row.verified as boolean) ?? false,
      verification_level: verificationMap.get(row.user_id as string),
      public_latitude: row.public_latitude as number | undefined,
      public_longitude: row.public_longitude as number | undefined,
    }
  })

  // Batch-fetch routed walking times to CU
  const walkingTimes = await fetchWalkingTimesToCU(
    listings.map((l) => ({ lat: l.latitude ?? l.public_latitude, lng: l.longitude ?? l.public_longitude })),
  )
  listings.forEach((l, i) => { l.walking_time = walkingTimes[i] })

  return listings
}

export async function FeaturedGrid() {
  const listings = await fetchFeaturedListings()

  if (listings.length === 0) {
    return (
      <section className="py-16 lg:py-24 bg-white">
        <div className="max-w-content mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center py-12">
            <h2 className="font-serif text-3xl text-gray-900 mb-3">Featured Listings</h2>
            <p className="text-gray-500 mb-6">
              No listings available yet. Be the first to post a sublet in Boulder!
            </p>
            <Link
              href="/post"
              className="inline-flex items-center gap-2 px-6 py-3 text-sm font-medium rounded-button bg-primary-600 text-white hover:bg-primary-700 transition-colors"
            >
              Post a Listing <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="py-16 lg:py-24 bg-white">
      <div className="max-w-content mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-8">
          <h2 className="font-serif text-3xl text-gray-900">Featured Listings</h2>
          <Link
            href="/listings"
            className="text-sm font-medium text-primary-600 hover:text-primary-700 flex items-center gap-1 transition-colors"
          >
            View All <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <StaggeredGrid>
            {listings.map((listing) => (
              <ListingCard key={listing.id} listing={listing} variant="vertical" />
            ))}
          </StaggeredGrid>
        </div>
      </div>
    </section>
  )
}
