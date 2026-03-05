import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import { MapPin, Calendar, Bed, Bath, Home, DollarSign, Clock, Heart, Shield } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { formatRent, formatPrice, formatDate, formatDateRange, formatRoomType, sanitizeListingTitle } from '@/lib/utils'
import { Badge } from '@/components/ui/Badge'
import { ListingGallery } from '@/components/listings/ListingGallery'
import { AmenityGrid } from '@/components/listings/AmenityGrid'
import { ListerProfile } from '@/components/listings/ListerProfile'
import { InquiryForm } from '@/components/listings/InquiryForm'
import { SimilarListings } from '@/components/listings/SimilarListings'
import { Skeleton } from '@/components/ui/Skeleton'
import type { Metadata } from 'next'

// Revalidate every 60s
export const revalidate = 60

interface ListingDetailRow {
  id: string
  title: string | null
  description: string | null
  neighborhood: string | null
  public_latitude: number | null
  public_longitude: number | null
  room_type: string | null
  bedrooms: number | null
  bathrooms: number | null
  sqft: number | null
  rent_monthly: number | null
  deposit: number | null
  utilities_included: boolean | null
  utilities_estimate: number | null
  available_from: string | null
  available_to: string | null
  min_stay_weeks: number | null
  flexible_dates: boolean | null
  furnished: boolean | string | null
  amenities: string[] | null
  house_rules: string | null
  roommate_info: string | null
  is_featured: boolean | null
  is_intern_friendly: boolean | null
  immediate_movein: boolean | null
  view_count: number | null
  created_at: string | null
  lister_id: string | null
  status: string | null
  paused: boolean | null
  filled: boolean | null
  listing_photos: Array<{ url: string; display_order: number; is_primary: boolean }> | null
  photo_urls: string[] | null
  profiles: {
    id: string
    full_name: string | null
    avatar_url: string | null
    verification_level: string | null
    created_at: string | null
  } | null
}

async function getListing(id: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('listings')
    .select(`
      id, title, description, neighborhood,
      public_latitude, public_longitude,
      room_type, bedrooms, bathrooms, sqft,
      rent_monthly, deposit, utilities_included, utilities_estimate,
      available_from, available_to, min_stay_weeks, flexible_dates,
      furnished, amenities, house_rules, roommate_info,
      is_featured, is_intern_friendly, immediate_movein,
      view_count, created_at, lister_id, status, paused, filled,
      listing_photos(url, display_order, is_primary),
      photo_urls,
      profiles!lister_id(id, full_name, avatar_url, verification_level, created_at)
    `)
    .eq('id', id)
    .single()

  if (error || !data) return null

  const row = data as unknown as ListingDetailRow

  // Only show approved + visible listings publicly
  if (row.status !== 'approved' || row.paused || row.filled) return null

  return row
}

async function getCurrentUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user ? { id: user.id, email: user.email ?? '' } : null
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const listing = await getListing(id)
  if (!listing) return { title: 'Listing Not Found' }

  const roomType = listing.room_type ?? 'private_room'
  const neighborhood = listing.neighborhood ?? 'Boulder'
  const title = sanitizeListingTitle(listing.title, roomType, neighborhood)

  return {
    title: `${title} — ${formatRent(listing.rent_monthly ?? 0)}`,
    description: listing.description?.slice(0, 160) ?? `Short-term sublet in ${neighborhood}`,
  }
}

