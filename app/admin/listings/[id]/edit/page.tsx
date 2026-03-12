'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import ReactCrop, { type Crop, type PixelCrop } from 'react-image-crop'
import 'react-image-crop/dist/ReactCrop.css'
import { ArrowLeft, Save, Loader2, RotateCw, RotateCcw, FlipVertical2, Crop as CropIcon } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { rotateImage } from '@/lib/image-rotate'
import { NEIGHBORHOODS, ROOM_TYPES, AMENITIES, AMENITY_LABELS } from '@/lib/constants'
import { useToast } from '@/components/ui/Toast'
import { Modal } from '@/components/ui/Modal'

interface ListingData {
  id: string
  title: string | null
  description: string | null
  neighborhood: string | null
  room_type: string | null
  rent_monthly: number | null
  monthly_rent: number | null
  bedrooms: number | null
  bathrooms: number | null
  beds: number | null
  baths: number | null
  deposit: number | null
  security_deposit: number | null
  available_from: string | null
  available_to: string | null
  start_date: string | null
  end_date: string | null
  status: string | null
  paused: boolean | null
  filled: boolean | null
  test_listing: boolean | null
  verified: boolean | null
  furnished: boolean | string | null
  is_intern_friendly: boolean | null
  immediate_movein: boolean | null
  house_rules: string | null
  roommate_info: string | null
  amenities: string[] | null
  utilities_included: boolean | null
  utilities_estimate: number | null
  email: string | null
  photo_urls: string[] | null
  listing_photos: Array<{ url: string; display_order: number; is_primary: boolean; storage_path?: string }> | null
  first_name: string | null
  last_name: string | null
}

