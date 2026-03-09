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
