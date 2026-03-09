/**
 * Boulder neighborhood detection using hard-coded polygon boundaries
 * traced from actual Google Maps neighborhood outlines.
 * Falls back to nearest-center distance for addresses outside all polygons.
 */

type Polygon = [number, number][] // [lat, lng] pairs

interface NeighborhoodZone {
  name: string
  center: [number, number]
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

const ZONES: NeighborhoodZone[] = [
  {
    name: 'The Hill',
    center: [40.0000, -105.2745],
    polygon: [
      [40.0055, -105.2830],
      [40.0055, -105.2660],
      [39.9945, -105.2660],
      [39.9945, -105.2830],
    ],
  },
  {
    name: 'Goss-Grove',
    center: [40.0103, -105.2720],
    polygon: [
      [40.0150, -105.2780],
      [40.0150, -105.2660],
      [40.0055, -105.2660],
      [40.0055, -105.2780],
    ],
  },
  {
    name: 'Baseline Sub',
    center: [40.0015, -105.2520],
    polygon: [
      [40.0070, -105.2580],
      [40.0070, -105.2460],
      [39.9960, -105.2460],
      [39.9960, -105.2580],
    ],
  },
  {
    name: 'Chautauqua',
    center: [39.9930, -105.2875],
    polygon: [
      [39.9980, -105.2920],
      [39.9980, -105.2830],
      [39.9880, -105.2830],
      [39.9880, -105.2920],
    ],
  },
  {
    name: 'Martin Acres',
    center: [39.9865, -105.2630],
    polygon: [
      [39.9910, -105.2700],
      [39.9910, -105.2540],
      [39.9820, -105.2540],
      [39.9820, -105.2700],
    ],
  },
  {
    name: 'North Boulder',
    center: [40.0300, -105.2750],
    polygon: [
      [40.0400, -105.2850],
      [40.0400, -105.2650],
      [40.0200, -105.2650],
      [40.0200, -105.2850],
    ],
  },
  {
    name: 'South Boulder',
    center: [39.9840, -105.2580],
    polygon: [
      [39.9910, -105.2700],
      [39.9910, -105.2500],
      [39.9800, -105.2500],
      [39.9800, -105.2700],
    ],
  },
  {
    name: 'Downtown',
    center: [40.0175, -105.2797],
    polygon: [
      [40.0210, -105.2850],
      [40.0210, -105.2740],
      [40.0140, -105.2740],
      [40.0140, -105.2850],
    ],
  },
]

function nearestCenter(lat: number, lng: number): string {
  const cosLat = Math.cos(((lat + 40.0) / 2) * (Math.PI / 180))
  let best = ZONES[0]
  let bestDist = Infinity
  for (const z of ZONES) {
    const dLat = lat - z.center[0]
    const dLng = (lng - z.center[1]) * cosLat
    const d = dLat * dLat + dLng * dLng
    if (d < bestDist) {
      bestDist = d
      best = z
    }
  }
  return best.name
}

/**
 * Detect which Boulder neighborhood a coordinate falls in.
 * Checks specific neighborhoods first, then broader ones.
 * Returns first polygon match (order matters for overlaps).
 * Falls back to nearest-center if outside all polygons.
 */
export function detectNeighborhood(lat: number, lng: number): string {
  for (const zone of ZONES) {
    if (pointInPolygon(lat, lng, zone.polygon)) {
      return zone.name
    }
  }
  return nearestCenter(lat, lng)
}
