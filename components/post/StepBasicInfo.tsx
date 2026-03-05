'use client'

import { useRef, useEffect, useCallback, useState } from 'react'
import { Input } from '@/components/ui/Input'
import { ROOM_TYPES } from '@/lib/constants'
import { MapPin } from 'lucide-react'

/* ------------------------------------------------------------------ */
/*  Lightweight Google Places Autocomplete hook                        */
/* ------------------------------------------------------------------ */

// Extend the Window interface for the Google Maps callback
declare global {
  interface Window {
    __gmapsCallback?: () => void
  }
}

let gmapsPromise: Promise<void> | null = null

function loadGoogleMaps(): Promise<void> {
  if (gmapsPromise) return gmapsPromise
  if (typeof google !== 'undefined' && google.maps?.places) {
    return Promise.resolve()
  }
  gmapsPromise = new Promise<void>((resolve, reject) => {
    const key = process.env.NEXT_PUBLIC_MAPS_KEY
    if (!key) { reject(new Error('Missing NEXT_PUBLIC_MAPS_KEY')); return }
    window.__gmapsCallback = () => resolve()
    const s = document.createElement('script')
    s.src = `https://maps.googleapis.com/maps/api/js?key=${key}&libraries=places&callback=__gmapsCallback`
    s.async = true
    s.onerror = () => reject(new Error('Failed to load Google Maps'))
    document.head.appendChild(s)
  })
  return gmapsPromise
}

/** Extract the best neighborhood string from place address_components. */
function extractNeighborhood(
  components: google.maps.GeocoderAddressComponent[]
): string {
  const priority = ['neighborhood', 'sublocality_level_2', 'sublocality_level_1', 'sublocality']
  for (const type of priority) {
    const match = components.find((c) => c.types.includes(type))
    if (match) return match.long_name
  }
  const locality = components.find((c) => c.types.includes('locality'))
  return locality?.long_name ?? 'Boulder'
}

export interface BasicInfoData {
  title: string
  address: string
  neighborhood: string
  room_type: string
  rent_monthly: string
  deposit: string
  available_from: string
  available_to: string
  min_stay_weeks: string
}

interface StepBasicInfoProps {
  data: BasicInfoData
  onChange: (data: BasicInfoData) => void
  errors: Partial<Record<keyof BasicInfoData, string>>
}

