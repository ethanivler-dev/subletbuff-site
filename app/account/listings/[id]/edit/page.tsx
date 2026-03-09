'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowLeft, Save, Loader2, Plus, X, AlertTriangle } from 'lucide-react'
import { NEIGHBORHOODS, ROOM_TYPES, AMENITIES, AMENITY_LABELS } from '@/lib/constants'
import { createClient } from '@/lib/supabase/client'

/* ------------------------------------------------------------------ */
/*  Google Places loader (same as StepBasicInfo)                       */
/* ------------------------------------------------------------------ */

declare global {
  interface Window { __gmapsCallback?: () => void }
}

let gmapsPromise: Promise<void> | null = null

function loadGoogleMaps(): Promise<void> {
  if (gmapsPromise) return gmapsPromise
  if (typeof google !== 'undefined' && google.maps?.places) return Promise.resolve()
  gmapsPromise = new Promise<void>((resolve, reject) => {
    const key = process.env.NEXT_PUBLIC_MAPS_KEY
    if (!key) { reject(new Error('Missing NEXT_PUBLIC_MAPS_KEY')); return }
    window.__gmapsCallback = () => resolve()
    const s = document.createElement('script')
    s.src = `https://maps.googleapis.com/maps/api/js?key=${key}&libraries=places&loading=async&callback=__gmapsCallback`
    s.async = true
    s.onerror = () => reject(new Error('Failed to load Google Maps'))
    document.head.appendChild(s)
  })
  return gmapsPromise
}

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface Photo {
  url: string
  display_order: number
  is_primary: boolean
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function EditListingPage() {
  const { id } = useParams() as { id: string }
  const router = useRouter()
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [status, setStatus] = useState('')

  // Form state
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [address, setAddress] = useState('')
  const [neighborhood, setNeighborhood] = useState('')
  const [roomType, setRoomType] = useState('')
  const [rentMonthly, setRentMonthly] = useState('')
  const [deposit, setDeposit] = useState('')
  const [availableFrom, setAvailableFrom] = useState('')
  const [availableTo, setAvailableTo] = useState('')
  const [amenities, setAmenities] = useState<string[]>([])
  const [utilitiesIncluded, setUtilitiesIncluded] = useState(false)
  const [utilitiesEstimate, setUtilitiesEstimate] = useState('')
  const [furnished, setFurnished] = useState(false)
  const [isInternFriendly, setIsInternFriendly] = useState(false)
  const [immediateMovein, setImmediateMovein] = useState(false)
  const [houseRules, setHouseRules] = useState('')
  const [roommateInfo, setRoommateInfo] = useState('')
  const [photos, setPhotos] = useState<Photo[]>([])

  // Track changes that trigger re-review
  const [originalAddress, setOriginalAddress] = useState('')
  const [latitude, setLatitude] = useState('')
  const [longitude, setLongitude] = useState('')
  const [addressChanged, setAddressChanged] = useState(false)
  const [photosChanged, setPhotosChanged] = useState(false)

  const needsReReview = addressChanged || photosChanged

  // Google Places
  const addressRef = useRef<HTMLInputElement>(null)
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null)
  const [mapsLoaded, setMapsLoaded] = useState(false)

  useEffect(() => {
    loadGoogleMaps()
      .then(() => setMapsLoaded(true))
      .catch(() => {})
  }, [])

  const attachAutocomplete = useCallback(() => {
    if (!mapsLoaded || !addressRef.current || autocompleteRef.current) return
    const ac = new google.maps.places.Autocomplete(addressRef.current, {
      types: ['address'],
      componentRestrictions: { country: 'us' },
      fields: ['formatted_address', 'geometry'],
    })
    ac.setBounds(new google.maps.LatLngBounds(
      { lat: 39.95, lng: -105.35 },
      { lat: 40.10, lng: -105.17 },
    ))
    ac.addListener('place_changed', () => {
      const place = ac.getPlace()
      if (!place?.geometry) return
      const formatted = place.formatted_address ?? ''
      const lat = place.geometry.location?.lat()
      const lng = place.geometry.location?.lng()
      setAddress(formatted)
      setLatitude(lat ? String(lat) : '')
      setLongitude(lng ? String(lng) : '')
      setAddressChanged(true)
    })
    autocompleteRef.current = ac
  }, [mapsLoaded])

  useEffect(() => { attachAutocomplete() }, [attachAutocomplete])

  // Fetch listing data
  useEffect(() => {
    async function fetchListing() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/auth/login?next=/account/listings'); return }

      const res = await fetch(`/api/listings/${id}`)
      if (!res.ok) { setError('Listing not found'); setLoading(false); return }

      const { listing, is_owner } = await res.json()
      if (!is_owner) { router.replace('/account/listings'); return }
      if (listing.status !== 'pending' && listing.status !== 'approved') {
        setError('This listing cannot be edited')
        setLoading(false)
        return
      }

      setStatus(listing.status)
      setTitle(listing.title ?? '')
      setDescription(listing.description ?? '')
      setAddress(listing.address ?? '')
      setOriginalAddress(listing.address ?? '')
      setLatitude(listing.latitude ? String(listing.latitude) : '')
      setLongitude(listing.longitude ? String(listing.longitude) : '')
      setNeighborhood(listing.neighborhood ?? '')
      setRoomType(listing.room_type ?? '')
      setRentMonthly(String(listing.rent_monthly ?? listing.monthly_rent ?? ''))
      setDeposit(String(listing.deposit ?? listing.security_deposit ?? ''))
      setAvailableFrom(listing.available_from ?? listing.start_date ?? '')
      setAvailableTo(listing.available_to ?? listing.end_date ?? '')
      setAmenities(listing.amenities ?? [])
      setUtilitiesIncluded(listing.utilities_included ?? false)
      setUtilitiesEstimate(String(listing.utilities_estimate ?? ''))
      setFurnished(listing.furnished === true || listing.furnished === 'Yes')
      setIsInternFriendly(listing.is_intern_friendly ?? false)
      setImmediateMovein(listing.immediate_movein ?? false)
      setHouseRules(listing.house_rules ?? '')
      setRoommateInfo(listing.roommate_info ?? '')

      const listingPhotos = listing.listing_photos?.length
        ? listing.listing_photos
        : (listing.photo_urls ?? []).map((url: string, i: number) => ({ url, display_order: i, is_primary: i === 0 }))
      setPhotos(listingPhotos.sort((a: Photo, b: Photo) => a.display_order - b.display_order))

      setLoading(false)
    }
    fetchListing()
  }, [id, router, supabase])

  // Photo upload
  const [uploading, setUploading] = useState(false)
  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files
    if (!files?.length) return
    setUploading(true)

    for (const file of Array.from(files)) {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/upload', { method: 'POST', body: formData })
      if (!res.ok) continue
      const { url } = await res.json()

      // Insert into listing_photos table
      const order = photos.length
      await supabase.from('listing_photos').insert({
        listing_id: id,
        url,
        display_order: order,
        is_primary: photos.length === 0,
      })

      setPhotos(prev => [...prev, { url, display_order: order, is_primary: prev.length === 0 }])
      setPhotosChanged(true)
    }

    setUploading(false)
    e.target.value = ''
  }

  async function removePhoto(url: string) {
    await supabase.from('listing_photos').delete().eq('listing_id', id).eq('url', url)
    setPhotos(prev => prev.filter(p => p.url !== url))
    setPhotosChanged(true)
  }

  // Save
  async function handleSave() {
    setSaving(true)
    setError(null)
    setSuccess(false)

    const updates: Record<string, unknown> = {
      title: title.trim(),
      description: description.trim(),
      neighborhood,
      room_type: roomType,
      rent_monthly: parseInt(rentMonthly) || 0,
      deposit: parseInt(deposit) || 0,
      available_from: availableFrom,
      available_to: availableTo,
      amenities,
      utilities_included: utilitiesIncluded,
      utilities_estimate: utilitiesEstimate ? parseInt(utilitiesEstimate) : null,
      furnished,
      is_intern_friendly: isInternFriendly,
      immediate_movein: immediateMovein,
      house_rules: houseRules.trim(),
      roommate_info: roommateInfo.trim(),
    }

    if (addressChanged && latitude && longitude) {
      updates.address = address
      updates.latitude = parseFloat(latitude)
      updates.longitude = parseFloat(longitude)
      // Jitter for public display
      updates.public_latitude = parseFloat(latitude) + (Math.random() - 0.5) * 0.004
      updates.public_longitude = parseFloat(longitude) + (Math.random() - 0.5) * 0.004
    }

    if (photosChanged) {
      (updates as Record<string, unknown>)._photos_changed = true
    }

    const res = await fetch(`/api/listings/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    })

    if (res.ok) {
      const data = await res.json()
      setSuccess(true)
      setAddressChanged(false)
      setPhotosChanged(false)
      setOriginalAddress(address)
      if (data.status) setStatus(data.status)
      setTimeout(() => setSuccess(false), 3000)
    } else {
      const data = await res.json().catch(() => ({}))
      setError(data.error || 'Failed to save')
    }
    setSaving(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    )
  }

  if (error && !title) {
    return (
      <div className="min-h-screen bg-gray-50 pt-24 px-4 text-center">
        <p className="text-red-600 mb-4">{error}</p>
        <Link href="/account/listings" className="text-primary-600 hover:underline">Back to Dashboard</Link>
      </div>
    )
  }

  const inputClass = 'w-full px-3 py-2 text-sm rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent hover:border-gray-300 transition-colors'
  const labelClass = 'text-sm font-medium text-gray-700'

  return (
    <div className="min-h-screen bg-gray-50 pt-20 pb-12">
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Link href="/account/listings" className="p-2 rounded-lg hover:bg-gray-200 transition-colors">
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </Link>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">Edit Listing</h1>
              <p className="text-xs text-gray-500 mt-0.5">
                Status: <span className={status === 'approved' ? 'text-green-600' : 'text-amber-600'}>{status}</span>
              </p>
            </div>
          </div>
          <Link
            href={`/listings/${id}`}
            target="_blank"
            className="text-sm text-primary-600 hover:underline"
          >
            Preview
          </Link>
        </div>

        {/* Re-review warning */}
        {needsReReview && status === 'approved' && (
          <div className="mb-4 px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-800">This will send your listing back for review</p>
              <p className="text-xs text-amber-600 mt-0.5">
                Changing your address or photos requires re-approval. Your listing won&apos;t be visible until reviewed.
              </p>
            </div>
          </div>
        )}

        {success && (
          <div className="mb-4 px-4 py-2 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
            Changes saved{status === 'pending' && needsReReview ? ' — listing sent for review' : ''}
          </div>
        )}
        {error && title && (
          <div className="mb-4 px-4 py-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
        )}

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          {/* Photos section */}
          <div className="p-4 bg-gray-50 border-b border-gray-200">
            <label className={labelClass + ' mb-2 block'}>Photos</label>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {photos.map((photo, i) => (
                <div key={photo.url} className="relative flex-shrink-0 w-28 h-20 rounded-lg overflow-hidden bg-gray-200 group">
                  <Image src={photo.url} alt={`Photo ${i + 1}`} fill className="object-cover" sizes="112px" />
                  {photo.is_primary && (
                    <span className="absolute top-1 left-1 text-[10px] bg-black/60 text-white px-1.5 py-0.5 rounded">Primary</span>
                  )}
                  <button
                    onClick={() => removePhoto(photo.url)}
                    className="absolute top-1 right-1 p-0.5 rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Remove photo"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
              <label className="flex-shrink-0 w-28 h-20 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center cursor-pointer hover:border-gray-400 transition-colors">
                {uploading ? (
                  <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                ) : (
                  <Plus className="w-5 h-5 text-gray-400" />
                )}
                <input type="file" accept="image/*" multiple onChange={handlePhotoUpload} className="hidden" disabled={uploading} />
              </label>
            </div>
          </div>

          <div className="p-6 flex flex-col gap-5">
            {/* Title */}
            <div className="flex flex-col gap-1">
              <label className={labelClass}>Title</label>
              <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className={inputClass} maxLength={80} />
            </div>

            {/* Description */}
            <div className="flex flex-col gap-1">
              <label className={labelClass}>Description</label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={5} className={inputClass + ' resize-y'} maxLength={5000} />
            </div>

            {/* Address */}
            <div className="flex flex-col gap-1">
              <label className={labelClass}>Address</label>
              <input
                ref={addressRef}
                type="text"
                defaultValue={address}
                onChange={(e) => {
                  setAddress(e.target.value)
                  if (e.target.value !== originalAddress) setAddressChanged(true)
                }}
                className={inputClass}
                placeholder="Start typing an address..."
              />
              <p className="text-xs text-gray-400">Never shown publicly. Changing this sends your listing back for review.</p>
            </div>

            {/* Price + Room Type */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <label className={labelClass}>Monthly Rent ($)</label>
                <input type="number" value={rentMonthly} onChange={(e) => setRentMonthly(e.target.value)} className={inputClass} min={0} />
              </div>
              <div className="flex flex-col gap-1">
                <label className={labelClass}>Security Deposit ($)</label>
                <input type="number" value={deposit} onChange={(e) => setDeposit(e.target.value)} className={inputClass} min={0} />
              </div>
            </div>

            {/* Room Type + Neighborhood */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <label className={labelClass}>Room Type</label>
                <select value={roomType} onChange={(e) => setRoomType(e.target.value)} className={inputClass}>
                  <option value="">--</option>
                  {ROOM_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className={labelClass}>Neighborhood</label>
                <select value={neighborhood} onChange={(e) => setNeighborhood(e.target.value)} className={inputClass}>
                  <option value="">--</option>
                  {NEIGHBORHOODS.map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <label className={labelClass}>Available From</label>
                <input
                  type="date"
                  value={availableFrom}
                  onChange={(e) => {
                    setAvailableFrom(e.target.value)
                    if (availableTo && e.target.value > availableTo) setAvailableTo('')
                  }}
                  className={inputClass}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className={labelClass}>Available To</label>
                <input
                  type="date"
                  value={availableTo}
                  min={availableFrom || undefined}
                  onChange={(e) => setAvailableTo(e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>

            {/* Amenities */}
            <div>
              <label className={labelClass + ' mb-2 block'}>Amenities</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {AMENITIES.map((key) => {
                  const checked = amenities.includes(key)
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setAmenities(prev => checked ? prev.filter(a => a !== key) : [...prev, key])}
                      className={[
                        'flex items-center gap-2 px-3 py-2 text-sm rounded-lg border transition-colors text-left',
                        checked ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-gray-200 bg-white text-gray-600 hover:border-gray-400',
                      ].join(' ')}
                    >
                      <span className={[
                        'w-4 h-4 rounded border flex items-center justify-center flex-shrink-0',
                        checked ? 'bg-primary-600 border-primary-600' : 'border-gray-300',
                      ].join(' ')}>
                        {checked && <span className="text-white text-xs">&#10003;</span>}
                      </span>
                      {AMENITY_LABELS[key] ?? key}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Toggles */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 border-t border-gray-100 pt-4">
              <Toggle label="Furnished" checked={furnished} onChange={setFurnished} />
              <Toggle label="Utilities Included" checked={utilitiesIncluded} onChange={setUtilitiesIncluded} />
              <Toggle label="Intern-Friendly" checked={isInternFriendly} onChange={setIsInternFriendly} />
              <Toggle label="Immediate Move-In" checked={immediateMovein} onChange={setImmediateMovein} />
            </div>

            {!utilitiesIncluded && (
              <div className="flex flex-col gap-1">
                <label className={labelClass}>Estimated Monthly Utilities ($)</label>
                <input type="number" value={utilitiesEstimate} onChange={(e) => setUtilitiesEstimate(e.target.value)} className={inputClass + ' max-w-[160px]'} min={0} />
              </div>
            )}

            {/* House rules */}
            <div className="flex flex-col gap-1">
              <label className={labelClass}>House Rules (optional)</label>
              <textarea value={houseRules} onChange={(e) => setHouseRules(e.target.value)} rows={3} className={inputClass + ' resize-y'} placeholder="No smoking, quiet hours..." />
            </div>

            {/* Roommate info */}
            <div className="flex flex-col gap-1">
              <label className={labelClass}>Roommate Info (optional)</label>
              <textarea value={roommateInfo} onChange={(e) => setRoommateInfo(e.target.value)} rows={3} className={inputClass + ' resize-y'} placeholder="Will anyone else be living there?" />
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 pt-4 border-t border-gray-100">
              <button
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-lg bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50 transition-colors"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save Changes
              </button>
              <Link
                href="/account/listings"
                className="px-5 py-2.5 text-sm font-medium rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={['relative inline-flex h-5 w-9 rounded-full transition-colors', checked ? 'bg-primary-600' : 'bg-gray-300'].join(' ')}
      >
        <span className={['inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform mt-0.5', checked ? 'translate-x-[18px]' : 'translate-x-0.5'].join(' ')} />
      </button>
      <span className="text-sm text-gray-700">{label}</span>
    </label>
  )
}
