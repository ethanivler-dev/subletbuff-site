/**
 * Boulder neighborhood polygon detection using lat/lng coordinates.
 * Only returns one of the 9 canonical neighborhoods used on the site.
 * If no polygon matches, falls back to the nearest neighborhood center.
 */

type Polygon = [number, number][] // [lat, lng] pairs

interface NeighborhoodZone {
  name: string
  polygon: Polygon
  center: [number, number] // [lat, lng] for nearest-center fallback
}

/** Ray-casting point-in-polygon test. */
function pointInPolygon(lat: number, lng: number, polygon: Polygon): boolean {
  let inside = false
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [yi, xi] = polygon[i]
    const [yj, xj] = polygon[j]
    if ((yi > lat) !== (yj > lat) && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) {
      inside = !inside
    }
  }
  return inside
}

/** Haversine-ish distance squared (good enough for nearest-center). */
function distSq(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const dLat = lat1 - lat2
  const dLng = (lng1 - lng2) * Math.cos(((lat1 + lat2) / 2) * (Math.PI / 180))
  return dLat * dLat + dLng * dLng
}

// Reference coordinates:
// Broadway: ~-105.2830 lng
// 17th St: ~-105.2730 lng
// 28th St: ~-105.2500 lng
// Baseline Rd: ~39.9950 lat
// University Ave: ~40.0030 lat
// Arapahoe Ave: ~40.0120 lat
// Canyon Blvd: ~40.0180 lat
// Mapleton Ave: ~40.0230 lat
// Table Mesa Dr: ~39.9900 lat

const ZONES: NeighborhoodZone[] = [
  // --- Specific neighborhoods first ---

  {
    // University Hill: along Broadway corridor, University Ave down to south of Baseline
    // 1505 Broadway (40.0010, -105.2830) should land here
    // Narrow east-west band right along Broadway — does NOT extend far west (that's Chautauqua)
    name: 'University Hill',
    center: [40.000, -105.283],
    polygon: [
      [40.005, -105.288], // NW: just west of Broadway
      [40.005, -105.278], // NE: east of Broadway
      [39.990, -105.278], // SE
      [39.990, -105.288], // SW
    ],
  },
  {
    // The Hill: east of Broadway, student area around College Ave
    // Broadway to ~17th St, Baseline to Pennsylvania
    name: 'The Hill',
    center: [40.001, -105.271],
    polygon: [
      [40.010, -105.278], // NW: at Broadway
      [40.010, -105.260], // NE: east of 17th
      [39.990, -105.260], // SE
      [39.990, -105.278], // SW: at Broadway
    ],
  },
  {
    // Goss-Grove: east of Broadway, Arapahoe to Canyon
    // Does NOT extend west of Broadway
    name: 'Goss-Grove',
    center: [40.015, -105.268],
    polygon: [
      [40.020, -105.278], // NW: at Broadway
      [40.020, -105.248], // NE: east of 28th
      [40.010, -105.248], // SE: at Arapahoe
      [40.010, -105.278], // SW: at Broadway
    ],
  },
  {
    // Baseline Sub: 28th St / Foothills corridor, Arapahoe down to Baseline
    // 1100 28th St (40.0088, -105.2535) should land here
    name: 'Baseline Sub',
    center: [40.005, -105.250],
    polygon: [
      [40.014, -105.260], // NW: west of 28th, at Arapahoe
      [40.014, -105.235], // NE: east of Foothills
      [39.990, -105.235], // SE: below Baseline
      [39.990, -105.260], // SW: west of 28th
    ],
  },
  {
    // Chautauqua: west of Broadway, south of Baseline, near Flatirons
    name: 'Chautauqua',
    center: [39.999, -105.290],
    polygon: [
      [40.005, -105.320], // NW: into the Flatirons
      [40.005, -105.278], // NE: at Broadway
      [39.985, -105.278], // SE
      [39.985, -105.320], // SW
    ],
  },
  {
    // Martin Acres: south of Table Mesa Dr, east of Broadway
    name: 'Martin Acres',
    center: [39.987, -105.263],
    polygon: [
      [39.993, -105.278], // NW
      [39.993, -105.248], // NE
      [39.978, -105.248], // SE
      [39.978, -105.278], // SW
    ],
  },

  // --- Broader catch-all areas ---

  {
    // North Boulder: everything north of Canyon/Arapahoe area
    // 2500 N Broadway (40.0320, -105.2815) should land here
    name: 'North Boulder',
    center: [40.035, -105.275],
    polygon: [
      [40.090, -105.320], // NW
      [40.090, -105.230], // NE
      [40.020, -105.230], // SE
      [40.020, -105.320], // SW
    ],
  },
  {
    // South Boulder: south of Martin Acres / Table Mesa
    name: 'South Boulder',
    center: [39.975, -105.265],
    polygon: [
      [39.990, -105.320], // NW
      [39.990, -105.230], // NE
      [39.950, -105.230], // SE
      [39.950, -105.320], // SW
    ],
  },
  {
    // East Boulder: east of 28th / Foothills Pkwy (includes Gunbarrel area)
    name: 'East Boulder',
    center: [40.030, -105.220],
    polygon: [
      [40.080, -105.248], // NW
      [40.080, -105.150], // NE
      [39.970, -105.150], // SE
      [39.970, -105.248], // SW
    ],
  },
]

/**
 * Detect which Boulder neighborhood a coordinate falls in.
 * Returns one of the 9 canonical neighborhood names.
 * Falls back to the nearest neighborhood center if no polygon matches.
 */
export function detectNeighborhood(lat: number, lng: number): string | null {
  // First try polygon match (ordered specific → broad)
  for (const zone of ZONES) {
    if (pointInPolygon(lat, lng, zone.polygon)) {
      return zone.name
    }
  }

  // Fallback: assign to nearest neighborhood center
  // Only if the point is roughly in the Boulder area
  if (lat < 39.90 || lat > 40.15 || lng < -105.40 || lng > -105.10) {
    return null
  }

  let nearest = ZONES[0]
  let bestDist = Infinity
  for (const zone of ZONES) {
    const d = distSq(lat, lng, zone.center[0], zone.center[1])
    if (d < bestDist) {
      bestDist = d
      nearest = zone
    }
  }
  return nearest.name
}
