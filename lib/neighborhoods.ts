/**
 * Boulder neighborhood polygon detection using lat/lng coordinates.
 * Polygons are generous — better to detect a nearby neighborhood than fail.
 * Ordered from most specific to least specific (catch-all areas last).
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

// Verified Boulder reference coordinates:
// Broadway: ~-105.2830 lng
// 17th St: ~-105.2730 lng
// 28th St / Foothills Pkwy: ~-105.2500 lng
// Baseline Rd: ~39.9950 lat
// University Ave: ~40.0030 lat
// Arapahoe Ave: ~40.0120 lat
// Canyon Blvd: ~40.0180 lat
// Pearl St: ~40.0200 lat
// Mapleton Ave: ~40.0230 lat
// Table Mesa Dr: ~39.9900 lat
// Pennsylvania Ave: ~40.0080 lat

const ZONES: NeighborhoodZone[] = [
  // --- Most specific neighborhoods first ---

  {
    // The Hill (includes University Hill): Broadway to ~17th, Baseline to Pennsylvania
    // Center: ~40.001, -105.271. Covers the classic student/CU area.
    name: 'The Hill',
    polygon: [
      [40.010, -105.290], // NW: west of Broadway, above Pennsylvania
      [40.010, -105.260], // NE: east of 17th
      [39.992, -105.260], // SE: east, below Baseline
      [39.992, -105.290], // SW: west of Broadway, below Baseline
    ],
  },
  {
    // Goss-Grove: Broadway to 28th, Arapahoe to Canyon
    // Center: ~40.0145, -105.2700
    name: 'Goss-Grove',
    polygon: [
      [40.020, -105.290], // NW: west of Broadway, at Canyon+
      [40.020, -105.248], // NE: east of 28th
      [40.010, -105.248], // SE: east of 28th, at Arapahoe
      [40.010, -105.290], // SW: west of Broadway, at Arapahoe
    ],
  },
  {
    // Downtown Boulder: Pearl St area, ~9th to ~20th, Canyon to Spruce
    // Center: ~40.019, -105.278
    name: 'Downtown Boulder',
    polygon: [
      [40.024, -105.293], // NW: west of 9th, above Pearl
      [40.024, -105.268], // NE: east of 20th
      [40.020, -105.268], // SE
      [40.020, -105.293], // SW
    ],
  },
  {
    // Baseline Sub: 28th/Foothills area between Arapahoe and Baseline
    // Center: ~40.005, -105.253
    name: 'Baseline',
    polygon: [
      [40.014, -105.258], // NW: west of 28th, above Arapahoe
      [40.014, -105.238], // NE: east of Foothills
      [39.993, -105.238], // SE: east, below Baseline
      [39.993, -105.258], // SW: west of 28th, below Baseline
    ],
  },
  {
    // Chautauqua: west of Broadway, south of Baseline, near Flatirons
    // Center: ~39.999, -105.282
    name: 'Chautauqua',
    polygon: [
      [40.004, -105.310], // NW: into the Flatirons
      [40.004, -105.283], // NE: at Broadway
      [39.988, -105.283], // SE: Broadway south
      [39.988, -105.310], // SW
    ],
  },
  {
    // Mapleton Hill: between Mapleton and Canyon, west of Broadway
    // Center: ~40.021, -105.290
    name: 'Mapleton Hill',
    polygon: [
      [40.028, -105.310], // NW
      [40.028, -105.283], // NE: Broadway
      [40.018, -105.283], // SE: Canyon/Broadway
      [40.018, -105.310], // SW
    ],
  },
  {
    // Whittier: east of Broadway, north of Canyon, south of Mapleton
    // Center: ~40.022, -105.275
    name: 'Whittier',
    polygon: [
      [40.028, -105.283], // NW: Broadway & Mapleton
      [40.028, -105.260], // NE
      [40.020, -105.260], // SE
      [40.020, -105.283], // SW: Broadway
    ],
  },
  {
    // Martin Acres: south of Table Mesa Dr, east of Broadway, north of Moorhead
    // Center: ~39.987, -105.263
    name: 'Martin Acres',
    polygon: [
      [39.992, -105.278], // NW
      [39.992, -105.248], // NE
      [39.981, -105.248], // SE
      [39.981, -105.278], // SW
    ],
  },
  {
    // Table Mesa: along Table Mesa Dr corridor
    // Center: ~39.991, -105.258
    name: 'Table Mesa',
    polygon: [
      [39.995, -105.283], // NW: Broadway
      [39.995, -105.248], // NE
      [39.992, -105.248], // SE
      [39.992, -105.283], // SW
    ],
  },
  {
    // Gunbarrel: northeast Boulder, near Diagonal Hwy
    name: 'Gunbarrel',
    polygon: [
      [40.075, -105.215], // NW
      [40.075, -105.155], // NE
      [40.035, -105.155], // SE
      [40.035, -105.215], // SW
    ],
  },

  // --- Broader catch-all areas ---

  {
    // North Boulder: north of Mapleton Ave
    // Center: ~40.028, -105.275
    name: 'North Boulder',
    polygon: [
      [40.080, -105.315], // NW
      [40.080, -105.235], // NE
      [40.028, -105.235], // SE
      [40.028, -105.315], // SW
    ],
  },
  {
    // South Boulder: south of Table Mesa / Martin Acres area
    // Center: ~39.991, -105.258
    name: 'South Boulder',
    polygon: [
      [39.992, -105.310], // NW
      [39.992, -105.230], // NE
      [39.960, -105.230], // SE
      [39.960, -105.310], // SW
    ],
  },
  {
    // East Boulder: east of 28th / Foothills Pkwy
    // Center: ~40.005, -105.240
    name: 'East Boulder',
    polygon: [
      [40.020, -105.252], // NW
      [40.020, -105.210], // NE
      [39.975, -105.210], // SE
      [39.975, -105.252], // SW
    ],
  },
  {
    // West Boulder: west of Broadway (general catch-all for west side)
    name: 'West Boulder',
    polygon: [
      [40.035, -105.350], // NW
      [40.035, -105.283], // NE: Broadway
      [39.985, -105.283], // SE
      [39.985, -105.350], // SW
    ],
  },

  // --- Final catch-all: anywhere in greater Boulder area ---
  {
    // Greater Boulder catch-all — prevents "couldn't detect" for addresses in Boulder
    name: 'Downtown Boulder',
    polygon: [
      [40.100, -105.350], // NW
      [40.100, -105.150], // NE
      [39.950, -105.150], // SE
      [39.950, -105.350], // SW
    ],
  },
]

/**
 * Detect which Boulder neighborhood a coordinate falls in.
 * Returns the canonical neighborhood name, or null if clearly outside Boulder.
 */
export function detectNeighborhood(lat: number, lng: number): string | null {
  for (const zone of ZONES) {
    if (pointInPolygon(lat, lng, zone.polygon)) {
      return zone.name
    }
  }
  return null
}
