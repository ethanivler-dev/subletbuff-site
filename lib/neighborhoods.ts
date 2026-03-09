/**
 * Boulder neighborhood mapping.
 * Primary detection uses Google Maps Geocoding API (reverse geocode).
 * Fallback uses nearest-center distance calculation.
 */

/** Map any Google-returned neighborhood name to one of our 9 canonical neighborhoods. */
const GOOGLE_TO_CANONICAL: Record<string, string> = {
  // Direct matches
  'The Hill': 'The Hill',
  'University Hill': 'University Hill',
  'Goss-Grove': 'Goss-Grove',
  'Goss Grove': 'Goss-Grove',
  'Baseline Sub': 'Baseline Sub',
  'Baseline': 'Baseline Sub',
  'Chautauqua': 'Chautauqua',
  'South Chautauqua': 'Chautauqua',
  'Lower Chautauqua': 'Chautauqua',
  'Upper Chautauqua': 'Chautauqua',
  'Martin Acres': 'Martin Acres',
  'Martin Park': 'Martin Acres',
  'North Boulder': 'North Boulder',
  'Newlands': 'North Boulder',
  'Holiday': 'North Boulder',
  'South Boulder': 'South Boulder',
  'Table Mesa': 'South Boulder',
  'Tantra Park': 'South Boulder',
  'East Boulder': 'East Boulder',
  'Gunbarrel': 'East Boulder',
  // Remapped neighborhoods
  'Whittier': 'North Boulder',
  'Mapleton Hill': 'North Boulder',
  'Downtown Boulder': 'Goss-Grove',
  'Pearl Street': 'Goss-Grove',
  'West Boulder': 'Chautauqua',
  'Flatirons': 'Chautauqua',
  'Near CU Campus': 'The Hill',
  'CU Boulder': 'The Hill',
  'University of Colorado': 'The Hill',
}

/** Resolve a raw Google neighborhood name to a canonical one. Returns empty string if no match. */
export function resolveGoogleNeighborhood(raw: string): string {
  if (GOOGLE_TO_CANONICAL[raw]) return GOOGLE_TO_CANONICAL[raw]
  // Try case-insensitive match
  const lower = raw.toLowerCase()
  for (const [key, value] of Object.entries(GOOGLE_TO_CANONICAL)) {
    if (key.toLowerCase() === lower) return value
  }
  return ''
}

/** Neighborhood centers for nearest-center fallback. */
const CENTERS: { name: string; lat: number; lng: number }[] = [
  { name: 'University Hill', lat: 40.000, lng: -105.283 },
  { name: 'The Hill', lat: 40.001, lng: -105.271 },
  { name: 'Goss-Grove', lat: 40.015, lng: -105.268 },
  { name: 'Baseline Sub', lat: 40.005, lng: -105.250 },
  { name: 'Chautauqua', lat: 39.999, lng: -105.290 },
  { name: 'Martin Acres', lat: 39.987, lng: -105.263 },
  { name: 'North Boulder', lat: 40.035, lng: -105.275 },
  { name: 'South Boulder', lat: 39.975, lng: -105.265 },
  { name: 'East Boulder', lat: 40.030, lng: -105.220 },
]

/** Find the nearest canonical neighborhood by distance to center. */
export function nearestNeighborhood(lat: number, lng: number): string {
  const cosLat = Math.cos(((lat + 40.0) / 2) * (Math.PI / 180))
  let best = CENTERS[0]
  let bestDist = Infinity
  for (const c of CENTERS) {
    const dLat = lat - c.lat
    const dLng = (lng - c.lng) * cosLat
    const d = dLat * dLat + dLng * dLng
    if (d < bestDist) {
      bestDist = d
      best = c
    }
  }
  return best.name
}
