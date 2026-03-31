/** CU Boulder campus center (Norlin Library area) */
const CU_LAT = 40.0076
const CU_LNG = -105.2659
const WALKING_API_TIMEOUT_MS = 700

/**
 * Fetch walking time from a single point to CU Boulder campus using OSRM routing.
 * Returns a string like "6 min" or null if too far or no coordinates.
 */
export async function fetchWalkingTimeToCU(
  lat: number | null | undefined,
  lng: number | null | undefined,
): Promise<string | null> {
  if (lat == null || lng == null) return null

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), WALKING_API_TIMEOUT_MS)
    const res = await fetch(
      `https://router.project-osrm.org/route/v1/foot/${lng},${lat};${CU_LNG},${CU_LAT}?overview=false`,
      { next: { revalidate: 86400 }, signal: controller.signal },
    ).finally(() => clearTimeout(timeout))
    if (!res.ok) return null
    const data = await res.json()

    if (data.code !== 'Ok' || !data.routes?.[0]) return null

    const minutes = Math.round(data.routes[0].duration / 60)
    if (minutes > 60) return null
    if (minutes < 1) return '1 min'
    return `${minutes} min`
  } catch {
    return null
  }
}

/**
 * Batch-fetch walking times from multiple points to CU Boulder campus.
 * Uses OSRM Table API for efficiency (single request for all points).
 */
export async function fetchWalkingTimesToCU(
  coords: Array<{ lat: number | null | undefined; lng: number | null | undefined }>,
): Promise<Array<string | null>> {
  if (coords.length === 0) return []

  const validEntries: Array<{ index: number; lat: number; lng: number }> = []
  coords.forEach((c, i) => {
    if (c.lat != null && c.lng != null) {
      validEntries.push({ index: i, lat: c.lat, lng: c.lng })
    }
  })

  if (validEntries.length === 0) return coords.map(() => null)

  const results: Array<string | null> = coords.map(() => null)

  // OSRM table API has a practical limit; chunk if needed
  const CHUNK_SIZE = 50
  for (let start = 0; start < validEntries.length; start += CHUNK_SIZE) {
    const chunk = validEntries.slice(start, start + CHUNK_SIZE)

    const coordStr = chunk
      .map((c) => `${c.lng},${c.lat}`)
      .concat(`${CU_LNG},${CU_LAT}`)
      .join(';')
    const sources = chunk.map((_, i) => i).join(';')
    const destIndex = chunk.length

    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), WALKING_API_TIMEOUT_MS)
      const res = await fetch(
        `https://router.project-osrm.org/table/v1/foot/${coordStr}?sources=${sources}&destinations=${destIndex}&annotations=duration`,
        { next: { revalidate: 86400 }, signal: controller.signal },
      ).finally(() => clearTimeout(timeout))
      if (!res.ok) continue
      const data = await res.json()

      if (data.code !== 'Ok' || !data.durations) continue

      data.durations.forEach((row: number[], i: number) => {
        const seconds = row[0]
        if (seconds == null) return
        const minutes = Math.round(seconds / 60)
        if (minutes > 60) return
        results[chunk[i].index] = minutes < 1 ? '1 min' : `${minutes} min`
      })
    } catch (err) {
      console.error('[walking-time] OSRM table request failed for chunk:', err)
    }
  }

  return results
}