export function StepBasicInfo({ data, onChange, errors }: StepBasicInfoProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null)
  const dataRef = useRef(data)
  dataRef.current = data
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange
  const [mapsLoaded, setMapsLoaded] = useState(false)

  function update(field: keyof BasicInfoData, value: string) {
    onChange({ ...data, [field]: value })
  }

  // Load Google Maps script once
  useEffect(() => {
    loadGoogleMaps()
      .then(() => setMapsLoaded(true))
      .catch((err) => console.warn('Google Maps not available:', err.message))
  }, [])

  // Attach autocomplete when script + input are ready
  const attachAutocomplete = useCallback(() => {
    if (!mapsLoaded || !inputRef.current || autocompleteRef.current) return

    const ac = new google.maps.places.Autocomplete(inputRef.current, {
      types: ['address'],
      componentRestrictions: { country: 'us' },
      fields: ['formatted_address', 'address_components', 'geometry'],
    })

    // Bias toward Boulder
    ac.setBounds(new google.maps.LatLngBounds(
      { lat: 39.95, lng: -105.35 },
      { lat: 40.10, lng: -105.17 },
    ))

    ac.addListener('place_changed', () => {
      const place = ac.getPlace()
      if (!place?.address_components) return

      const formatted = place.formatted_address ?? ''
      const neighborhood = extractNeighborhood(place.address_components)

      onChangeRef.current({
        ...dataRef.current,
        address: formatted,
        neighborhood,
      })
    })

    autocompleteRef.current = ac
  }, [mapsLoaded])

  useEffect(() => {
    attachAutocomplete()
  }, [attachAutocomplete])

  const today = new Date().toISOString().split('T')[0]

  const SEMESTER_PRESETS = [
    { label: 'Summer 2026 (May 19 – Aug 14)', from: '2026-05-19', to: '2026-08-14' },
    { label: 'Fall 2026 (Aug 26 – Dec 18)', from: '2026-08-26', to: '2026-12-18' },
  ]

  function applySemester(from: string, to: string) {
    onChange({ ...data, available_from: from, available_to: to })
  }

  return (
    <div className="max-w-xl mx-auto flex flex-col gap-5">
      <h2 className="text-xl font-semibold text-gray-900">Basic Info</h2>
      <p className="text-sm text-gray-500 -mt-3">Tell us about your sublet.</p>

      <Input
        label="Listing Title"
        placeholder='e.g. "Sunny room near campus"'
        value={data.title}
        onChange={(e) => update('title', e.target.value)}
        error={errors.title}
        maxLength={80}
      />

      {/* Address — Google Places Autocomplete */}
      <div className="flex flex-col gap-1">
        <label htmlFor="address" className="text-sm font-medium text-gray-800">Address</label>
        <input
          ref={inputRef}
          id="address"
          type="text"
          placeholder="Start typing an address in Boulder…"
          defaultValue={data.address}
          onChange={(e) => update('address', e.target.value)}
          className={[
            'w-full px-3 py-2 text-sm rounded-button border bg-white',
            'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent',
            'placeholder:text-gray-400 transition-colors duration-200',
            errors.address ? 'border-error text-error' : 'border-gray-200 text-gray-900 hover:border-gray-400',
          ].join(' ')}
        />
        {errors.address && <p className="text-xs text-error">{errors.address}</p>}
        <p className="text-xs text-gray-400">
          Never shown publicly. Only shared after an inquiry is accepted.
        </p>
      </div>

      {/* Neighborhood — auto-filled from place result */}
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-gray-800">Neighborhood</label>
        <div className="flex items-center gap-2 w-full px-3 py-2 text-sm rounded-button border border-gray-200 bg-gray-50">
          <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <span className={data.neighborhood ? 'text-gray-900' : 'text-gray-400'}>
            {data.neighborhood || 'Auto-detected from address'}
          </span>
        </div>
        {errors.neighborhood && <p className="text-xs text-error">{errors.neighborhood}</p>}
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-gray-800">Room Type</label>
        <select
          value={data.room_type}
          onChange={(e) => update('room_type', e.target.value)}
          className="w-full px-3 py-2 text-sm rounded-button border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent hover:border-gray-400 transition-colors"
        >
          <option value="">Select type</option>
          {ROOM_TYPES.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
        {errors.room_type && <p className="text-xs text-error">{errors.room_type}</p>}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Monthly Rent ($)"
          type="number"
          placeholder="1200"
          value={data.rent_monthly}
          onChange={(e) => update('rent_monthly', e.target.value)}
          error={errors.rent_monthly}
          min={0}
        />
        <Input
          label="Deposit ($)"
          type="number"
          placeholder="500 (optional)"
          value={data.deposit}
          onChange={(e) => update('deposit', e.target.value)}
          min={0}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Available From"
          type="date"
          value={data.available_from}
          onChange={(e) => update('available_from', e.target.value)}
          error={errors.available_from}
          min={today}
        />
        <Input
          label="Available To"
          type="date"
          value={data.available_to}
          onChange={(e) => update('available_to', e.target.value)}
          error={errors.available_to}
          min={data.available_from || today}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-gray-800">Quick Dates</label>
        <div className="flex flex-wrap gap-2">
          {SEMESTER_PRESETS.map((s) => {
            const isActive = data.available_from === s.from && data.available_to === s.to
            return (
              <button
                key={s.from}
                type="button"
                onClick={() => applySemester(s.from, s.to)}
                className={[
                  'px-3 py-1.5 text-xs font-medium rounded-full border transition-colors',
                  isActive
                    ? 'bg-primary-600 border-primary-600 text-white'
                    : 'bg-white border-gray-200 text-gray-600 hover:border-gray-400',
                ].join(' ')}
              >
                {s.label}
              </button>
            )
          })}
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-gray-800">Minimum Stay</label>
        <select
          value={data.min_stay_weeks}
          onChange={(e) => update('min_stay_weeks', e.target.value)}
          className="w-full px-3 py-2 text-sm rounded-button border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent hover:border-gray-400 transition-colors"
        >
          <option value="1">1 week</option>
          <option value="2">2 weeks</option>
          <option value="4">1 month</option>
          <option value="8">2 months</option>
          <option value="0">Flexible</option>
        </select>
      </div>
    </div>
  )
}
