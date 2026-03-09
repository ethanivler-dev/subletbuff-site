'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { GoogleMap, useJsApiLoader, OverlayView } from '@react-google-maps/api'

// Only show markers inside the greater Boulder area
const BOULDER_LAT_MIN = 39.9
const BOULDER_LAT_MAX = 40.1
const BOULDER_LNG_MIN = -105.35
const BOULDER_LNG_MAX = -105.15

function isInBoulderArea(lat: number, lng: number) {
  return (
    lat >= BOULDER_LAT_MIN && lat <= BOULDER_LAT_MAX &&
    lng >= BOULDER_LNG_MIN && lng <= BOULDER_LNG_MAX
  )
}

function formatPrice(price: number): string {
  if (price >= 1000) {
    const k = price / 1000
    return `$${Number.isInteger(k) ? k : k.toFixed(1)}k`
  }
  return `$${price}`
}

function formatFullPrice(price: number): string {
  return '$' + price.toLocaleString('en-US')
}

export interface MapListing {
  id: string
  title: string | null
  neighborhood: string | null
  rent_monthly: number | null
  public_latitude: number
  public_longitude: number
}

interface Props {
  currentId: string
  currentLat: number
  currentLng: number
  currentRent: number
  otherListings: MapListing[]
}

export function ListingDetailMap({
  currentId,
  currentLat,
  currentLng,
  currentRent,
  otherListings,
}: Props) {
  const router = useRouter()
  const [tooltipId, setTooltipId] = useState<string | null>(null)

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_MAPS_KEY ?? '',
  })

  const othersInBoulder = otherListings.filter(
    (l) =>
      l.id !== currentId &&
      isInBoulderArea(l.public_latitude, l.public_longitude),
  )

  const handleOtherClick = useCallback(
    (id: string) => {
      router.push(`/listings/${id}`)
    },
    [router],
  )

  const mapOptions = {
    disableDefaultUI: true,
    zoomControl: true,
    clickableIcons: false,
    gestureHandling: 'cooperative' as const,
  }

  if (!isLoaded) {
    return (
      <div className="w-full h-[250px] md:h-[350px] rounded-card bg-gray-100 flex items-center justify-center">
        <p className="text-sm text-gray-400">Loading map…</p>
      </div>
    )
  }

  return (
    <div className="rounded-card overflow-hidden border border-gray-200 h-[250px] md:h-[350px]">
      <GoogleMap
        mapContainerClassName="w-full h-full"
        center={{ lat: currentLat, lng: currentLng }}
        zoom={14}
        options={mapOptions}
      >
        {/* Secondary markers — other listings */}
        {othersInBoulder.map((listing) => {
          const rent = listing.rent_monthly ?? 0
          const isHovered = tooltipId === listing.id
          return (
            <OverlayView
              key={listing.id}
              position={{ lat: listing.public_latitude, lng: listing.public_longitude }}
              mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
              getPixelPositionOffset={(w, h) => ({ x: -(w / 2), y: -(h / 2) })}
            >
              <div
                style={{ position: 'relative', zIndex: isHovered ? 9 : 1 }}
                onMouseEnter={() => setTooltipId(listing.id)}
                onMouseLeave={() => setTooltipId(null)}
              >
                {/* Tooltip — appears above marker */}
                {isHovered && (
                  <div
                    className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-44 bg-white rounded-card shadow-card-hover border border-gray-100 p-2.5 pointer-events-none"
                    style={{ zIndex: 20 }}
                  >
                    <p className="text-xs font-bold text-gray-900">{formatPrice(rent)}/mo</p>
                    {(listing.title || listing.neighborhood) && (
                      <p className="text-xs text-gray-600 truncate mt-0.5">
                        {listing.title ?? listing.neighborhood}
                      </p>
                    )}
                    {listing.neighborhood && (
                      <p className="text-xs text-gray-400">{listing.neighborhood}</p>
                    )}
                  </div>
                )}
                <button
                  onClick={() => handleOtherClick(listing.id)}
                  className="px-2 py-0.5 rounded-full text-xs font-medium bg-white text-gray-700 shadow-sm border border-gray-300 hover:border-primary-500 hover:shadow-md whitespace-nowrap transition-all duration-150"
                >
                  {formatPrice(rent)}
                </button>
              </div>
            </OverlayView>
          )
        })}

        {/* Primary marker — current listing (rendered last so it's on top) */}
        <OverlayView
          position={{ lat: currentLat, lng: currentLng }}
          mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
          getPixelPositionOffset={(w, h) => ({ x: -(w / 2), y: -(h / 2) })}
        >
          <div
            className="px-3 py-1.5 rounded-full text-xs font-bold bg-red-600 text-white shadow-lg border-2 border-white whitespace-nowrap"
            style={{ zIndex: 20 }}
          >
            {formatPrice(currentRent)}
          </div>
        </OverlayView>
      </GoogleMap>
    </div>
  )
}
