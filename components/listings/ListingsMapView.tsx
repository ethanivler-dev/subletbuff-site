'use client'

import { useState, useRef, useCallback } from 'react'
import { GoogleMap, useJsApiLoader, OverlayView } from '@react-google-maps/api'
import { Map as MapIcon, X } from 'lucide-react'
import { ListingCard, type ListingCardData } from './ListingCard'
import { ListingsFilters } from '@/app/listings/ListingsFilters'

// Boulder, CO
const BOULDER_CENTER = { lat: 40.015, lng: -105.2705 }

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

interface Props {
  listings: ListingCardData[]
  total: number
  params: SearchParams
}

function formatPrice(price: number): string {
  if (price >= 1000) {
    const k = price / 1000
    return `$${Number.isInteger(k) ? k : k.toFixed(1)}k`
  }
  return `$${price}`
}

function PriceMarker({
  price,
  isActive,
  onClick,
}: {
  price: number
  isActive: boolean
  onClick: () => void
}) {
  return (
    <div style={{ zIndex: isActive ? 10 : 1, position: 'relative' }}>
      <button
        onClick={onClick}
        className={[
          'px-2.5 py-1 rounded-full text-xs font-bold whitespace-nowrap shadow-md border transition-all duration-150',
          isActive
            ? 'bg-primary-600 text-white border-primary-600 shadow-lg'
            : 'bg-white text-gray-900 border-gray-200 hover:border-primary-400 hover:shadow-lg',
        ].join(' ')}
        style={{ transform: isActive ? 'scale(1.15)' : 'scale(1)' }}
      >
        {formatPrice(price)}
      </button>
    </div>
  )
}

export function ListingsMapView({ listings, total, params }: Props) {
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [showMobileMap, setShowMobileMap] = useState(false)
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({})

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_MAPS_KEY ?? '',
  })

  const listingsWithCoords = listings.filter(
    (l) => l.public_latitude != null && l.public_longitude != null,
  )

  const mapCenter =
    listingsWithCoords.length > 0
      ? {
          lat:
            listingsWithCoords.reduce((s, l) => s + l.public_latitude!, 0) /
            listingsWithCoords.length,
          lng:
            listingsWithCoords.reduce((s, l) => s + l.public_longitude!, 0) /
            listingsWithCoords.length,
        }
      : BOULDER_CENTER

  const handlePinClick = useCallback(
    (id: string) => {
      setSelectedId(id)
      const el = cardRefs.current[id]
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    },
    [],
  )

  function MapMarkers() {
    return (
      <>
        {listingsWithCoords.map((listing) => (
          <OverlayView
            key={listing.id}
            position={{ lat: listing.public_latitude!, lng: listing.public_longitude! }}
            mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
            getPixelPositionOffset={(w, h) => ({ x: -(w / 2), y: -(h / 2) })}
          >
            <PriceMarker
              price={listing.rent_monthly}
              isActive={hoveredId === listing.id || selectedId === listing.id}
              onClick={() => handlePinClick(listing.id)}
            />
          </OverlayView>
        ))}
      </>
    )
  }

  const mapOptions = {
    disableDefaultUI: true,
    zoomControl: true,
    clickableIcons: false,
    gestureHandling: 'cooperative',
  }

  const cardList =
    listings.length === 0 ? (
      <div className="text-center py-20 text-gray-500">
        <p className="text-lg font-medium mb-2">No listings found</p>
        <p className="text-sm">Try adjusting your filters or search term.</p>
      </div>
    ) : (
      <div className="flex flex-col gap-4 mt-6">
        {listings.map((listing) => (
          <div
            key={listing.id}
            ref={(el) => {
              cardRefs.current[listing.id] = el
            }}
            onMouseEnter={() => setHoveredId(listing.id)}
            onMouseLeave={() => setHoveredId(null)}
            className={[
              'rounded-card transition-shadow duration-150',
              selectedId === listing.id ? 'ring-2 ring-primary-500' : '',
            ].join(' ')}
          >
            <ListingCard listing={listing} variant="horizontal" />
          </div>
        ))}
      </div>
    )

  return (
    <>
      {/* ── Desktop split panel ──────────────────────────────────── */}
      <div className="hidden md:flex">
        {/* Left: scrollable cards */}
        <div className="w-[55%] px-6 lg:px-10 py-6 min-w-0">
          <ListingsFilters params={params} total={total} />
          {cardList}
        </div>

        {/* Right: sticky map */}
        <div className="w-[45%] flex-shrink-0 sticky top-16 h-[calc(100vh-4rem)] border-l border-gray-100">
          {isLoaded ? (
            <GoogleMap
              mapContainerClassName="w-full h-full"
              center={mapCenter}
              zoom={13}
              options={mapOptions}
            >
              <MapMarkers />
            </GoogleMap>
          ) : (
            <div className="w-full h-full bg-gray-100 flex items-center justify-center">
              <p className="text-sm text-gray-400">Loading map…</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Mobile: cards + floating map button ─────────────────── */}
      <div className="md:hidden px-4 py-6 pb-24">
        <ListingsFilters params={params} total={total} />
        {cardList}
      </div>

      {/* Floating Map button (mobile only) */}
      <button
        className="md:hidden fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 px-5 py-3 bg-gray-900 text-white text-sm font-semibold rounded-full shadow-xl z-30"
        onClick={() => setShowMobileMap(true)}
      >
        <MapIcon className="w-4 h-4" />
        Map
      </button>

      {/* Mobile full-screen map overlay */}
      {showMobileMap && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            onClick={() => setShowMobileMap(false)}
            className="absolute top-4 right-4 z-10 flex items-center gap-1.5 px-4 py-2 bg-white rounded-full shadow-md text-sm font-medium text-gray-700 border border-gray-200"
          >
            <X className="w-4 h-4" />
            Close
          </button>
          {isLoaded ? (
            <GoogleMap
              mapContainerClassName="w-full h-full"
              center={mapCenter}
              zoom={13}
              options={{ ...mapOptions, gestureHandling: 'greedy' }}
            >
              <MapMarkers />
            </GoogleMap>
          ) : (
            <div className="w-full h-full bg-gray-100 flex items-center justify-center">
              <p className="text-sm text-gray-400">Loading map…</p>
            </div>
          )}
        </div>
      )}
    </>
  )
}
