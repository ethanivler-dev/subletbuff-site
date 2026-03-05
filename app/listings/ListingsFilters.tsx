'use client'

import { useState, useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { ROOM_TYPES, NEIGHBORHOODS } from '@/lib/constants'

const PRICE_MIN = 0
const PRICE_MAX = 3000
const PRICE_STEP = 50

interface SearchParams {
  q?: string
  price_min?: string
  price_max?: string
  room_type?: string
  filter?: string
  sort?: string
  min_stay?: string
  neighborhood?: string
  date_from?: string
  date_to?: string
  furnished?: string
  intern_friendly?: string
  parking?: string
}

interface ListingsFiltersProps {
  params: SearchParams
  total: number
}

export function ListingsFilters({ params }: ListingsFiltersProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [showMore, setShowMore] = useState(false)
  const [priceRange, setPriceRange] = useState<[number, number]>([
    params.price_min ? parseInt(params.price_min) : PRICE_MIN,
    params.price_max ? parseInt(params.price_max) : PRICE_MAX,
  ])
  const priceDebounce = useRef<ReturnType<typeof setTimeout> | null>(null)

  function update(key: string, value: string | null) {
    const sp = new URLSearchParams()
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined) sp.set(k, v)
    }
    if (value) sp.set(key, value)
    else sp.delete(key)
    router.push(`${pathname}?${sp.toString()}`)
  }

  function updatePrice(newMin: number, newMax: number) {
    setPriceRange([newMin, newMax])
    if (priceDebounce.current) clearTimeout(priceDebounce.current)
    priceDebounce.current = setTimeout(() => {
      const sp = new URLSearchParams()
      for (const [k, v] of Object.entries(params)) {
        if (v !== undefined) sp.set(k, v)
      }
      if (newMin > PRICE_MIN) sp.set('price_min', String(newMin))
      else sp.delete('price_min')
      if (newMax < PRICE_MAX) sp.set('price_max', String(newMax))
      else sp.delete('price_max')
      router.push(`${pathname}?${sp.toString()}`)
    }, 300)
  }

  const priceLabel =
    priceRange[0] === PRICE_MIN && priceRange[1] === PRICE_MAX
      ? '(any)'
      : `$${priceRange[0].toLocaleString()} – ${priceRange[1] >= PRICE_MAX ? '$3k+' : '$' + priceRange[1].toLocaleString()}`

  return (
    <div className="flex flex-col gap-3">
      {/* Row 1: Primary filters */}
      <div className="flex flex-wrap gap-2 items-end">
        {/* Neighborhood */}
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-500">Neighborhood</label>
          <select
            value={params.neighborhood ?? ''}
            onChange={(e) => update('neighborhood', e.target.value || null)}
            className="text-sm border border-gray-200 rounded-button px-3 py-2 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">All Neighborhoods</option>
            {NEIGHBORHOODS.map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>

        {/* Room type */}
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-500">Room Type</label>
          <select
            value={params.room_type ?? ''}
            onChange={(e) => update('room_type', e.target.value || null)}
            className="text-sm border border-gray-200 rounded-button px-3 py-2 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">All Types</option>
            {ROOM_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>

        {/* Date range */}
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-500">Move-in From</label>
          <input
            type="date"
            value={params.date_from ?? ''}
            onChange={(e) => update('date_from', e.target.value || null)}
            className="text-sm border border-gray-200 rounded-button px-3 py-2 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-gray-500">Move-out By</label>
          <input
            type="date"
            value={params.date_to ?? ''}
            onChange={(e) => update('date_to', e.target.value || null)}
            className="text-sm border border-gray-200 rounded-button px-3 py-2 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        {/* Price slider */}
        <div className="flex flex-col gap-1 min-w-[160px]">
          <label className="text-xs text-gray-500">Price {priceLabel}</label>
          <DualRangeSlider
            min={PRICE_MIN}
            max={PRICE_MAX}
            step={PRICE_STEP}
            valueMin={priceRange[0]}
            valueMax={priceRange[1]}
            onChange={updatePrice}
          />
        </div>
      </div>

      {/* Row 2: Secondary controls */}
      <div className="flex flex-wrap gap-2 items-center">
        {/* More Filters toggle */}
        <button
          onClick={() => setShowMore((v) => !v)}
          className={[
            'flex items-center gap-1.5 px-3 py-2 text-sm rounded-button border transition-colors',
            showMore
              ? 'bg-primary-50 border-primary-400 text-primary-700'
              : 'bg-white border-gray-200 text-gray-700 hover:border-gray-400',
          ].join(' ')}
        >
          More Filters
          {showMore ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>

        {/* Min stay */}
        <select
          value={params.min_stay ?? ''}
          onChange={(e) => update('min_stay', e.target.value || null)}
          className="text-sm border border-gray-200 rounded-button px-3 py-2 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="">Any Stay Length</option>
          <option value="1m">1 month max</option>
          <option value="2m">2 months max</option>
          <option value="3m">3 months max</option>
          <option value="4m">4 months max</option>
        </select>

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

      </div>

      {/* More Filters collapsible */}
      {showMore && (
        <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100">
          <CheckPill
            label="Furnished"
            active={params.furnished === 'true'}
            onClick={() => update('furnished', params.furnished === 'true' ? null : 'true')}
          />
          <CheckPill
            label="Pet Friendly"
            active={params.filter === 'pets'}
            onClick={() => update('filter', params.filter === 'pets' ? null : 'pets')}
          />
          <CheckPill
            label="Utilities Included"
            active={params.filter === 'utilities_included'}
            onClick={() => update('filter', params.filter === 'utilities_included' ? null : 'utilities_included')}
          />
          <CheckPill
            label="Near Campus"
            active={params.filter === 'near_campus'}
            onClick={() => update('filter', params.filter === 'near_campus' ? null : 'near_campus')}
          />
          <CheckPill
            label="Intern-Friendly"
            active={params.intern_friendly === 'true'}
            onClick={() => update('intern_friendly', params.intern_friendly === 'true' ? null : 'true')}
          />
          <CheckPill
            label="Parking"
            active={params.parking === 'true'}
            onClick={() => update('parking', params.parking === 'true' ? null : 'true')}
          />
        </div>
      )}
    </div>
  )
}

function CheckPill({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={[
        'px-3 py-1.5 text-sm rounded-full border transition-colors',
        active
          ? 'bg-primary-600 border-primary-600 text-white'
          : 'bg-white border-gray-200 text-gray-700 hover:border-primary-400',
      ].join(' ')}
    >
      {label}
    </button>
  )
}

function DualRangeSlider({
  min, max, step, valueMin, valueMax, onChange,
}: {
  min: number; max: number; step: number
  valueMin: number; valueMax: number
  onChange: (min: number, max: number) => void
}) {
  const pct = (v: number) => ((v - min) / (max - min)) * 100
  const trackBg = `linear-gradient(to right, #e5e7eb ${pct(valueMin)}%, #2563eb ${pct(valueMin)}%, #2563eb ${pct(valueMax)}%, #e5e7eb ${pct(valueMax)}%)`

  return (
    <div className="relative h-5">
      <div
        className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-1.5 rounded-full pointer-events-none"
        style={{ background: trackBg }}
      />
      <input
        type="range"
        min={min} max={max} step={step}
        value={valueMin}
        onChange={(e) => {
          const v = Math.min(+e.target.value, valueMax - step)
          onChange(v, valueMax)
        }}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        style={{ zIndex: valueMin > max - step * 10 ? 5 : 3 }}
      />
      <input
        type="range"
        min={min} max={max} step={step}
        value={valueMax}
        onChange={(e) => {
          const v = Math.max(+e.target.value, valueMin + step)
          onChange(valueMin, v)
        }}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        style={{ zIndex: 4 }}
      />
    </div>
  )
}
