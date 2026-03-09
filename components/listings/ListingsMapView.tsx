'use client'

import { useState, useCallback, useRef, useMemo } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { GoogleMap, useJsApiLoader, OverlayView } from '@react-google-maps/api'
import { Map as MapIcon, X, ChevronRight, ChevronLeft } from 'lucide-react'
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
  neighborhood?: string
  furnished?: string
  intern_friendly?: string
  parking?: string
  page?: string
}

interface Props {
  listings: ListingCardData[]
  total: number
  params: SearchParams
  page: number
  totalPages: number
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
  onHoverStart,
  onHoverEnd,
}: {
  price: number
  isActive: boolean
  onClick: () => void
  onHoverStart: () => void
  onHoverEnd: () => void
}) {
  return (
    <div style={{ zIndex: isActive ? 10 : 1, position: 'relative' }}>
      <button
        onClick={onClick}
        onMouseEnter={onHoverStart}
        onMouseLeave={onHoverEnd}
        className={[
          'rounded-full font-bold whitespace-nowrap shadow-md border transition-all duration-150',
          isActive
            ? 'bg-gray-900 text-white border-gray-900 shadow-lg text-sm px-3 py-1.5 scale-110'
            : 'bg-red-500 text-white border-red-500 hover:bg-red-600 hover:shadow-lg text-xs px-2.5 py-1',
        ].join(' ')}
      >
        {formatPrice(price)}
      </button>
    </div>
  )
}

