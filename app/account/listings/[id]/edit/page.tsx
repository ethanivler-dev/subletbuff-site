'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import ReactCrop, { type Crop, type PixelCrop } from 'react-image-crop'
import 'react-image-crop/dist/ReactCrop.css'
import {
  ArrowLeft, Save, Loader2, Plus, X, AlertTriangle, Info,
  RotateCw, RotateCcw, Crop as CropIcon,
} from 'lucide-react'
import { NEIGHBORHOODS, ROOM_TYPES, AMENITIES, AMENITY_LABELS } from '@/lib/constants'
import { createClient } from '@/lib/supabase/client'
import { rotateImage } from '@/lib/image-rotate'
import { Modal } from '@/components/ui/Modal'

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
  storage_path?: string
  photo_path?: string
}

interface OriginalValues {
  // Tier 1
  description: string
  email: string
  house_rules: string
  roommate_info: string
  amenities: string[]
  furnished: boolean
  utilities_included: boolean
  utilities_estimate: string
  auto_reduce_enabled: boolean
  auto_reduce_amount: string
  auto_reduce_interval_days: string
  auto_reduce_max_times: string
  // Tier 2
  title: string
  rent_monthly: string
  deposit: string
  bedrooms: string
  bathrooms: string
  neighborhood: string
  room_type: string
  available_from: string
  available_to: string
  address: string
  is_intern_friendly: boolean
  immediate_movein: boolean
}