export default function AdminEditListingPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const id = params.id as string

  const [listing, setListing] = useState<ListingData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form state — Listing Content
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [neighborhood, setNeighborhood] = useState('')
  const [roomType, setRoomType] = useState('')
  const [rentMonthly, setRentMonthly] = useState('')
  const [depositVal, setDepositVal] = useState('')
  const [bedroomsVal, setBedroomsVal] = useState('')
  const [bathroomsVal, setBathroomsVal] = useState('')
  const [availableFrom, setAvailableFrom] = useState('')
  const [availableTo, setAvailableTo] = useState('')
  const [emailVal, setEmailVal] = useState('')
  const [furnished, setFurnished] = useState(false)
  const [isInternFriendly, setIsInternFriendly] = useState(false)
  const [immediateMovein, setImmediateMovein] = useState(false)
  const [houseRules, setHouseRules] = useState('')
  const [roommateInfo, setRoommateInfo] = useState('')
  const [amenitiesVal, setAmenitiesVal] = useState<string[]>([])
  const [utilitiesIncluded, setUtilitiesIncluded] = useState(false)
  const [utilitiesEstimate, setUtilitiesEstimate] = useState('')

  // Form state — Admin Controls
  const [status, setStatus] = useState('')
  const [paused, setPaused] = useState(false)
  const [filled, setFilled] = useState(false)
  const [verified, setVerified] = useState(false)
  const [testListing, setTestListing] = useState(false)

  // Photos
  const [rotatingPhoto, setRotatingPhoto] = useState<number | null>(null)
  const [editedPhotos, setEditedPhotos] = useState<Array<{ url: string; display_order: number; is_primary: boolean; storage_path?: string }>>([])

  // Crop state
  const [cropPhotoIndex, setCropPhotoIndex] = useState<number | null>(null)
  const [crop, setCrop] = useState<Crop>()
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>()
  const [cropAspect, setCropAspect] = useState<number | undefined>(undefined)
  const cropImgRef = useRef<HTMLImageElement>(null)
  const [croppingInProgress, setCroppingInProgress] = useState(false)

  async function handleRotatePhoto(index: number, degrees: 90 | -90 | 180) {
    const photo = editedPhotos[index]
    if (!photo || rotatingPhoto !== null) return

    setRotatingPhoto(index)
    try {
      const blob = await rotateImage(photo.url, degrees)
      const storagePath = photo.storage_path

      if (storagePath) {
        const supabase = createClient()
        const { error: uploadError } = await supabase.storage
          .from('listing-photos')
          .upload(storagePath, blob, { upsert: true, contentType: 'image/jpeg' })

        if (uploadError) {
          toast(`Failed to rotate photo: ${uploadError.message}`, 'error')
          setRotatingPhoto(null)
          return
        }

        const { data: urlData } = supabase.storage
          .from('listing-photos')
          .getPublicUrl(storagePath)

        const newUrl = `${urlData.publicUrl}?t=${Date.now()}`
        setEditedPhotos((prev) =>
          prev.map((p, i) => (i === index ? { ...p, url: newUrl } : p))
        )

        // Update the URL in listing_photos table so it persists
        await supabase.from('listing_photos')
          .update({ url: newUrl })
          .eq('listing_id', id)
          .eq('url', photo.url)

        toast('Photo rotated', 'success')
      } else {
        toast('No storage path — rotation is local only', 'error')
      }
    } catch {
      toast('Failed to rotate image', 'error')
    } finally {
      setRotatingPhoto(null)
    }
  }

  function openCropModal(index: number) {
    setCropPhotoIndex(index)
    setCrop(undefined)
    setCompletedCrop(undefined)
    setCropAspect(undefined)
  }

  async function applyCrop() {
    if (cropPhotoIndex === null || !completedCrop || !cropImgRef.current) return

    setCroppingInProgress(true)
    const photo = editedPhotos[cropPhotoIndex]

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

      const storagePath = photo.storage_path

      if (storagePath) {
        const supabase = createClient()
        const { error: uploadError } = await supabase.storage
          .from('listing-photos')
          .upload(storagePath, blob, { upsert: true, contentType: 'image/jpeg' })

        if (uploadError) {
          toast(`Failed to upload cropped photo: ${uploadError.message}`, 'error')
          setCroppingInProgress(false)
          return
        }

        const { data: urlData } = supabase.storage.from('listing-photos').getPublicUrl(storagePath)
        const newUrl = `${urlData.publicUrl}?t=${Date.now()}`
        setEditedPhotos(prev => prev.map((p, i) => (i === cropPhotoIndex ? { ...p, url: newUrl } : p)))

        await supabase.from('listing_photos')
          .update({ url: newUrl })
          .eq('listing_id', id)
          .eq('url', photo.url)

        toast('Photo cropped', 'success')
      } else {
        toast('No storage path — crop is local only', 'error')
      }

      setCropPhotoIndex(null)
    } catch {
      toast('Failed to crop image', 'error')
    } finally {
      setCroppingInProgress(false)
    }
  }

  const fetchListing = useCallback(async () => {
    const res = await fetch(`/api/admin/listings/${id}`)
    if (!res.ok) {
      setError('Listing not found')
      setLoading(false)
      return
    }

    const row = (await res.json()) as ListingData
    setListing(row)
    setTitle(row.title ?? '')
    setDescription(row.description ?? '')
    setNeighborhood(row.neighborhood ?? '')
    setRoomType(row.room_type ?? '')
    setRentMonthly(String(row.rent_monthly ?? row.monthly_rent ?? ''))
    setDepositVal(String(row.deposit ?? row.security_deposit ?? ''))
    setBedroomsVal(String(row.bedrooms ?? row.beds ?? ''))
    setBathroomsVal(String(row.bathrooms ?? row.baths ?? ''))
    setAvailableFrom(row.available_from ?? row.start_date ?? '')
    setAvailableTo(row.available_to ?? row.end_date ?? '')
    setEmailVal(row.email ?? '')
    setStatus(row.status ?? 'pending')
    setPaused(row.paused ?? false)
    setFilled(row.filled ?? false)
    setVerified(row.verified ?? false)
    setFurnished(row.furnished === true || row.furnished === 'Yes')
    setIsInternFriendly(row.is_intern_friendly ?? false)
    setImmediateMovein(row.immediate_movein ?? false)
    setTestListing(row.test_listing ?? false)
    setHouseRules(row.house_rules ?? '')
    setRoommateInfo(row.roommate_info ?? '')
    setAmenitiesVal(row.amenities ?? [])
    setUtilitiesIncluded(row.utilities_included ?? false)
    setUtilitiesEstimate(String(row.utilities_estimate ?? ''))

    const resolvedPhotos = row.listing_photos && row.listing_photos.length > 0
      ? [...row.listing_photos].sort((a, b) => a.display_order - b.display_order)
      : (row.photo_urls ?? []).map((url: string, i: number) => ({ url, display_order: i, is_primary: i === 0 }))
    setEditedPhotos(resolvedPhotos)

    setLoading(false)
  }, [id])

  useEffect(() => { fetchListing() }, [fetchListing])

  async function handleSave() {
    setSaving(true)
    setError(null)

    const updates: Record<string, unknown> = {
      title: title.trim(),
      description: description.trim(),
      neighborhood,
      room_type: roomType,
      rent_monthly: parseInt(rentMonthly) || 0,
      deposit: parseInt(depositVal) || 0,
      bedrooms: parseInt(bedroomsVal) || 0,
      bathrooms: parseFloat(bathroomsVal) || 0,
      available_from: availableFrom,
      available_to: availableTo,
      email: emailVal.trim(),
      status,
      paused,
      filled,
      verified,
      furnished,
      is_intern_friendly: isInternFriendly,
      immediate_movein: immediateMovein,
      test_listing: testListing,
      house_rules: houseRules.trim(),
      roommate_info: roommateInfo.trim(),
      amenities: amenitiesVal,
      utilities_included: utilitiesIncluded,
      utilities_estimate: utilitiesEstimate ? parseInt(utilitiesEstimate) : null,
    }

    const res = await fetch(`/api/admin/listings/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    })

    if (res.ok) {
      toast('Changes saved successfully', 'success')
    } else {
      const data = await res.json().catch(() => ({}))
      setError(data.error || 'Failed to save')
    }
    setSaving(false)
  }

  const photos = editedPhotos

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 pt-24 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    )
  }

  if (error && !listing) {
    return (
      <div className="min-h-screen bg-gray-50 pt-24 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <Link href="/admin" className="text-primary-600 hover:underline">Back to Admin</Link>
        </div>
      </div>
    )
  }

  const inputClass = 'w-full px-3 py-2 text-sm rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent hover:border-gray-300 transition-colors'
  const labelClass = 'text-sm font-medium text-gray-700'
  const checkboxClass = 'h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500'

  return (
    <div className="min-h-screen bg-gray-50 pt-20 pb-12">
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Link href="/admin" className="p-2 rounded-lg hover:bg-gray-200 transition-colors">
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </Link>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">Edit Listing</h1>
              <p className="text-xs text-gray-500 mt-0.5">
                {listing?.first_name} {listing?.last_name} &middot; {listing?.email}
              </p>
            </div>
          </div>
          <Link
            href={`/listings/${id}`}
            target="_blank"
            className="text-sm text-primary-600 hover:underline"
          >
            Preview &rarr;
          </Link>
        </div>

        {error && listing && (
          <div className="mb-4 px-4 py-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {error}
          </div>
        )}

        {/* ============================================================ */}
        {/*  Listing Content                                              */}
        {/* ============================================================ */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden mb-6">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-base font-semibold text-gray-900">Listing Content</h2>
          </div>

          {/* Photos */}
          {photos.length > 0 && (
            <div className="flex gap-1 overflow-x-auto p-4 bg-gray-50 border-b border-gray-200">
              {photos.map((photo, i) => (
                <div key={i} className="relative flex-shrink-0 w-32 h-24 rounded-lg overflow-hidden bg-gray-200 group">
                  <Image src={photo.url} alt={`Photo ${i + 1}`} fill className="object-cover" sizes="128px" />
                  {photo.is_primary && (
                    <span className="absolute top-1 left-1 text-[10px] bg-black/60 text-white px-1.5 py-0.5 rounded">Primary</span>
                  )}
                  {rotatingPhoto !== i && (
                    <div className="absolute bottom-1 right-1 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => handleRotatePhoto(i, -90)} className="bg-black/50 hover:bg-black/70 text-white rounded-full p-1" aria-label="Rotate counter-clockwise">
                        <RotateCcw className="w-3 h-3" />
                      </button>
                      <button onClick={() => handleRotatePhoto(i, 90)} className="bg-black/50 hover:bg-black/70 text-white rounded-full p-1" aria-label="Rotate clockwise">
                        <RotateCw className="w-3 h-3" />
                      </button>
                      <button onClick={() => handleRotatePhoto(i, 180)} className="bg-black/50 hover:bg-black/70 text-white rounded-full p-1" aria-label="Rotate 180 degrees">
                        <FlipVertical2 className="w-3 h-3" />
                      </button>
                      <button onClick={() => openCropModal(i)} className="bg-black/50 hover:bg-black/70 text-white rounded-full p-1" aria-label="Crop photo">
                        <CropIcon className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                  {rotatingPhoto === i && (
                    <div className="absolute inset-0 bg-white/60 flex items-center justify-center">
                      <div className="w-5 h-5 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="p-6 flex flex-col gap-5">
            {/* Title */}
            <div className="flex flex-col gap-1">
              <label className={labelClass}>Title</label>
              <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className={inputClass} maxLength={80} />
            </div>

            {/* Description */}
            <div className="flex flex-col gap-1">
              <label className={labelClass}>Description</label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={5} className={inputClass + ' resize-y'} />
            </div>

            {/* Contact Email */}
            <div className="flex flex-col gap-1">
              <label className={labelClass}>Contact Email</label>
              <input type="email" value={emailVal} onChange={(e) => setEmailVal(e.target.value)} className={inputClass} />
            </div>

            {/* Price + Deposit */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <label className={labelClass}>Monthly Rent ($)</label>
                <input type="number" value={rentMonthly} onChange={(e) => setRentMonthly(e.target.value)} className={inputClass} min={0} />
              </div>
              <div className="flex flex-col gap-1">
                <label className={labelClass}>Security Deposit ($)</label>
                <input type="number" value={depositVal} onChange={(e) => setDepositVal(e.target.value)} className={inputClass} min={0} />
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
                <label className={labelClass}>Bedrooms</label>
                <input type="number" value={bedroomsVal} onChange={(e) => setBedroomsVal(e.target.value)} className={inputClass} min={0} max={10} />
              </div>
              <div className="flex flex-col gap-1">
                <label className={labelClass}>Bathrooms</label>
                <input type="number" value={bathroomsVal} onChange={(e) => setBathroomsVal(e.target.value)} className={inputClass} min={0} max={10} step="0.5" />
              </div>
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <label className={labelClass}>Available From</label>
                <input type="date" value={availableFrom} onChange={(e) => setAvailableFrom(e.target.value)} className={inputClass} />
              </div>
              <div className="flex flex-col gap-1">
                <label className={labelClass}>Available To</label>
                <input type="date" value={availableTo} onChange={(e) => setAvailableTo(e.target.value)} className={inputClass} />
              </div>
            </div>

            {/* Amenities */}
            <div>
              <label className={labelClass + ' mb-2 block'}>Amenities</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {AMENITIES.map((key) => {
                  const checked = amenitiesVal.includes(key)
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setAmenitiesVal(prev => checked ? prev.filter(a => a !== key) : [...prev, key])}
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

            {/* Content toggles */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 border-t border-gray-100 pt-4">
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input type="checkbox" checked={furnished} onChange={(e) => setFurnished(e.target.checked)} className={checkboxClass} />
                Furnished
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input type="checkbox" checked={utilitiesIncluded} onChange={(e) => setUtilitiesIncluded(e.target.checked)} className={checkboxClass} />
                Utilities Included
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input type="checkbox" checked={isInternFriendly} onChange={(e) => setIsInternFriendly(e.target.checked)} className={checkboxClass} />
                Intern Friendly
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input type="checkbox" checked={immediateMovein} onChange={(e) => setImmediateMovein(e.target.checked)} className={checkboxClass} />
                Immediate Move-in
              </label>
            </div>

            {!utilitiesIncluded && (
              <div className="flex flex-col gap-1">
                <label className={labelClass}>Estimated Monthly Utilities ($)</label>
                <input type="number" value={utilitiesEstimate} onChange={(e) => setUtilitiesEstimate(e.target.value)} className={inputClass + ' max-w-[160px]'} min={0} />
              </div>
            )}

            {/* House rules */}
            <div className="flex flex-col gap-1">
              <label className={labelClass}>House Rules</label>
              <textarea value={houseRules} onChange={(e) => setHouseRules(e.target.value)} rows={3} className={inputClass + ' resize-y'} />
            </div>

            {/* Roommate info */}
            <div className="flex flex-col gap-1">
              <label className={labelClass}>Roommate Info</label>
              <textarea value={roommateInfo} onChange={(e) => setRoommateInfo(e.target.value)} rows={3} className={inputClass + ' resize-y'} />
            </div>
          </div>
        </div>

        {/* ============================================================ */}
        {/*  Admin Controls                                               */}
        {/* ============================================================ */}
        <div className="bg-amber-50 rounded-xl border border-amber-200 shadow-sm overflow-hidden mb-6">
          <div className="px-6 py-4 border-b border-amber-200">
            <h2 className="text-base font-semibold text-amber-900">Admin Controls</h2>
            <p className="text-xs text-amber-700 mt-0.5">These fields affect listing visibility and verification.</p>
          </div>

          <div className="p-6 flex flex-col gap-5">
            {/* Status */}
            <div className="flex flex-col gap-1">
              <label className={labelClass}>Status</label>
              <select value={status} onChange={(e) => setStatus(e.target.value)} className={inputClass}>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>

            {/* Admin checkboxes */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input type="checkbox" checked={verified} onChange={(e) => setVerified(e.target.checked)} className={checkboxClass} />
                Verified
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input type="checkbox" checked={paused} onChange={(e) => setPaused(e.target.checked)} className={checkboxClass} />
                Paused
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input type="checkbox" checked={filled} onChange={(e) => setFilled(e.target.checked)} className={checkboxClass} />
                Filled
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input type="checkbox" checked={testListing} onChange={(e) => setTestListing(e.target.checked)} className={checkboxClass} />
                Test Listing
              </label>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-lg bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50 transition-colors"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Changes
          </button>
          <button
            onClick={() => router.push('/admin')}
            className="px-5 py-2.5 text-sm font-medium rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>

      {/* Crop Modal */}
      <Modal
        open={cropPhotoIndex !== null}
        onClose={() => setCropPhotoIndex(null)}
        title="Crop Photo"
        className="max-w-2xl"
      >
        {cropPhotoIndex !== null && editedPhotos[cropPhotoIndex] && (
          <div className="flex flex-col gap-4">
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
                  src={editedPhotos[cropPhotoIndex].url}
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
