import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { ListingCard, type ListingCardData } from '@/components/listings/ListingCard'
import { sanitizeListingTitle } from '@/lib/utils'

interface SimilarListingsProps {
  currentId: string
  neighborhood: string
  rentMonthly: number
}

export async function SimilarListings({ currentId, neighborhood, rentMonthly }: SimilarListingsProps) {
  const supabase = await createClient()

  // Similar = same neighborhood OR ±30% price range
  const minRent = Math.round(rentMonthly * 0.7)
  const maxRent = Math.round(rentMonthly * 1.3)

  const { data } = await supabase
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
    .eq('test_listing', false)
    .neq('id', currentId)
    .or(`neighborhood.eq.${neighborhood},and(rent_monthly.gte.${minRent},rent_monthly.lte.${maxRent})`)
    .order('created_at', { ascending: false })
    .limit(4)

  if (!data || data.length === 0) return null

  const listings: ListingCardData[] = data.map((row: Record<string, unknown>) => {
    const photos = (row.listing_photos as Array<{ url: string; display_order: number; is_primary: boolean }> | null) ?? []
    const primaryPhoto =
      photos.find((p) => p.is_primary)?.url ??
      photos.sort((a, b) => a.display_order - b.display_order)[0]?.url ??
      (Array.isArray(row.photo_urls) ? (row.photo_urls as string[])[0] : undefined)

    const roomType = (row.room_type as string) ?? 'private_room'
    const hood = (row.neighborhood as string) ?? 'Boulder'

    return {
      id: row.id as string,
      title: sanitizeListingTitle(row.title as string, roomType, hood),
      rent_monthly: (row.rent_monthly as number) ?? 0,
      room_type: roomType,
      neighborhood: hood,
      available_from: row.available_from as string,
      available_to: row.available_to as string,
      furnished: row.furnished as boolean | string,
      is_featured: (row.is_featured as boolean) ?? false,
      is_intern_friendly: (row.is_intern_friendly as boolean) ?? false,
      immediate_movein: (row.immediate_movein as boolean) ?? false,
      primary_photo_url: primaryPhoto,
    }
  })

  return (
    <section className="py-12 border-t border-gray-100">
      <div className="max-w-content mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="font-serif text-2xl text-gray-900 mb-6">You Might Also Like</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {listings.map((listing) => (
            <ListingCard key={listing.id} listing={listing} variant="vertical" />
          ))}
        </div>
      </div>
    </section>
  )
}
