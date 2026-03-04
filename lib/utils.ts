/** Format cents OR dollars to "$X,XXX/mo" — accepts either */
export function formatRent(amount: number): string {
  // If value looks like cents (>10000), convert; otherwise treat as dollars
  const dollars = amount > 10000 ? Math.round(amount / 100) : amount
  return `$${dollars.toLocaleString('en-US')}/mo`
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
  }
  return map[type] ?? type
}

/** Clamp string to max length with ellipsis */
export function truncate(str: string, max: number): string {
  return str.length > max ? str.slice(0, max - 1) + '…' : str
}