const TIER_2_KEYS: (keyof OriginalValues)[] = [
  'title', 'rent_monthly', 'deposit', 'bedrooms', 'bathrooms',
  'neighborhood', 'available_from', 'available_to', 'room_type',
  'is_intern_friendly', 'immediate_movein', 'address',
]

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
  const [status, setStatus] = useState('')

  // Confirmation dialog
  const [showConfirm, setShowConfirm] = useState(false)

  // Form state — Tier 1
  const [description, setDescription] = useState('')
  const [email, setEmail] = useState('')
  const [houseRules, setHouseRules] = useState('')
  const [roommateInfo, setRoommateInfo] = useState('')
  const [amenities, setAmenities] = useState<string[]>([])
  const [furnished, setFurnished] = useState(false)
  const [utilitiesIncluded, setUtilitiesIncluded] = useState(false)
  const [utilitiesEstimate, setUtilitiesEstimate] = useState('')
  const [autoReduceEnabled, setAutoReduceEnabled] = useState(false)
  const [autoReduceAmount, setAutoReduceAmount] = useState('')
  const [autoReduceIntervalDays, setAutoReduceIntervalDays] = useState('')
  const [autoReduceMaxTimes, setAutoReduceMaxTimes] = useState('')

  // Form state — Tier 2
  const [title, setTitle] = useState('')
  const [rentMonthly, setRentMonthly] = useState('')
  const [deposit, setDeposit] = useState('')
  const [bedrooms, setBedrooms] = useState('')
  const [bathrooms, setBathrooms] = useState('')
  const [neighborhood, setNeighborhood] = useState('')
  const [roomType, setRoomType] = useState('')
  const [availableFrom, setAvailableFrom] = useState('')
  const [availableTo, setAvailableTo] = useState('')
  const [address, setAddress] = useState('')
  const [isInternFriendly, setIsInternFriendly] = useState(false)
  const [immediateMovein, setImmediateMovein] = useState(false)

  // Location (derived from address via Google Places)
  const [latitude, setLatitude] = useState('')
  const [longitude, setLongitude] = useState('')
  const [addressChanged, setAddressChanged] = useState(false)

  // Photos
  const [photos, setPhotos] = useState<Photo[]>([])
  const [uploading, setUploading] = useState(false)
  const [rotatingPhoto, setRotatingPhoto] = useState<number | null>(null)

  // Crop state
  const [cropPhotoIndex, setCropPhotoIndex] = useState<number | null>(null)
  const [crop, setCrop] = useState<Crop>()
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>()
  const [cropAspect, setCropAspect] = useState<number | undefined>(undefined)
  const cropImgRef = useRef<HTMLImageElement>(null)
  const [croppingInProgress, setCroppingInProgress] = useState(false)

  // Original values for diffing
  const originalRef = useRef<OriginalValues | null>(null)

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

  // Auto-check immediate move-in when available_from is within 14 days or in the past
  useEffect(() => {
    if (!availableFrom) return
    const moveIn = new Date(availableFrom)
    const now = new Date()
    const fourteenDaysFromNow = new Date()
    fourteenDaysFromNow.setDate(fourteenDaysFromNow.getDate() + 14)

    if (moveIn <= fourteenDaysFromNow) {
      setImmediateMovein(true)
    }
  }, [availableFrom])

  // Fetch listing data
  useEffect(() => {
    async function fetchListing() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/auth/login?next=/account/listings'); return }

      const res = await fetch(`/api/listings/${id}`)
      if (!res.ok) { setError('Listing not found'); setLoading(false); return }

      const { listing, is_owner } = await res.json()
      if (!is_owner) { router.replace('/account/listings'); return }

      setStatus(listing.status)

      // Tier 1
      setDescription(listing.description ?? '')
      setEmail(listing.email ?? '')
      setHouseRules(listing.house_rules ?? '')
      setRoommateInfo(listing.roommate_info ?? '')
      setAmenities(listing.amenities ?? [])
      setFurnished(listing.furnished === true || listing.furnished === 'Yes')
      setUtilitiesIncluded(listing.utilities_included ?? false)
      setUtilitiesEstimate(String(listing.utilities_estimate ?? ''))
      setAutoReduceEnabled(listing.auto_reduce_enabled ?? false)
      setAutoReduceAmount(String(listing.auto_reduce_amount ?? ''))
      setAutoReduceIntervalDays(String(listing.auto_reduce_interval_days ?? ''))
      setAutoReduceMaxTimes(String(listing.auto_reduce_max_times ?? ''))

      // Tier 2
      setTitle(listing.title ?? '')
      setRentMonthly(String(listing.rent_monthly ?? listing.monthly_rent ?? ''))
      setDeposit(String(listing.deposit ?? listing.security_deposit ?? ''))
      setBedrooms(String(listing.bedrooms ?? listing.beds ?? ''))
      setBathrooms(String(listing.bathrooms ?? listing.baths ?? ''))
      setNeighborhood(listing.neighborhood ?? '')
      setRoomType(listing.room_type ?? '')
      setAvailableFrom(listing.available_from ?? listing.start_date ?? '')
      setAvailableTo(listing.available_to ?? listing.end_date ?? '')
      setAddress(listing.address ?? '')
      setLatitude(listing.latitude ? String(listing.latitude) : '')
      setLongitude(listing.longitude ? String(listing.longitude) : '')
      setIsInternFriendly(listing.is_intern_friendly ?? false)
      setImmediateMovein(listing.immediate_movein ?? false)

      // Store original values for diffing
      originalRef.current = {
        description: listing.description ?? '',
        email: listing.email ?? '',
        house_rules: listing.house_rules ?? '',
        roommate_info: listing.roommate_info ?? '',
        amenities: listing.amenities ?? [],
        furnished: listing.furnished === true || listing.furnished === 'Yes',
        utilities_included: listing.utilities_included ?? false,
        utilities_estimate: String(listing.utilities_estimate ?? ''),
        auto_reduce_enabled: listing.auto_reduce_enabled ?? false,
        auto_reduce_amount: String(listing.auto_reduce_amount ?? ''),
        auto_reduce_interval_days: String(listing.auto_reduce_interval_days ?? ''),
        auto_reduce_max_times: String(listing.auto_reduce_max_times ?? ''),
        title: listing.title ?? '',
        rent_monthly: String(listing.rent_monthly ?? listing.monthly_rent ?? ''),
        deposit: String(listing.deposit ?? listing.security_deposit ?? ''),
        bedrooms: String(listing.bedrooms ?? listing.beds ?? ''),
        bathrooms: String(listing.bathrooms ?? listing.baths ?? ''),
        neighborhood: listing.neighborhood ?? '',
        room_type: listing.room_type ?? '',
        available_from: listing.available_from ?? listing.start_date ?? '',
        available_to: listing.available_to ?? listing.end_date ?? '',
        address: listing.address ?? '',
        is_intern_friendly: listing.is_intern_friendly ?? false,
        immediate_movein: listing.immediate_movein ?? false,
      }

      // Photos
      const listingPhotos = listing.listing_photos?.length
        ? listing.listing_photos
        : (listing.photo_urls ?? []).map((url: string, i: number) => ({ url, display_order: i, is_primary: i === 0 }))
      setPhotos(listingPhotos.sort((a: Photo, b: Photo) => a.display_order - b.display_order))

      setLoading(false)
    }
    fetchListing()
  }, [id, router, supabase])

  // ---------- Photo handlers ----------

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files
    if (!files?.length) return
    setUploading(true)

    for (const file of Array.from(files)) {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/upload', { method: 'POST', body: formData })
      if (!res.ok) continue
      const { url, storage_path } = await res.json()

      const order = photos.length
      await supabase.from('listing_photos').insert({
        listing_id: id,
        url,
        storage_path: storage_path ?? null,
        display_order: order,
        is_primary: photos.length === 0,
      })

      setPhotos(prev => [...prev, { url, storage_path, display_order: order, is_primary: prev.length === 0 }])
    }

    setUploading(false)
    e.target.value = ''
  }

  async function removePhoto(url: string) {
    await supabase.from('listing_photos').delete().eq('listing_id', id).eq('url', url)
    setPhotos(prev => prev.filter(p => p.url !== url))
  }

  async function handleRotatePhoto(index: number, degrees: 90 | -90) {
    const photo = photos[index]
    if (!photo || rotatingPhoto !== null) return

    setRotatingPhoto(index)
    try {
      const blob = await rotateImage(photo.url, degrees)
      const storagePath = photo.storage_path || photo.photo_path

      if (storagePath) {
        const { error: uploadError } = await supabase.storage
          .from('listing-photos')
          .upload(storagePath, blob, { upsert: true, contentType: 'image/jpeg' })

        if (uploadError) {
          setError(`Failed to re-upload rotated photo: ${uploadError.message}`)
          setRotatingPhoto(null)
          return
        }

        const { data: urlData } = supabase.storage.from('listing-photos').getPublicUrl(storagePath)
        const newUrl = `${urlData.publicUrl}?t=${Date.now()}`
        setPhotos(prev => prev.map((p, i) => (i === index ? { ...p, url: newUrl } : p)))

        // Update the URL in listing_photos table
        await supabase.from('listing_photos')
          .update({ url: newUrl })
          .eq('listing_id', id)
          .eq('url', photo.url)
      } else {
        const newUrl = URL.createObjectURL(blob)
        setPhotos(prev => prev.map((p, i) => (i === index ? { ...p, url: newUrl } : p)))
      }
    } catch {
      setError('Failed to rotate image')
    } finally {
      setRotatingPhoto(null)
    }
  }

  // ---------- Crop handlers ----------

  function openCropModal(index: number) {
    setCropPhotoIndex(index)
    setCrop(undefined)
    setCompletedCrop(undefined)
    setCropAspect(undefined)
  }

  async function applyCrop() {
    if (cropPhotoIndex === null || !completedCrop || !cropImgRef.current) return

    setCroppingInProgress(true)
    const photo = photos[cropPhotoIndex]

    try {
      const image = cropImgRef.current
      const canvas = document.createElement('canvas')
      const scaleX = image.naturalWidth / image.width
      const scaleY = image.naturalHeight / image.height

      canvas.width = completedCrop.width * scaleX
      canvas.height = completedCrop.height * scaleY

      const ctx = canvas.getContext('2d')!
      ctx.drawImage(
        image,
        completedCrop.x * scaleX,
        completedCrop.y * scaleY,
        completedCrop.width * scaleX,
        completedCrop.height * scaleY,
        0, 0,
        canvas.width, canvas.height,
      )

      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (b) => b ? resolve(b) : reject(new Error('Canvas toBlob returned null')),
          'image/jpeg',
          0.92,
        )
      })

      const storagePath = photo.storage_path || photo.photo_path

      if (storagePath) {
        const { error: uploadError } = await supabase.storage
          .from('listing-photos')
          .upload(storagePath, blob, { upsert: true, contentType: 'image/jpeg' })

        if (uploadError) {
          setError(`Failed to upload cropped photo: ${uploadError.message}`)
          setCroppingInProgress(false)
          return
        }

        const { data: urlData } = supabase.storage.from('listing-photos').getPublicUrl(storagePath)
        const newUrl = `${urlData.publicUrl}?t=${Date.now()}`
        setPhotos(prev => prev.map((p, i) => (i === cropPhotoIndex ? { ...p, url: newUrl } : p)))

        await supabase.from('listing_photos')
          .update({ url: newUrl })
          .eq('listing_id', id)
          .eq('url', photo.url)
      } else {
        const newUrl = URL.createObjectURL(blob)
        setPhotos(prev => prev.map((p, i) => (i === cropPhotoIndex ? { ...p, url: newUrl } : p)))
      }

      setCropPhotoIndex(null)
    } catch {
      setError('Failed to crop image')
    } finally {
      setCroppingInProgress(false)
    }
  }

  // ---------- Diffing & Submit ----------

  function getCurrentValues(): OriginalValues {
    return {
      description: description.trim(),
      email: email.trim(),
      house_rules: houseRules.trim(),
      roommate_info: roommateInfo.trim(),
      amenities,
      furnished,
      utilities_included: utilitiesIncluded,
      utilities_estimate: utilitiesEstimate,
      auto_reduce_enabled: autoReduceEnabled,
      auto_reduce_amount: autoReduceAmount,
      auto_reduce_interval_days: autoReduceIntervalDays,
      auto_reduce_max_times: autoReduceMaxTimes,
      title: title.trim(),
      rent_monthly: rentMonthly,
      deposit,
      bedrooms,
      bathrooms,
      neighborhood,
      room_type: roomType,
      available_from: availableFrom,
      available_to: availableTo,
      address,
      is_intern_friendly: isInternFriendly,
      immediate_movein: immediateMovein,
    }
  }

  function getChangedFields(): Partial<Record<keyof OriginalValues, unknown>> {
    const orig = originalRef.current
    if (!orig) return {}
    const current = getCurrentValues()
    const changed: Partial<Record<keyof OriginalValues, unknown>> = {}

    for (const key of Object.keys(orig) as (keyof OriginalValues)[]) {
      const o = orig[key]
      const c = current[key]
      if (Array.isArray(o) && Array.isArray(c)) {
        if (JSON.stringify([...o].sort()) !== JSON.stringify([...c].sort())) {
          changed[key] = c
        }
      } else if (o !== c) {
        changed[key] = c
      }
    }
    return changed
  }

  function hasTier2Changes(changed: Partial<Record<keyof OriginalValues, unknown>>): boolean {
    return TIER_2_KEYS.some(k => k in changed)
  }

  async function submitChanges() {
    setSaving(true)
    setError(null)

    const changed = getChangedFields()
    const updates: Record<string, unknown> = {}

    for (const [key, val] of Object.entries(changed)) {
      if (key === 'rent_monthly' || key === 'deposit') {
        updates[key] = parseInt(val as string) || 0
      } else if (key === 'bedrooms' || key === 'bathrooms') {
        updates[key] = parseInt(val as string) || 0
      } else if (key === 'utilities_estimate') {
        updates[key] = (val as string) ? parseInt(val as string) : null
      } else if (key === 'auto_reduce_amount' || key === 'auto_reduce_interval_days' || key === 'auto_reduce_max_times') {
        updates[key] = (val as string) ? parseInt(val as string) : null
      } else {
        updates[key] = val
      }
    }

    // If address changed via Google Places, include coordinates
    if (addressChanged && latitude && longitude) {
      updates.latitude = parseFloat(latitude)
      updates.longitude = parseFloat(longitude)
      updates.public_latitude = parseFloat(latitude) + (Math.random() - 0.5) * 0.004
      updates.public_longitude = parseFloat(longitude) + (Math.random() - 0.5) * 0.004
    }

    const res = await fetch(`/api/listings/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    })

    if (res.ok) {
      const data = await res.json()
      const toast = data.tier2_changed || data.status === 'pending' ? 'resubmitted' : 'updated'
      router.push(`/account/listings?toast=${toast}`)
    } else {
      const data = await res.json().catch(() => ({}))
      setError(data.error || 'Failed to save')
    }
    setSaving(false)
  }

  function handleSave() {
    setError(null)

    const changed = getChangedFields()
    if (Object.keys(changed).length === 0) {
      setError('No changes to save')
      return
    }

    const tier2 = hasTier2Changes(changed)

    // If listing is rejected, skip confirmation — they're resubmitting
    // If listing is already pending, skip confirmation — already under review
    if (tier2 && status === 'approved') {
      setShowConfirm(true)
    } else {
      submitChanges()
    }
  }

  // ---------- Render ----------

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    )
  }

  if (error && !originalRef.current) {
    return (
      <div className="min-h-screen bg-gray-50 pt-24 px-4 text-center">
        <p className="text-red-600 mb-4">{error}</p>
        <Link href="/account/listings" className="text-primary-600 hover:underline">Back to Dashboard</Link>
      </div>
    )
  }

  const inputClass = 'w-full px-3 py-2 text-sm rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent hover:border-gray-300 transition-colors'
  const labelClass = 'text-sm font-medium text-gray-700'

  // Immediate move-in auto-check eligibility
  const moveInDate = availableFrom ? new Date(availableFrom) : null
  const fourteenDaysAway = new Date()
  fourteenDaysAway.setDate(fourteenDaysAway.getDate() + 14)
  const canToggleImmediate = moveInDate ? moveInDate <= fourteenDaysAway : false

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
                Status: <span className={
                  status === 'approved' ? 'text-green-600' :
                  status === 'rejected' ? 'text-red-600' : 'text-amber-600'
                }>{status}</span>
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

        {error && originalRef.current && (
          <div className="mb-4 px-4 py-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
        )}

        {/* ============================================================ */}
        {/*  SECTION 1: Basic Details (Tier 1)                            */}
        {/* ============================================================ */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden mb-6">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-base font-semibold text-gray-900">Basic Details</h2>
            <p className="text-xs text-gray-500 mt-0.5">Changes here won&apos;t affect your listing&apos;s review status.</p>
          </div>

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
                  {/* Action buttons */}
                  {rotatingPhoto !== i && (
                    <div className="absolute bottom-1 right-1 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleRotatePhoto(i, -90)}
                        className="bg-black/50 hover:bg-black/70 text-white rounded-full p-1"
                        title="Rotate counter-clockwise"
                      >
                        <RotateCcw className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => handleRotatePhoto(i, 90)}
                        className="bg-black/50 hover:bg-black/70 text-white rounded-full p-1"
                        title="Rotate clockwise"
                      >
                        <RotateCw className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => openCropModal(i)}
                        className="bg-black/50 hover:bg-black/70 text-white rounded-full p-1"
                        title="Crop photo"
                      >
                        <CropIcon className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                  {rotatingPhoto === i && (
                    <div className="absolute inset-0 bg-white/60 flex items-center justify-center">
                      <div className="w-5 h-5 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
                    </div>
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
            {/* Description */}
            <div className="flex flex-col gap-1">
              <label className={labelClass}>Description</label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={5} className={inputClass + ' resize-y'} maxLength={5000} />
            </div>

            {/* Contact Email */}
            <div className="flex flex-col gap-1">
              <label className={labelClass}>Contact Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} />
              <p className="text-xs text-gray-400">Email shown to interested renters.</p>
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

            {/* Auto Price Reduction */}
            <div className="border-t border-gray-100 pt-4">
              <Toggle label="Auto Price Reduction" checked={autoReduceEnabled} onChange={setAutoReduceEnabled} />
              {autoReduceEnabled && (
                <div className="grid grid-cols-3 gap-3 mt-3">
                  <div className="flex flex-col gap-1">
                    <label className={labelClass}>Amount ($)</label>
                    <input type="number" value={autoReduceAmount} onChange={(e) => setAutoReduceAmount(e.target.value)} className={inputClass} min={10} />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className={labelClass}>Every (days)</label>
                    <select value={autoReduceIntervalDays} onChange={(e) => setAutoReduceIntervalDays(e.target.value)} className={inputClass}>
                      <option value="">--</option>
                      <option value="7">7</option>
                      <option value="14">14</option>
                      <option value="21">21</option>
                      <option value="30">30</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className={labelClass}>Max times</label>
                    <select value={autoReduceMaxTimes} onChange={(e) => setAutoReduceMaxTimes(e.target.value)} className={inputClass}>
                      <option value="">--</option>
                      {[1, 2, 3, 4, 5].map(n => <option key={n} value={String(n)}>{n}</option>)}
                    </select>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ============================================================ */}
        {/*  SECTION 2: Listing Details (Tier 2)                          */}
        {/* ============================================================ */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-base font-semibold text-gray-900">Listing Details</h2>
          </div>

          {/* Tier 2 warning banner */}
          <div className="mx-6 mt-4 px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              {status === 'rejected' ? (
                <>
                  <p className="text-sm font-medium text-amber-800">Your listing was rejected</p>
                  <p className="text-xs text-amber-600 mt-0.5">
                    Saving any changes will resubmit it for review.
                  </p>
                </>
              ) : status === 'pending' ? (
                <>
                  <p className="text-sm font-medium text-amber-800">Your listing is already under review</p>
                  <p className="text-xs text-amber-600 mt-0.5">
                    Saving changes will keep it in review.
                  </p>
                </>
              ) : (
                <>
                  <p className="text-sm font-medium text-amber-800">Editing these fields requires re-approval</p>
                  <p className="text-xs text-amber-600 mt-0.5">
                    Editing any field in this section will resubmit your listing for admin approval.
                    Your listing may be temporarily unlisted while under review.
                  </p>
                </>
              )}
            </div>
          </div>

          <div className="p-6 flex flex-col gap-5">
            {/* Title */}
            <div className="flex flex-col gap-1">
              <label className={labelClass}>Title</label>
              <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className={inputClass} maxLength={80} />
            </div>

            {/* Price + Deposit */}
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

            {/* Bedrooms + Bathrooms */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <label className={labelClass}>Bedrooms (whole unit)</label>
                <input type="number" value={bedrooms} onChange={(e) => setBedrooms(e.target.value)} className={inputClass} min={1} max={10} />
              </div>
              <div className="flex flex-col gap-1">
                <label className={labelClass}>Bathrooms (whole unit)</label>
                <input type="number" value={bathrooms} onChange={(e) => setBathrooms(e.target.value)} className={inputClass} min={1} max={10} step="0.5" />
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

            {/* Address */}
            <div className="flex flex-col gap-1">
              <label className={labelClass}>Address</label>
              <input
                ref={addressRef}
                type="text"
                defaultValue={address}
                onChange={(e) => {
                  setAddress(e.target.value)
                  if (e.target.value !== originalRef.current?.address) setAddressChanged(true)
                }}
                className={inputClass}
                placeholder="Start typing an address..."
              />
              <p className="text-xs text-gray-400">Never shown publicly.</p>
            </div>

            {/* Tier 2 toggles */}
            <div className="grid grid-cols-2 gap-3 border-t border-gray-100 pt-4">
              <Toggle label="Intern-Friendly" checked={isInternFriendly} onChange={setIsInternFriendly} />
              <div className="flex flex-col gap-1">
                <Toggle
                  label="Immediate Move-In"
                  checked={immediateMovein}
                  onChange={setImmediateMovein}
                  disabled={!canToggleImmediate}
                />
                {!canToggleImmediate && (
                  <p className="text-xs text-gray-400 flex items-center gap-1">
                    <Info className="w-3 h-3" />
                    Available when move-in is within 14 days
                  </p>
                )}
              </div>
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

      {/* Confirmation Dialog */}
      <Modal open={showConfirm} onClose={() => setShowConfirm(false)} title="Resubmit for Review?">
        <p className="text-sm text-gray-600 mb-6">
          This will send your listing back for review. Your listing may be temporarily unlisted while under review. Proceed?
        </p>
        <div className="flex items-center gap-3 justify-end">
          <button
            onClick={() => setShowConfirm(false)}
            className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              setShowConfirm(false)
              submitChanges()
            }}
            className="px-4 py-2 text-sm font-medium rounded-lg bg-primary-600 text-white hover:bg-primary-700 transition-colors"
          >
            Confirm
          </button>
        </div>
      </Modal>

      {/* Crop Modal */}
      <Modal
        open={cropPhotoIndex !== null}
        onClose={() => setCropPhotoIndex(null)}
        title="Crop Photo"
        className="max-w-2xl"
      >
        {cropPhotoIndex !== null && photos[cropPhotoIndex] && (
          <div className="flex flex-col gap-4">
            {/* Aspect ratio presets */}
            <div className="flex gap-2">
              {[
                { label: 'Free', value: undefined },
                { label: '4:3', value: 4 / 3 },
                { label: '16:9', value: 16 / 9 },
                { label: '1:1', value: 1 },
              ].map((preset) => (
                <button
                  key={preset.label}
                  onClick={() => {
                    setCropAspect(preset.value)
                    setCrop(undefined)
                    setCompletedCrop(undefined)
                  }}
                  className={[
                    'px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors',
                    cropAspect === preset.value
                      ? 'border-primary-500 bg-primary-50 text-primary-700'
                      : 'border-gray-200 text-gray-600 hover:border-gray-400',
                  ].join(' ')}
                >
                  {preset.label}
                </button>
              ))}
            </div>

            <div className="max-h-[60vh] overflow-auto">
              <ReactCrop
                crop={crop}
                onChange={(c) => setCrop(c)}
                onComplete={(c) => setCompletedCrop(c)}
                aspect={cropAspect}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  ref={cropImgRef}
                  src={photos[cropPhotoIndex].url}
                  alt="Crop preview"
                  className="max-w-full"
                  crossOrigin="anonymous"
                />
              </ReactCrop>
            </div>

            <div className="flex items-center gap-3 justify-end">
              <button
                onClick={() => setCropPhotoIndex(null)}
                className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={applyCrop}
                disabled={!completedCrop || croppingInProgress}
                className="px-4 py-2 text-sm font-medium rounded-lg bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50 transition-colors inline-flex items-center gap-2"
              >
                {croppingInProgress && <Loader2 className="w-4 h-4 animate-spin" />}
                Apply Crop
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

function Toggle({ label, checked, onChange, disabled }: { label: string; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <label className={['flex items-center gap-2', disabled ? 'opacity-50' : 'cursor-pointer'].join(' ')}>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        className={['relative inline-flex h-5 w-9 rounded-full transition-colors', checked ? 'bg-primary-600' : 'bg-gray-300'].join(' ')}
      >
        <span className={['inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform mt-0.5', checked ? 'translate-x-[18px]' : 'translate-x-0.5'].join(' ')} />
      </button>
      <span className="text-sm text-gray-700">{label}</span>
    </label>
  )
}
