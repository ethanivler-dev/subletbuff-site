'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowLeft, Save, Loader2, RotateCw, RotateCcw, FlipVertical2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { rotateImage } from '@/lib/image-rotate'
import { NEIGHBORHOODS, ROOM_TYPES } from '@/lib/constants'

interface ListingData {
  id: string
  title: string | null
  description: string | null
  neighborhood: string | null
  room_type: string | null
  rent_monthly: number | null
  monthly_rent: number | null
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
  photo_urls: string[] | null
  listing_photos: Array<{ url: string; display_order: number; is_primary: boolean; storage_path?: string; photo_path?: string }> | null
  email: string | null
  first_name: string | null
  last_name: string | null
}

export default function AdminEditListingPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  const [listing, setListing] = useState<ListingData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Form state
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [neighborhood, setNeighborhood] = useState('')
  const [roomType, setRoomType] = useState('')
  const [rentMonthly, setRentMonthly] = useState('')
  const [availableFrom, setAvailableFrom] = useState('')
  const [availableTo, setAvailableTo] = useState('')
  const [status, setStatus] = useState('')
  const [paused, setPaused] = useState(false)
  const [filled, setFilled] = useState(false)
  const [verified, setVerified] = useState(false)
  const [furnished, setFurnished] = useState(false)
  const [isInternFriendly, setIsInternFriendly] = useState(false)
  const [immediateMovein, setImmediateMovein] = useState(false)
  const [testListing, setTestListing] = useState(false)

  const [rotatingPhoto, setRotatingPhoto] = useState<number | null>(null)
  const [editedPhotos, setEditedPhotos] = useState<Array<{ url: string; display_order: number; is_primary: boolean; storage_path?: string; photo_path?: string }>>([])

  async function handleRotatePhoto(index: number, degrees: 90 | -90 | 180) {
    const photo = editedPhotos[index]
    if (!photo || rotatingPhoto !== null) return

    setRotatingPhoto(index)
    try {
      const blob = await rotateImage(photo.url, degrees)
      const storagePath = photo.storage_path || photo.photo_path

      if (storagePath) {
        // Re-upload to Supabase at the same path
        const supabase = createClient()
        const { error: uploadError } = await supabase.storage
          .from('listing-photos')
          .upload(storagePath, blob, { upsert: true, contentType: 'image/jpeg' })

        if (uploadError) {
          setError(`Failed to re-upload rotated photo: ${uploadError.message}`)
          setRotatingPhoto(null)
          return
        }

        // Get the new public URL (cache-bust with timestamp)
        const { data: urlData } = supabase.storage
          .from('listing-photos')
          .getPublicUrl(storagePath)

        const newUrl = `${urlData.publicUrl}?t=${Date.now()}`
        setEditedPhotos((prev) =>
          prev.map((p, i) => (i === index ? { ...p, url: newUrl } : p))
        )
      } else {
        // No storage path — just update the preview URL
        const newUrl = URL.createObjectURL(blob)
        setEditedPhotos((prev) =>
          prev.map((p, i) => (i === index ? { ...p, url: newUrl } : p))
        )
      }
    } catch {
      setError('Failed to rotate image')
    } finally {
      setRotatingPhoto(null)
    }
  }

  const fetchListing = useCallback(async () => {
    const supabase = createClient()
    const { data, error: fetchError } = await supabase
      .from('listings')
      .select(`
        id, title, description, neighborhood, room_type,
        rent_monthly, monthly_rent, available_from, available_to,
        start_date, end_date, status, paused, filled, test_listing,
        verified, furnished, is_intern_friendly, immediate_movein,
        photo_urls, email, first_name, last_name,
        listing_photos(url, display_order, is_primary, storage_path, photo_path)
      `)
      .eq('id', id)
      .single()

    if (fetchError || !data) {
      setError('Listing not found')
      setLoading(false)
      return
    }

    const row = data as unknown as ListingData
    setListing(row)
    setTitle(row.title ?? '')
    setDescription(row.description ?? '')
    setNeighborhood(row.neighborhood ?? '')
    setRoomType(row.room_type ?? '')
    setRentMonthly(String(row.rent_monthly ?? row.monthly_rent ?? ''))
    setAvailableFrom(row.available_from ?? row.start_date ?? '')
    setAvailableTo(row.available_to ?? row.end_date ?? '')
    setStatus(row.status ?? 'pending')
    setPaused(row.paused ?? false)
    setFilled(row.filled ?? false)
    setVerified(row.verified ?? false)
    setFurnished(row.furnished === true || row.furnished === 'Yes')
    setIsInternFriendly(row.is_intern_friendly ?? false)
    setImmediateMovein(row.immediate_movein ?? false)
    setTestListing(row.test_listing ?? false)

    // Initialize photo state
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
    setSuccess(false)

    const updates: Record<string, unknown> = {
      title: title.trim(),
      description: description.trim(),
      neighborhood,
      room_type: roomType,
      rent_monthly: parseInt(rentMonthly) || 0,
      available_from: availableFrom,
      available_to: availableTo,
      status,
      paused,
      filled,
      verified,
      furnished,
      is_intern_friendly: isInternFriendly,
      immediate_movein: immediateMovein,
      test_listing: testListing,
    }

    const res = await fetch(`/api/admin/listings/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    })

    if (res.ok) {
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
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

        {/* Status bar */}
        {success && (
          <div className="mb-4 px-4 py-2 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
            Changes saved successfully
          </div>
        )}
        {error && listing && (
          <div className="mb-4 px-4 py-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          {/* Photos */}
          {photos.length > 0 && (
            <div className="flex gap-1 overflow-x-auto p-4 bg-gray-50 border-b border-gray-200">
              {photos.map((photo, i) => (
                <div key={i} className="relative flex-shrink-0 w-32 h-24 rounded-lg overflow-hidden bg-gray-200 group">
                  <Image src={photo.url} alt={`Photo ${i + 1}`} fill className="object-cover" sizes="128px" />
                  {photo.is_primary && (
                    <span className="absolute top-1 left-1 text-[10px] bg-black/60 text-white px-1.5 py-0.5 rounded">Primary</span>
                  )}
                  {/* Rotate buttons */}
                  {rotatingPhoto !== i && (
                    <div className="absolute bottom-1 right-1 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleRotatePhoto(i, -90)}
                        className="bg-black/50 hover:bg-black/70 text-white rounded-full p-1"
                        aria-label="Rotate counter-clockwise"
                      >
                        <RotateCcw className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => handleRotatePhoto(i, 90)}
                        className="bg-black/50 hover:bg-black/70 text-white rounded-full p-1"
                        aria-label="Rotate clockwise"
                      >
                        <RotateCw className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => handleRotatePhoto(i, 180)}
                        className="bg-black/50 hover:bg-black/70 text-white rounded-full p-1"
                        aria-label="Rotate 180 degrees"
                      >
                        <FlipVertical2 className="w-3 h-3" />
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
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className={inputClass}
                maxLength={80}
              />
            </div>

            {/* Description */}
            <div className="flex flex-col gap-1">
              <label className={labelClass}>Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={5}
                className={inputClass + ' resize-y'}
              />
            </div>

            {/* Row: Price + Room Type */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <label className={labelClass}>Monthly Rent ($)</label>
                <input
                  type="number"
                  value={rentMonthly}
                  onChange={(e) => setRentMonthly(e.target.value)}
                  className={inputClass}
                  min={0}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className={labelClass}>Room Type</label>
                <select value={roomType} onChange={(e) => setRoomType(e.target.value)} className={inputClass}>
                  <option value="">—</option>
                  {ROOM_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Row: Neighborhood + Status */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <label className={labelClass}>Neighborhood</label>
                <select value={neighborhood} onChange={(e) => setNeighborhood(e.target.value)} className={inputClass}>
                  <option value="">—</option>
                  {NEIGHBORHOODS.map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className={labelClass}>Status</label>
                <select value={status} onChange={(e) => setStatus(e.target.value)} className={inputClass}>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
            </div>

            {/* Row: Dates */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <label className={labelClass}>Available From</label>
                <input
                  type="date"
                  value={availableFrom}
                  onChange={(e) => setAvailableFrom(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className={labelClass}>Available To</label>
                <input
                  type="date"
                  value={availableTo}
                  onChange={(e) => setAvailableTo(e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>

            {/* Checkboxes */}
            <div className="border-t border-gray-100 pt-4">
              <label className={labelClass + ' mb-3 block'}>Flags</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input type="checkbox" checked={verified} onChange={(e) => setVerified(e.target.checked)} className={checkboxClass} />
                  Verified
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input type="checkbox" checked={furnished} onChange={(e) => setFurnished(e.target.checked)} className={checkboxClass} />
                  Furnished
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input type="checkbox" checked={isInternFriendly} onChange={(e) => setIsInternFriendly(e.target.checked)} className={checkboxClass} />
                  Intern Friendly
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input type="checkbox" checked={immediateMovein} onChange={(e) => setImmediateMovein(e.target.checked)} className={checkboxClass} />
                  Immediate Move-in
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
              <button
                onClick={() => router.push('/admin')}
                className="px-5 py-2.5 text-sm font-medium rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
