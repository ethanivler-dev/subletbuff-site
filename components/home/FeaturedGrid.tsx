import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { ListingCard, type ListingCardData } from '@/components/listings/ListingCard'
import { ListingCardSkeleton } from '@/components/ui/Skeleton'
import { sanitizeListingTitle } from '@/lib/utils'

async function fetchFeaturedListings(): Promise<ListingCardData[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('listings')
    .select(`
      id, title, neighborhood, rent_monthly, available_from, available_to,
      room_type, furnished, is_featured, is_intern_friendly, immediate_movein,
      photo_urls,
      listing_photos(url, display_order, is_primary)
    `)
    .eq('status', 'approved')
    .eq('paused', false)
    .eq('filled', false)
    .order('created_at', { ascending: false })
    .limit(8)

  if (error || !data) return []

  return data.map((row: Record<string, unknown>) => {
    // Prefer listing_photos table; fall back to photo_urls array
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
}

export async function FeaturedGrid() {
  const listings = await fetchFeaturedListings()

  if (listings.length === 0) {
    return (
      <section className="py-16 lg:py-24 bg-white">
        <div className="max-w-content mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-8">
            <h2 className="font-serif text-3xl text-gray-900">Featured Listings</h2>
            <Link href="/listings" className="text-sm font-medium text-primary-600 hover:text-primary-700 flex items-center gap-1">
              View All <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <ListingCardSkeleton key={i} variant="vertical" />
            ))}
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
          {listings.map((listing) => (
            <ListingCard key={listing.id} listing={listing} variant="vertical" />
          ))}
        </div>
      </div>
    </section>
  )
}
