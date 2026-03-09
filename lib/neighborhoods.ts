/**
 * Boulder neighborhood detection using Google Maps client-side Geocoder.
 * Maps Google's neighborhood names to our 9 canonical neighborhoods.
 * Falls back to nearest-center distance if Google returns no neighborhood.
 */

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
  'Majestic Heights': 'Martin Acres',
  'Moorhead': 'Martin Acres',
  'North Boulder': 'North Boulder',
  'Newlands': 'North Boulder',
  'Holiday': 'North Boulder',
  'Palo Park': 'North Boulder',
  'South Boulder': 'South Boulder',
  'Table Mesa': 'South Boulder',
  'Tantra Park': 'South Boulder',
  "Devil's Thumb": 'South Boulder',
  'East Boulder': 'East Boulder',
  'Gunbarrel': 'East Boulder',
  'Frasier Meadows': 'East Boulder',
  // Remapped neighborhoods
  'Whittier': 'North Boulder',
  'Mapleton Hill': 'North Boulder',
  'Downtown Boulder': 'Goss-Grove',
  'Central Boulder': 'Goss-Grove',
  'Pearl Street': 'Goss-Grove',
  'West Boulder': 'Chautauqua',
  'Flatirons': 'Chautauqua',
  'Near CU Campus': 'The Hill',
  'CU Boulder': 'The Hill',
  'University of Colorado': 'The Hill',
}

const CENTERS = [
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

function nearestCenter(lat: number, lng: number): string {
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

/** Resolve a raw Google neighborhood name to one of our 9 canonical names. */
export function resolveGoogleNeighborhood(raw: string): string {
  if (GOOGLE_TO_CANONICAL[raw]) return GOOGLE_TO_CANONICAL[raw]
  // Case-insensitive fallback
  const lower = raw.toLowerCase()
  for (const [key, value] of Object.entries(GOOGLE_TO_CANONICAL)) {
    if (key.toLowerCase() === lower) return value
  }
  return ''
}

/**
 * Detect neighborhood using Google Maps client-side Geocoder (reverse geocode).
 * Requires google.maps to be loaded. Falls back to nearest-center.
 */
export async function detectNeighborhoodFromCoords(lat: number, lng: number): Promise<string> {
  // Try client-side reverse geocoding (uses Maps JS API, no separate Geocoding API needed)
  if (typeof google !== 'undefined' && google.maps?.Geocoder) {
    try {
      const geocoder = new google.maps.Geocoder()
      const response = await geocoder.geocode({ location: { lat, lng } })
      const neighborhoodTypes = ['neighborhood', 'sublocality_level_2', 'sublocality_level_1', 'sublocality']

      for (const result of response.results) {
        for (const type of neighborhoodTypes) {
          const comp = result.address_components.find(
            (c: google.maps.GeocoderAddressComponent) => c.types.includes(type)
          )
          if (comp) {
            const mapped = resolveGoogleNeighborhood(comp.long_name)
            if (mapped) return mapped
          }
        }
      }
    } catch (err) {
      console.warn('[Neighborhoods] Reverse geocode failed:', err)
    }
  }

  // Fallback: nearest center point
  return nearestCenter(lat, lng)
}
