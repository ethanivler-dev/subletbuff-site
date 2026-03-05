'use client'

import { AMENITIES, AMENITY_LABELS } from '@/lib/constants'

export interface DetailsData {
  description: string
  furnished: boolean
  furnished_details: string
  amenities: string[]
  utilities_included: boolean
  utilities_estimate: string
  house_rules: string
  roommate_info: string
  is_intern_friendly: boolean
  immediate_movein: boolean
}

interface StepDetailsProps {
  data: DetailsData
  onChange: (data: DetailsData) => void
  errors: Partial<Record<keyof DetailsData, string>>
  availableFrom?: string
}

export function StepDetails({ data, onChange, errors, availableFrom }: StepDetailsProps) {
  const isMoveinSoon = !availableFrom || (() => {
    const from = new Date(availableFrom + 'T00:00:00')
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return (from.getTime() - today.getTime()) / 86400000 <= 14
  })()
  function update<K extends keyof DetailsData>(field: K, value: DetailsData[K]) {
    onChange({ ...data, [field]: value })
  }

  function toggleAmenity(key: string) {
    const current = data.amenities
    if (current.includes(key)) {
      update('amenities', current.filter((a) => a !== key))
    } else {
      update('amenities', [...current, key])
    }
  }

  return (
    <div className="max-w-xl mx-auto flex flex-col gap-5">
      <h2 className="text-xl font-semibold text-gray-900">Property Details</h2>
      <p className="text-sm text-gray-500 -mt-3">Describe what makes your place special.</p>

      {/* Description */}
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-gray-800">Description</label>
        <textarea
          value={data.description}
          onChange={(e) => update('description', e.target.value)}
          placeholder="Describe your space, the neighborhood, what's nearby…"
          rows={5}
          className="w-full px-3 py-2 text-sm rounded-button border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent placeholder:text-gray-400 transition-colors resize-none hover:border-gray-400"
        />
        <div className="flex justify-between">
          {errors.description && <p className="text-xs text-error">{errors.description}</p>}
          <p className="text-xs text-gray-400 ml-auto">{data.description.length}/100 min</p>
        </div>
      </div>

      {/* Toggles */}
      <div className="flex flex-col gap-3">
        <Toggle label="Furnished" checked={data.furnished} onChange={(v) => update('furnished', v)} />
        {data.furnished && (
          <div className="ml-14">
            <textarea
              value={data.furnished_details}
              onChange={(e) => update('furnished_details', e.target.value)}
              placeholder="What's included? e.g. bed, desk, couch, kitchen appliances…"
              rows={2}
              className="w-full px-3 py-2 text-sm rounded-button border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent placeholder:text-gray-400 transition-colors resize-none hover:border-gray-400"
            />
          </div>
        )}
        <Toggle label="Utilities Included" checked={data.utilities_included} onChange={(v) => update('utilities_included', v)} />

        {!data.utilities_included && (
          <div className="ml-6">
            <label className="text-sm text-gray-600">Estimated monthly utilities ($)</label>
            <input
              type="number"
              placeholder="100"
              value={data.utilities_estimate}
              onChange={(e) => update('utilities_estimate', e.target.value)}
              className="mt-1 w-32 px-3 py-1.5 text-sm rounded-button border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
        )}

        <Toggle label="Intern-Friendly" checked={data.is_intern_friendly} onChange={(v) => update('is_intern_friendly', v)} />
        <Toggle
          label="Immediate Move-In"
          checked={data.immediate_movein}
          onChange={(v) => update('immediate_movein', v)}
          disabled={!isMoveinSoon}
          helperText={!isMoveinSoon ? 'Only available for listings starting within 2 weeks' : undefined}
        />
      </div>

      {/* Amenities */}
      <div>
        <label className="text-sm font-medium text-gray-800 mb-2 block">Amenities</label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {AMENITIES.map((key) => {
            const checked = data.amenities.includes(key)
            return (
              <button
                key={key}
                type="button"
                onClick={() => toggleAmenity(key)}
                className={[
                  'flex items-center gap-2 px-3 py-2 text-sm rounded-button border transition-colors text-left',
                  checked
                    ? 'border-primary-500 bg-primary-50 text-primary-700'
                    : 'border-gray-200 bg-white text-gray-600 hover:border-gray-400',
                ].join(' ')}
              >
                <span className={[
                  'w-4 h-4 rounded border flex items-center justify-center flex-shrink-0',
                  checked ? 'bg-primary-600 border-primary-600' : 'border-gray-300',
                ].join(' ')}>
                  {checked && <span className="text-white text-xs">✓</span>}
                </span>
                {AMENITY_LABELS[key] ?? key}
              </button>
            )
          })}
        </div>
      </div>

      {/* House rules */}
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-gray-800">House Rules (optional)</label>
        <textarea
          value={data.house_rules}
          onChange={(e) => update('house_rules', e.target.value)}
          placeholder="No smoking, quiet hours after 10pm…"
          rows={3}
          className="w-full px-3 py-2 text-sm rounded-button border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent placeholder:text-gray-400 transition-colors resize-none hover:border-gray-400"
        />
      </div>

      {/* Roommate info */}
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-gray-800">Roommate Info (optional)</label>
        <textarea
          value={data.roommate_info}
          onChange={(e) => update('roommate_info', e.target.value)}
          placeholder="Will anyone else be living there? Tell future subletters about them."
          rows={3}
          className="w-full px-3 py-2 text-sm rounded-button border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent placeholder:text-gray-400 transition-colors resize-none hover:border-gray-400"
        />
      </div>
    </div>
  )
}

function Toggle({
  label,
  checked,
  onChange,
  disabled,
  helperText,
}: {
  label: string
  checked: boolean
  onChange: (v: boolean) => void
  disabled?: boolean
  helperText?: string
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className={['flex items-center gap-3', disabled ? 'cursor-not-allowed' : 'cursor-pointer'].join(' ')}>
        <button
          type="button"
          role="switch"
          aria-checked={checked}
          onClick={() => !disabled && onChange(!checked)}
          className={[
            'relative inline-flex h-6 w-11 rounded-full transition-colors',
            disabled ? 'opacity-50 cursor-not-allowed' : '',
            checked ? 'bg-primary-600' : 'bg-gray-300',
          ].join(' ')}
        >
          <span
            className={[
              'inline-block h-5 w-5 rounded-full bg-white shadow transform transition-transform mt-0.5',
              checked ? 'translate-x-[22px]' : 'translate-x-0.5',
            ].join(' ')}
          />
        </button>
        <span className={['text-sm', disabled ? 'text-gray-400' : 'text-gray-700'].join(' ')}>{label}</span>
      </label>
      {helperText && <p className="ml-14 text-xs text-gray-400">{helperText}</p>}
    </div>
  )
}