export default async function ListingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const [listing, user] = await Promise.all([getListing(id), getCurrentUser()])

  if (!listing) notFound()

  const roomType = listing.room_type ?? 'private_room'
  const neighborhood = listing.neighborhood ?? 'Boulder'
  const title = sanitizeListingTitle(listing.title, roomType, neighborhood)
  const isFurnished =
    listing.furnished === true ||
    listing.furnished === 'Yes' ||
    (typeof listing.furnished === 'string' && listing.furnished.startsWith('Yes'))

  // Build photos array: prefer listing_photos table, fallback to photo_urls
  const photos = (listing.listing_photos && listing.listing_photos.length > 0)
    ? listing.listing_photos
    : (listing.photo_urls ?? []).map((url: string, i: number) => ({
        url,
        display_order: i,
        is_primary: i === 0,
      }))

  const amenities: string[] = Array.isArray(listing.amenities) ? listing.amenities : []

  const lister = listing.profiles
  const listerName = lister?.full_name || 'SubletBuff Member'
  const displayListerName = listerName.includes(' ')
    ? `${listerName.split(' ')[0]} ${listerName.split(' ').at(-1)?.[0] ?? ''}.`
    : listerName

  return (
    <div className="min-h-screen bg-white pt-16">
      {/* Photo Gallery */}
      <div className="max-w-content mx-auto px-4 sm:px-6 lg:px-8 pt-4">
        <ListingGallery photos={photos} title={title} />
      </div>

      {/* Content */}
      <div className="max-w-content mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left column — main content */}
          <div className="lg:col-span-2 flex flex-col gap-8">
            {/* Title + badges + price */}
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-2">
                {listing.is_featured && <Badge variant="featured" />}
                {listing.is_intern_friendly && <Badge variant="intern_friendly" />}
                {isFurnished && <Badge variant="furnished" />}
                {listing.immediate_movein && <Badge variant="immediate" />}
                {lister?.verification_level && lister.verification_level !== 'basic' && (
                  <Badge variant={lister.verification_level as 'lease_verified' | 'edu_verified' | 'id_verified'} />
                )}
              </div>

              <h1 className="font-serif text-3xl lg:text-4xl text-gray-900 mb-2">{title}</h1>

              <p className="text-2xl font-bold text-primary-600 mb-3">
                {formatRent(listing.rent_monthly ?? 0)}
              </p>

              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-gray-600">
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-4 h-4" /> {neighborhood}
                </span>
                <span className="flex items-center gap-1.5">
                  <Home className="w-4 h-4" /> {formatRoomType(roomType)}
                </span>
                {listing.bedrooms && (
                  <span className="flex items-center gap-1.5">
                    <Bed className="w-4 h-4" /> {listing.bedrooms} bed{listing.bedrooms > 1 ? 's' : ''}
                  </span>
                )}
                {listing.bathrooms && (
                  <span className="flex items-center gap-1.5">
                    <Bath className="w-4 h-4" /> {listing.bathrooms} bath
                  </span>
                )}
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4" />
                  {listing.available_from && listing.available_to
                    ? formatDateRange(listing.available_from, listing.available_to)
                    : 'Dates flexible'}
                </span>
              </div>
            </div>

            {/* About / Description */}
            {listing.description && (
              <section>
                <h2 className="text-lg font-semibold text-gray-900 mb-3">About This Sublet</h2>
                <div className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">
                  {listing.description}
                </div>
              </section>
            )}

            {/* Amenities */}
            {amenities.length > 0 && (
              <section>
                <h2 className="text-lg font-semibold text-gray-900 mb-3">Amenities</h2>
                <AmenityGrid amenities={amenities} />
              </section>
            )}

            {/* Location (approximate) */}
            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">Location</h2>
              <div className="rounded-card bg-gray-50 border border-gray-200 p-6">
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-primary-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-gray-800">{neighborhood} area, Boulder, CO</p>
                    <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                      <Shield className="w-3.5 h-3.5" />
                      Approximate location — exact address shared after your inquiry is accepted
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* House Rules */}
            {listing.house_rules && (
              <section>
                <h2 className="text-lg font-semibold text-gray-900 mb-3">House Rules</h2>
                <div className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">
                  {listing.house_rules}
                </div>
              </section>
            )}

            {/* Roommate Info */}
            {listing.roommate_info && (
              <section>
                <h2 className="text-lg font-semibold text-gray-900 mb-3">About the Roommates</h2>
                <div className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">
                  {listing.roommate_info}
                </div>
              </section>
            )}
          </div>

          {/* Right column — sidebar */}
          <div className="flex flex-col gap-6">
            {/* Lister profile card */}
            <ListerProfile
              name={displayListerName}
              avatarUrl={lister?.avatar_url ?? undefined}
              verificationLevel={lister?.verification_level ?? undefined}
              memberSince={lister?.created_at ?? undefined}
            />

            {/* Inquiry form */}
            <InquiryForm
              listingId={listing.id}
              listerId={listing.lister_id ?? ''}
              listerName={displayListerName}
              user={user}
            />

            {/* Fee breakdown */}
            <div className="rounded-card border border-gray-200 bg-white p-5">
              <h3 className="text-base font-semibold text-gray-900 mb-3">Fee Breakdown</h3>
              <div className="flex flex-col gap-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Monthly Rent</span>
                  <span className="font-medium text-gray-900">{formatPrice(listing.rent_monthly ?? 0)}</span>
                </div>
                {listing.deposit != null && listing.deposit > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Security Deposit</span>
                    <span className="font-medium text-gray-900">{formatPrice(listing.deposit)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-600">Utilities</span>
                  <span className="font-medium text-gray-900">
                    {listing.utilities_included
                      ? 'Included'
                      : listing.utilities_estimate
                        ? `~${formatPrice(listing.utilities_estimate)}/mo`
                        : 'Not included'}
                  </span>
                </div>
                {listing.min_stay_weeks != null && listing.min_stay_weeks > 0 && (
                  <div className="flex justify-between pt-2 border-t border-gray-100">
                    <span className="text-gray-600">Minimum Stay</span>
                    <span className="font-medium text-gray-900">
                      {listing.min_stay_weeks === 1 ? '1 week' : `${listing.min_stay_weeks} weeks`}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Similar Listings */}
      <Suspense fallback={null}>
        <SimilarListings
          currentId={listing.id}
          neighborhood={neighborhood}
          rentMonthly={listing.rent_monthly ?? 0}
        />
      </Suspense>
    </div>
  )
}
