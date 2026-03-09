'use client'

import Image from 'next/image'
import Link from 'next/link'
import { MapPin, Calendar, Bed } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { SaveButton } from '@/components/listings/SaveButton'
import { formatRent, formatDateRange, formatRoomType, walkingTimeToCU } from '@/lib/utils'

export interface ListingCardData {
  id: string
  title: string
  rent_monthly: number
  room_type: string
  neighborhood: string
  available_from: string
  available_to: string
  furnished: boolean | string
  is_featured: boolean
  is_intern_friendly: boolean
  immediate_movein: boolean
  primary_photo_url?: string
  verification_level?: string
  is_saved?: boolean
  save_count?: number
  public_latitude?: number
  public_longitude?: number
  original_rent_monthly?: number
  verified?: boolean
  lease_status?: string
}

interface ListingCardProps {
  listing: ListingCardData
  variant?: 'vertical' | 'horizontal'
}

export function ListingCard({ listing, variant = 'vertical' }: ListingCardProps) {
  const {
    id,
    title,
    rent_monthly,
    room_type,
    neighborhood,
    available_from,
    available_to,
    furnished,
    is_featured,
    is_intern_friendly,
    immediate_movein,
    primary_photo_url,
    verification_level,
    is_saved = false,
    save_count = 0,
    public_latitude,
    public_longitude,
  } = listing

  const walkTime = walkingTimeToCU(public_latitude, public_longitude)

  const isFurnished =
    furnished === true ||
    furnished === 'Yes' ||
    (typeof furnished === 'string' && furnished.startsWith('Yes'))

  if (variant === 'horizontal') {
    return (
      <Link
        href={`/listings/${id}`}
        className="group flex gap-0 rounded-card border border-gray-100 bg-white shadow-card hover:shadow-card-hover hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:outline-none transition-all duration-200 overflow-hidden"
      >
        {/* Photo */}
        <div className="relative w-44 flex-shrink-0 bg-gray-100">
          {primary_photo_url ? (
            <Image
              src={primary_photo_url}
              alt={`${title} - ${formatRoomType(room_type)} in ${neighborhood}`}
              fill
              className="object-cover"
              sizes="176px"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-primary-100 to-primary-200 flex items-center justify-center">
              <span className="text-primary-400 text-xs">No photo</span>
            </div>
          )}
          {is_featured && (
            <span className="absolute top-2 left-2">
              <Badge variant="featured" />
            </span>
          )}
          {listing.verified && (
            <span className="absolute top-2 right-10">
              <Badge variant="verified" />
            </span>
          )}
          <SaveButton
            listingId={id}
            initialSaved={is_saved}
            saveCount={save_count}
            variant="card-vertical"
          />
        </div>

        {/* Details */}
        <div className="flex-1 p-4 flex flex-col gap-1.5 min-w-0">
          <div>
            {listing.original_rent_monthly && listing.original_rent_monthly > rent_monthly ? (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="line-through text-gray-400 text-sm">{formatRent(listing.original_rent_monthly)}</span>
                <span className="text-xl font-bold text-gray-900">{formatRent(rent_monthly)}</span>
                <span className="text-xs font-medium text-orange-600 bg-orange-50 border border-orange-200 rounded-badge px-1.5 py-0.5">Price reduced</span>
              </div>
            ) : (
              <p className="text-xl font-bold text-gray-900">{formatRent(rent_monthly)}</p>
            )}
            <h3 className="text-sm font-semibold text-gray-800 leading-snug mt-0.5 line-clamp-1">
              {title}
            </h3>
          </div>

          <div className="flex items-center gap-1 text-gray-500 text-xs">
            <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
            <span>{neighborhood}{walkTime && ` · ~${walkTime} to CU`} · {formatRoomType(room_type)}</span>
          </div>

          <div className="flex items-center gap-1 text-gray-500 text-xs">
            <Calendar className="w-3.5 h-3.5 flex-shrink-0" />
            <span>{formatDateRange(available_from, available_to)}</span>
            {isFurnished && <span className="text-gray-400">· Furnished</span>}
          </div>

          <div className="flex flex-wrap gap-1.5 mt-1">
            {listing.lease_status === 'verified' && <Badge variant="lease_verified" />}
            {verification_level && verification_level !== 'basic' && (
              <Badge variant={verification_level as 'lease_verified' | 'edu_verified' | 'id_verified'} />
            )}
            {is_intern_friendly && <Badge variant="intern_friendly" />}
            {immediate_movein && <Badge variant="immediate" />}
            {isFurnished && <Badge variant="furnished" />}
          </div>

        </div>
      </Link>
    )
  }

  // Vertical (grid) variant
  return (
    <Link
      href={`/listings/${id}`}
      className="group rounded-card border border-gray-100 bg-white shadow-card hover:shadow-card-hover hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:outline-none transition-all duration-200 overflow-hidden flex flex-col"
    >
      {/* Photo */}
      <div className="relative aspect-[4/3] bg-gray-100">
        {primary_photo_url ? (
          <Image
            src={primary_photo_url}
            alt={`${title} - ${formatRoomType(room_type)} in ${neighborhood}`}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-primary-100 to-primary-200 flex items-center justify-center">
            <span className="text-primary-400 text-xs">No photo</span>
          </div>
        )}

        <SaveButton
          listingId={id}
          initialSaved={is_saved}
          saveCount={save_count}
          variant="card-vertical"
        />

        {is_featured && (
          <span className="absolute top-2 left-2">
            <Badge variant="featured" />
          </span>
        )}
        {listing.verified && (
          <span className="absolute top-2 right-10">
            <Badge variant="verified" />
          </span>
        )}
      </div>

      {/* Details */}
      <div className="p-4 flex flex-col gap-1.5 flex-1">
        <div className="flex items-start justify-between gap-2">
          {listing.original_rent_monthly && listing.original_rent_monthly > rent_monthly ? (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="line-through text-gray-400 text-sm">{formatRent(listing.original_rent_monthly)}</span>
              <span className="text-lg font-bold text-gray-900">{formatRent(rent_monthly)}</span>
              <span className="text-xs font-medium text-orange-600 bg-orange-50 border border-orange-200 rounded-badge px-1.5 py-0.5">Price reduced</span>
            </div>
          ) : (
            <p className="text-lg font-bold text-gray-900">{formatRent(rent_monthly)}</p>
          )}
        </div>

        <h3 className="text-sm font-semibold text-gray-800 leading-snug line-clamp-2">{title}</h3>

        <div className="flex items-center gap-1 text-gray-500 text-xs">
          <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
          <span className="truncate">{neighborhood}{walkTime && ` · ~${walkTime} to CU`}</span>
        </div>

        <div className="flex items-center gap-1 text-gray-400 text-xs">
          <Bed className="w-3.5 h-3.5 flex-shrink-0" />
          <span>{formatRoomType(room_type)}</span>
          <span>·</span>
          <Calendar className="w-3.5 h-3.5 flex-shrink-0" />
          <span className="truncate">{formatDateRange(available_from, available_to)}</span>
        </div>

        <div className="flex flex-wrap gap-1 mt-auto pt-2">
          {listing.lease_status === 'verified' && <Badge variant="lease_verified" />}
          {verification_level && verification_level !== 'basic' && (
            <Badge variant={verification_level as 'lease_verified' | 'edu_verified' | 'id_verified'} />
          )}
          {is_intern_friendly && <Badge variant="intern_friendly" />}
          {isFurnished && <Badge variant="furnished" />}
          {immediate_movein && <Badge variant="immediate" />}
        </div>
      </div>
    </Link>
  )
}
