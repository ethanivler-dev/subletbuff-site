'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { GoogleMap, useJsApiLoader, OverlayView } from '@react-google-maps/api'
import { Map as MapIcon, X, ChevronRight } from 'lucide-react'
import { ListingCard, type ListingCardData } from './ListingCard'
import { ListingsFilters } from '@/app/listings/ListingsFilters'

// Boulder, CO
const BOULDER_CENTER = { lat: 40.0150, lng: -105.2705 }

// Reject any markers that fall outside the greater Boulder area
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

interface SearchParams {
  q?: string
  date_from?: string
  date_to?: string
  price_max?: string
  price_min?: string
  room_type?: string
  filter?: string
  sort?: string
  min_stay?: string
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
  const router = useRouter()
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [showMobileMap, setShowMobileMap] = useState(false)
  const [showMap, setShowMap] = useState(true)

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_MAPS_KEY ?? '',
  })

  // Only show markers for listings with valid Boulder-area coordinates
  const listingsWithCoords = listings.filter(
    (l) =>
      l.public_latitude != null &&
      l.public_longitude != null &&
      isInBoulderArea(l.public_latitude, l.public_longitude),
  )

  // Fit map to actual markers, enforcing a minimum zoom of 12
  const handleMapLoad = useCallback((map: google.maps.Map) => {
    if (listingsWithCoords.length === 0) {
      map.setCenter(BOULDER_CENTER)
      map.setZoom(13)
      return
    }
    const bounds = new google.maps.LatLngBounds()
    listingsWithCoords.forEach((l) => {
      bounds.extend({ lat: l.public_latitude!, lng: l.public_longitude! })
    })
    map.fitBounds(bounds, 60)
    google.maps.event.addListenerOnce(map, 'bounds_changed', () => {
      const z = map.getZoom()
      if (z !== undefined && z < 12) map.setZoom(12)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Clicking a price pin navigates to that listing's detail page
  const handlePinClick = useCallback(
    (id: string) => {
      router.push(`/listings/${id}`)
    },
    [router],
  )

  const mapOptions = {
    disableDefaultUI: true,
    zoomControl: true,
    clickableIcons: false,
  }

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
              isActive={hoveredId === listing.id}
              onClick={() => handlePinClick(listing.id)}
            />
          </OverlayView>
        ))}
      </>
    )
  }

  function MapPanel({ greedy = false }: { greedy?: boolean }) {
    return (
      <div className="relative w-full h-full">
        {isLoaded ? (
          <GoogleMap
            mapContainerClassName="w-full h-full"
            center={BOULDER_CENTER}
            zoom={13}
            options={{ ...mapOptions, gestureHandling: greedy ? 'greedy' : 'cooperative' }}
            onLoad={handleMapLoad}
          >
            <MapMarkers />
          </GoogleMap>
        ) : (
          <div className="w-full h-full bg-gray-100 flex items-center justify-center">
            <p className="text-sm text-gray-400">Loading map…</p>
          </div>
        )}
        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-10 bg-white/80 backdrop-blur-sm px-3 py-1 rounded text-xs text-gray-500 whitespace-nowrap pointer-events-none">
          Pin locations are approximate and do not represent exact addresses
        </div>
      </div>
    )
  }

  const cardRefs: Record<string, HTMLDivElement | null> = {}

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
              cardRefs[listing.id] = el
            }}
            onMouseEnter={() => setHoveredId(listing.id)}
            onMouseLeave={() => setHoveredId(null)}
            className="rounded-card transition-shadow duration-150"
          >
            <ListingCard listing={listing} variant="horizontal" />
          </div>
        ))}
      </div>
    )

  return (
    <>
      {/* ── Desktop split panel ──────────────────────────────────── */}
      <div className="hidden md:flex overflow-hidden">
        {/* Left: scrollable cards */}
        <div
          style={{
            width: showMap ? '55%' : '100%',
            transition: 'width 300ms ease-in-out',
          }}
          className="py-6 px-6 lg:px-10 min-w-0 overflow-hidden"
        >
          {/* Filters + Hide/Show Map toggle */}
          <div className="flex items-start gap-3">
            <div className="flex-1 min-w-0">
              <ListingsFilters params={params} total={total} />
            </div>
            <button
              onClick={() => setShowMap((v) => !v)}
              className="flex-shrink-0 flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 px-3 py-2 rounded-button border border-gray-200 bg-white hover:bg-gray-50 transition-colors"
            >
              {showMap ? (
                <>
                  <ChevronRight className="w-3.5 h-3.5" />
                  Hide Map
                </>
              ) : (
                <>
                  <MapIcon className="w-3.5 h-3.5" />
                  Show Map
                </>
              )}
            </button>
          </div>

          {cardList}
        </div>

        {/* Right: sticky map */}
        <div
          style={{
            width: showMap ? '45%' : '0%',
            flexShrink: 0,
            overflow: 'hidden',
            borderLeft: showMap ? '1px solid #f3f4f6' : 'none',
            transition: 'width 300ms ease-in-out',
          }}
          className="sticky top-16 h-[calc(100vh-4rem)]"
        >
          <MapPanel />
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
          <MapPanel greedy />
        </div>
      )}
    </>
  )
}
