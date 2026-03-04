'use client'

import { useRouter, usePathname } from 'next/navigation'
import { ROOM_TYPES, QUICK_FILTERS } from '@/lib/constants'

interface ListingsFiltersProps {
  params: {
    q?: string
    price_min?: string
    price_max?: string
    room_type?: string
    filter?: string
    sort?: string
  }
  total: number
}

export function ListingsFilters({ params }: ListingsFiltersProps) {
  const router = useRouter()
  const pathname = usePathname()

  function update(key: string, value: string | null) {
    const sp = new URLSearchParams(params as Record<string, string>)
    if (value) sp.set(key, value)
    else sp.delete(key)
    router.push(`${pathname}?${sp.toString()}`)
  }

  function clearAll() {
    router.push(pathname)
  }

  const hasFilters = !!(params.price_min || params.price_max || params.room_type || params.filter)

  return (
    <div className="flex flex-wrap gap-3 items-center">
      {/* Room type */}
      <select
        value={params.room_type ?? ''}
        onChange={(e) => update('room_type', e.target.value || null)}
        className="text-sm border border-gray-200 rounded-button px-3 py-2 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
      >
        <option value="">All Room Types</option>
        {ROOM_TYPES.map((t) => (
          <option key={t.value} value={t.value}>{t.label}</option>
        ))}
      </select>

      {/* Price max */}
      <select
        value={params.price_max ?? ''}
        onChange={(e) => update('price_max', e.target.value || null)}
        className="text-sm border border-gray-200 rounded-button px-3 py-2 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
      >
        <option value="">Any Price</option>
        <option value="800">Under $800</option>
        <option value="1000">Under $1,000</option>
        <option value="1200">Under $1,200</option>
        <option value="1500">Under $1,500</option>
        <option value="2000">Under $2,000</option>
      </select>

      {/* Quick filter pills */}
      {QUICK_FILTERS.map(({ label, param }) => (
        <button
          key={param}
          onClick={() => update('filter', params.filter === param ? null : param)}
          className={[
            'px-3 py-1.5 text-sm rounded-full border transition-colors',
            params.filter === param
              ? 'bg-primary-600 border-primary-600 text-white'
              : 'bg-white border-gray-200 text-gray-700 hover:border-primary-400',
          ].join(' ')}
        >
          {label}
        </button>
      ))}

      {/* Sort */}
      <select
        value={params.sort ?? 'newest'}
        onChange={(e) => update('sort', e.target.value)}
        className="text-sm border border-gray-200 rounded-button px-3 py-2 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500 ml-auto"
      >
        <option value="newest">Newest First</option>
        <option value="price_asc">Price: Low → High</option>
        <option value="price_desc">Price: High → Low</option>
        <option value="soonest">Soonest Available</option>
      </select>

      {hasFilters && (
        <button
          onClick={clearAll}
          className="text-sm text-gray-500 hover:text-gray-700 underline"
        >
          Clear filters
        </button>
      )}
    </div>
  )
}
