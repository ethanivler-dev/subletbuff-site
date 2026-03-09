/**
 * Boulder neighborhood polygon detection using lat/lng coordinates.
 * Polygons are ordered from most specific to least specific (catch-all areas last).
 */

type Polygon = [number, number][] // [lat, lng] pairs

interface NeighborhoodZone {
  name: string
  polygon: Polygon
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

// Key Boulder reference coordinates:
// Broadway: ~-105.283
// 28th St: ~-105.251
// Baseline Rd: ~40.000
// University Ave: ~40.003
// Arapahoe Ave: ~40.007
// Canyon Blvd: ~40.017
// Pearl St: ~40.019
// Walnut St: ~40.020
// Mapleton Ave: ~40.023
// Table Mesa Dr: ~39.990
// College Ave: ~40.003 lat, runs N-S near -105.273

const ZONES: NeighborhoodZone[] = [
  // --- Most specific first ---

  {
    // The Hill: College Ave area, Broadway to 28th, University to ~Pennsylvania
    name: 'The Hill',
    polygon: [
      [40.010, -105.283], // NW: Broadway & just north of University
      [40.010, -105.251], // NE: 28th & north of University
      [40.000, -105.251], // SE: 28th & Baseline
      [40.000, -105.283], // SW: Broadway & Baseline
    ],
  },
  {
    // University Hill: south of Baseline, east of Broadway, to ~Table Mesa
    name: 'University Hill',
    polygon: [
      [40.000, -105.283], // NW: Broadway & Baseline
      [40.000, -105.251], // NE: 28th & Baseline
      [39.993, -105.251], // SE: 28th & south of Baseline
      [39.993, -105.283], // SW: Broadway & south of Baseline
    ],
  },
  {
    // Goss-Grove: Arapahoe to Canyon, Broadway to 28th
    name: 'Goss-Grove',
    polygon: [
      [40.017, -105.283], // NW: Broadway & Canyon
      [40.017, -105.251], // NE: 28th & Canyon
      [40.010, -105.251], // SE: 28th & Arapahoe (approx)
      [40.010, -105.283], // SW: Broadway & Arapahoe
    ],
  },
  {
    // Near CU Campus: campus proper
    name: 'Near CU Campus',
    polygon: [
      [40.012, -105.272], // NW
      [40.012, -105.255], // NE
      [40.002, -105.255], // SE
      [40.002, -105.272], // SW
    ],
  },
  {
    // Downtown Boulder: Pearl St area, 9th to 20th, Walnut to Canyon
    name: 'Downtown Boulder',
    polygon: [
      [40.022, -105.290], // NW: 9th & Walnut
      [40.022, -105.265], // NE: 20th & Walnut
      [40.017, -105.265], // SE: 20th & Canyon
      [40.017, -105.290], // SW: 9th & Canyon
    ],
  },
  {
    // Chautauqua: west of Broadway, south of Baseline, near Flatirons
    name: 'Chautauqua',
    polygon: [
      [40.002, -105.300], // NW
      [40.002, -105.283], // NE: Broadway
      [39.990, -105.283], // SE: Broadway & Table Mesa
      [39.990, -105.300], // SW
    ],
  },
  {
    // Martin Acres: south of Table Mesa, east of Broadway, west of US-36
    name: 'Martin Acres',
    polygon: [
      [39.990, -105.270], // NW
      [39.990, -105.245], // NE
      [39.980, -105.245], // SE
      [39.980, -105.270], // SW
    ],
  },
  {
    // Table Mesa: around Table Mesa Dr, between Broadway and US-36
    name: 'Table Mesa',
    polygon: [
      [39.993, -105.283], // NW: Broadway
      [39.993, -105.245], // NE
      [39.990, -105.245], // SE
      [39.990, -105.283], // SW: Broadway
    ],
  },
  {
    // Mapleton Hill: between Mapleton and Canyon, west of Broadway
    name: 'Mapleton Hill',
    polygon: [
      [40.027, -105.310], // NW
      [40.027, -105.283], // NE: Broadway
      [40.017, -105.283], // SE: Broadway & Canyon
      [40.017, -105.310], // SW
    ],
  },
  {
    // Whittier: east of Broadway, north of Canyon, south of Mapleton
    name: 'Whittier',
    polygon: [
      [40.027, -105.283], // NW: Broadway & Mapleton
      [40.027, -105.265], // NE
      [40.017, -105.265], // SE: Canyon
      [40.017, -105.283], // SW: Broadway & Canyon
    ],
  },
  {
    // Baseline Sub: along 28th between Arapahoe and Baseline
    name: 'Baseline',
    polygon: [
      [40.010, -105.251], // NW: 28th & Arapahoe
      [40.010, -105.235], // NE
      [40.000, -105.235], // SE
      [40.000, -105.251], // SW: 28th & Baseline
    ],
  },
  {
    // Gunbarrel: east Boulder, near Diagonal Hwy
    name: 'Gunbarrel',
    polygon: [
      [40.070, -105.210], // NW
      [40.070, -105.160], // NE
      [40.040, -105.160], // SE
      [40.040, -105.210], // SW
    ],
  },

  // --- Broader catch-all areas last ---

  {
    // North Boulder: north of Mapleton Ave
    name: 'North Boulder',
    polygon: [
      [40.070, -105.310], // NW
      [40.070, -105.240], // NE
      [40.027, -105.240], // SE
      [40.027, -105.310], // SW
    ],
  },
  {
    // South Boulder / Table Mesa: south of Table Mesa Dr
    name: 'South Boulder',
    polygon: [
      [39.990, -105.300], // NW
      [39.990, -105.230], // NE
      [39.965, -105.230], // SE
      [39.965, -105.300], // SW
    ],
  },
  {
    // East Boulder: east of 28th St, south of Arapahoe
    name: 'East Boulder',
    polygon: [
      [40.010, -105.251], // NW: 28th & Arapahoe
      [40.010, -105.210], // NE
      [39.980, -105.210], // SE
      [39.980, -105.251], // SW
    ],
  },
  {
    // West Boulder: west of Broadway (catch-all)
    name: 'West Boulder',
    polygon: [
      [40.030, -105.340], // NW
      [40.030, -105.283], // NE: Broadway
      [39.990, -105.283], // SE: Broadway
      [39.990, -105.340], // SW
    ],
  },
]

/**
 * Detect which Boulder neighborhood a coordinate falls in.
 * Returns the canonical neighborhood name, or null if no match.
 */
export function detectNeighborhood(lat: number, lng: number): string | null {
  for (const zone of ZONES) {
    if (pointInPolygon(lat, lng, zone.polygon)) {
      return zone.name
    }
  }
  return null
}
