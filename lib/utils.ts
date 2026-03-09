/** Format cents OR dollars to "$X,XXX/mo" — accepts either */
export function formatRent(amount: number): string {
  // If value looks like cents (>10000), convert; otherwise treat as dollars
  const dollars = amount > 10000 ? Math.round(amount / 100) : amount
  return `$${dollars.toLocaleString('en-US')}/mo`
}

/** Format cents OR dollars to "$X,XXX" (no suffix) */
export function formatPrice(amount: number): string {
  const dollars = amount > 10000 ? Math.round(amount / 100) : amount
  return `$${dollars.toLocaleString('en-US')}`
}

/** Format a date string like "2026-06-01" → "Jun 1" */
export function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

/** Format a date range → "Jun 1 – Aug 15" */
export function formatDateRange(from: string, to: string): string {
  return `${formatDate(from)} – ${formatDate(to)}`
}

/** Format room type enum → human label */
export function formatRoomType(type: string): string {
  const map: Record<string, string> = {
    private_room: 'Private Room',
    shared_room: 'Shared Room',
    full_apartment: 'Full Apartment',
    studio: 'Studio',
    house: 'House',
  }
  return map[type] ?? type
}

/**
 * If a title looks like a raw street address (e.g. "1234 Pearl St"),
 * replace it with a friendly label built from room_type + neighborhood.
 * This prevents exact addresses from leaking onto public listing cards.
 */
export function sanitizeListingTitle(
  title: string | null | undefined,
  roomType: string,
  neighborhood: string,
): string {
  const t = (title ?? '').trim()
  const label = formatRoomType(roomType)
  const hood = neighborhood || 'Boulder'

  if (!t) return `${label} in ${hood}`

  // Heuristic: starts with digits followed by a space → likely a street address
  const addressMatch = t.match(/^\d+\s+(.+)/)
  if (addressMatch) {
    // Extract street name, strip unit/apt suffixes for a friendlier title
    const street = addressMatch[1]
      .replace(/[,#].*/,'')                       // drop everything after comma or #
      .replace(/\b(apt|unit|suite|ste|fl)\b.*/i, '') // drop unit identifiers
      .replace(/\b(boulder|co|colorado)\b.*/i, '')   // drop city/state
      .trim()
    if (street) return `${label} on ${street}`
    return `${label} in ${hood}`
  }

  return t
}

/** CU Boulder campus center (Norlin Library area) */
const CU_LAT = 40.0076
const CU_LNG = -105.2659

/** Haversine distance in miles */
function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 3959 // Earth radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(a))
}

/**
 * Estimate walking time from CU Boulder campus.
 * Returns a string like "5 min" or "25 min", or null if too far (>5 mi) or no coords.
 * Uses ~3 mph walking speed with 1.3x detour factor for streets.
 */
export function walkingTimeToCU(lat?: number | null, lng?: number | null): string | null {
  if (lat == null || lng == null) return null
  const miles = haversine(lat, lng, CU_LAT, CU_LNG) * 1.3 // street detour factor
  if (miles > 5) return null
  const minutes = Math.round(miles * 20) // 20 min/mile
  if (minutes < 1) return '1 min'
  return `${minutes} min`
}

/** Clamp string to max length with ellipsis */
export function truncate(str: string, max: number): string {
  return str.length > max ? str.slice(0, max - 1) + '…' : str
}

/** Human-friendly relative timestamp: "2m ago", "1h ago", "Yesterday", "Mar 5" */
export function timeAgo(dateStr: string): string {
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diffMs = now - then
  const diffMin = Math.floor(diffMs / 60000)
  const diffHr = Math.floor(diffMs / 3600000)
  const diffDay = Math.floor(diffMs / 86400000)

  if (diffMin < 1) return 'just now'
  if (diffMin < 60) return `${diffMin}m ago`
  if (diffHr < 24) return `${diffHr}h ago`
  if (diffDay === 1) return 'Yesterday'
  if (diffDay < 7) return `${diffDay}d ago`

  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}