export function ListingsMapView({ listings, total, params, page, totalPages }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const goToPage = useCallback((p: number) => {
    const sp = new URLSearchParams(searchParams.toString())
    if (p <= 1) sp.delete('page')
    else sp.set('page', String(p))
    router.push(`${pathname}?${sp.toString()}`)
  }, [router, pathname, searchParams])

  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [showMobileMap, setShowMobileMap] = useState(false)
  const [showMap, setShowMap] = useState(true)
  const [mapBounds, setMapBounds] = useState<google.maps.LatLngBounds | null>(null)
  const mapRef = useRef<google.maps.Map | null>(null)

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_MAPS_KEY ?? '',
  })

  // All listings with valid Boulder coords — used for initial map fit
  const allListingsWithCoords = listings.filter(
    (l) =>
      l.public_latitude != null &&
      l.public_longitude != null &&
      isInBoulderArea(l.public_latitude, l.public_longitude),
  )

  // Client-side filter: only apply when the map panel is actually visible
  const mapIsVisible = showMap || showMobileMap
  const visibleListings = (mapBounds && mapIsVisible)
    ? listings.filter(
        (l) =>
          !l.public_latitude ||
          !l.public_longitude ||
          mapBounds.contains({ lat: l.public_latitude, lng: l.public_longitude }),
      )
    : listings

  // Markers only for visible listings with valid coords
  const listingsWithCoords = visibleListings.filter(
    (l) =>
      l.public_latitude != null &&
      l.public_longitude != null &&
      isInBoulderArea(l.public_latitude, l.public_longitude),
  )

  // Fit map to actual markers, enforcing a minimum zoom of 12
  const handleMapLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map
    if (allListingsWithCoords.length === 0) {
      map.setCenter(BOULDER_CENTER)
      map.setZoom(13)
      return
    }
    const bounds = new google.maps.LatLngBounds()
    allListingsWithCoords.forEach((l) => {
      bounds.extend({ lat: l.public_latitude!, lng: l.public_longitude! })
    })
    map.fitBounds(bounds, 60)
    google.maps.event.addListenerOnce(map, 'bounds_changed', () => {
      const z = map.getZoom()
      if (z !== undefined && z < 12) map.setZoom(12)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Clicking a price pin scrolls to the corresponding card and highlights it
  const handlePinClick = useCallback(
    (id: string) => {
      setHoveredId(id)
      const card = cardRefs.current[id]
      if (card) {
        card.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    },
    [],
  )

  const handlePinHoverStart = useCallback(
    (id: string) => {
      setHoveredId(id)
    },
    [],
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
              onHoverStart={() => handlePinHoverStart(listing.id)}
              onHoverEnd={() => setHoveredId(null)}
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
            onIdle={() => {
              if (mapRef.current) setMapBounds(mapRef.current.getBounds() ?? null)
            }}
          >
            {MapMarkers()}
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

  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({})

  const hasActiveFilters = !!(
    params.q || params.neighborhood || params.price_min || params.price_max ||
    params.room_type || params.filter || params.date_from || params.date_to ||
    params.min_stay || params.furnished || params.intern_friendly || params.parking
  )

  const cardList =
    visibleListings.length === 0 ? (
      <div className="text-center py-20 text-gray-500">
        {hasActiveFilters ? (
          <>
            <p className="text-lg font-medium mb-2">No listings found</p>
            <p className="text-sm">Try adjusting your filters or search term.</p>
          </>
        ) : (
          <>
            <p className="text-lg font-medium mb-2">No listings available yet</p>
            <p className="text-sm mb-6">Be the first to post a sublet in Boulder!</p>
            <a
              href="/post"
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-button bg-primary-600 text-white hover:bg-primary-700 transition-colors"
            >
              Post a Listing
            </a>
          </>
        )}
      </div>
    ) : (
      <div className={`grid grid-cols-1 sm:grid-cols-2 ${showMap ? '' : 'lg:grid-cols-3'} gap-4 mt-6`}>
        {visibleListings.map((listing) => (
          <div
            key={listing.id}
            ref={(el) => {
              cardRefs.current[listing.id] = el
            }}
            onMouseEnter={() => setHoveredId(listing.id)}
            onMouseLeave={() => setHoveredId(null)}
            className={[
              'rounded-card transition-all duration-150',
              hoveredId === listing.id ? 'ring-2 ring-primary-400 ring-offset-1' : '',
            ].join(' ')}
          >
            <ListingCard listing={listing} variant="vertical" />
          </div>
        ))}
      </div>
    )

  const pagination = totalPages > 1 ? (
    <div className="flex items-center justify-center gap-2 mt-8 mb-4">
      <button
        onClick={() => goToPage(page - 1)}
        disabled={page <= 1}
        className="flex items-center gap-1 px-3 py-2 text-sm font-medium rounded-button border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        <ChevronLeft className="w-4 h-4" />
        Prev
      </button>
      {Array.from({ length: totalPages }, (_, i) => i + 1)
        .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
        .reduce<(number | 'ellipsis')[]>((acc, p, i, arr) => {
          if (i > 0 && p - (arr[i - 1] as number) > 1) acc.push('ellipsis')
          acc.push(p)
          return acc
        }, [])
        .map((item, i) =>
          item === 'ellipsis' ? (
            <span key={`e${i}`} className="px-1 text-gray-400">…</span>
          ) : (
            <button
              key={item}
              onClick={() => goToPage(item as number)}
              className={[
                'w-9 h-9 text-sm font-medium rounded-button transition-colors',
                item === page
                  ? 'bg-primary-600 text-white'
                  : 'border border-gray-200 bg-white hover:bg-gray-50 text-gray-700',
              ].join(' ')}
            >
              {item}
            </button>
          ),
        )}
      <button
        onClick={() => goToPage(page + 1)}
        disabled={page >= totalPages}
        className="flex items-center gap-1 px-3 py-2 text-sm font-medium rounded-button border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        Next
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  ) : null

  return (
    <>
      {/* ── Desktop split panel ──────────────────────────────────── */}
      <div className="hidden md:flex h-[calc(100vh-4rem)] overflow-hidden">
        {/* Left: scrollable cards */}
        <div
          style={{
            width: showMap ? '55%' : '100%',
            transition: 'width 300ms ease-in-out',
          }}
          className="py-6 px-6 lg:px-10 min-w-0 overflow-y-auto"
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
          {pagination}
        </div>

        {/* Right: sticky map */}
        <div
          style={{
            width: showMap ? '45%' : '0%',
            flexShrink: 0,
            overflow: 'hidden',
            transition: 'width 300ms ease-in-out',
          }}
          className="h-full p-3"
        >
          <div className="w-full h-full rounded-xl overflow-hidden">
            {MapPanel({})}
          </div>
        </div>
      </div>

      {/* ── Mobile: cards + floating map button ─────────────────── */}
      <div className="md:hidden px-4 py-6 pb-24">
        <ListingsFilters params={params} total={total} />
        {cardList}
        {pagination}
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
          {MapPanel({ greedy: true })}
        </div>
      )}
    </>
  )
}
