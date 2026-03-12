'use client'

import { useState, useEffect, useCallback } from 'react'
import { Loader2, Save } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { useToast } from '@/components/ui/Toast'
import { NEIGHBORHOODS, ROOM_TYPES } from '@/lib/constants'

interface AdminEditModalProps {
  open: boolean
  onClose: () => void
  listingId: string | null
  onSaved?: () => void
}

export function AdminEditModal({ open, onClose, listingId, onSaved }: AdminEditModalProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Listing Content fields
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
  const [furnished, setFurnished] = useState(false)
  const [isInternFriendly, setIsInternFriendly] = useState(false)
  const [immediateMovein, setImmediateMovein] = useState(false)

  // Admin Controls
  const [status, setStatus] = useState('')
  const [verified, setVerified] = useState(false)
  const [testListing, setTestListing] = useState(false)
  const [paused, setPaused] = useState(false)
  const [filled, setFilled] = useState(false)

  // Photos (read-only in modal)
  const [photos, setPhotos] = useState<Array<{ url: string }>>([])

  const fetchData = useCallback(async () => {
    if (!listingId) return
    setLoading(true)
    setError(null)

    const res = await fetch(`/api/admin/listings/${listingId}`)
    if (!res.ok) {
      setError('Failed to load listing')
      setLoading(false)
      return
    }

    const row = await res.json()
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
    setFurnished(row.furnished === true || row.furnished === 'Yes')
    setIsInternFriendly(row.is_intern_friendly ?? false)
    setImmediateMovein(row.immediate_movein ?? false)
    setStatus(row.status ?? 'pending')
    setVerified(row.verified ?? false)
    setTestListing(row.test_listing ?? false)
    setPaused(row.paused ?? false)
    setFilled(row.filled ?? false)

    const resolvedPhotos = row.listing_photos?.length
      ? [...row.listing_photos].sort((a: { display_order: number }, b: { display_order: number }) => a.display_order - b.display_order)
      : (row.photo_urls ?? []).map((url: string) => ({ url }))
    setPhotos(resolvedPhotos)

    setLoading(false)
  }, [listingId])

  useEffect(() => {
    if (open && listingId) fetchData()
  }, [open, listingId, fetchData])

  async function handleSave() {
    if (!listingId) return
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
      furnished,
      is_intern_friendly: isInternFriendly,
      immediate_movein: immediateMovein,
      status,
      verified,
      test_listing: testListing,
      paused,
      filled,
    }

    const res = await fetch(`/api/admin/listings/${listingId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    })

    if (res.ok) {
      toast('Changes saved successfully', 'success')
      onSaved?.()
      onClose()
    } else {
      const data = await res.json().catch(() => ({}))
      setError(data.error || 'Failed to save')
    }
    setSaving(false)
  }

  const inputClass = 'w-full px-3 py-2 text-sm rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent hover:border-gray-300 transition-colors'
  const labelClass = 'text-sm font-medium text-gray-700'
  const checkboxClass = 'h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500'

  return (
    <Modal open={open} onClose={onClose} title="Quick Edit" className="max-w-2xl">
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      ) : (
        <div className="flex flex-col gap-6 max-h-[70vh] overflow-y-auto pr-1">
          {error && (
            <div className="px-4 py-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
          )}

          {/* Photo thumbnails (read-only) */}
          {photos.length > 0 && (
            <div className="flex gap-1 overflow-x-auto pb-1">
              {photos.slice(0, 6).map((photo, i) => (
                <div key={i} className="relative flex-shrink-0 w-20 h-14 rounded-md overflow-hidden bg-gray-200">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={photo.url} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
                </div>
              ))}
              {photos.length > 6 && (
                <div className="flex-shrink-0 w-20 h-14 rounded-md bg-gray-100 flex items-center justify-center text-xs text-gray-500">
                  +{photos.length - 6}
                </div>
              )}
            </div>
          )}

          {/* Listing Content */}
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <label className={labelClass}>Title</label>
              <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className={inputClass} maxLength={80} />
            </div>

            <div className="flex flex-col gap-1">
              <label className={labelClass}>Description</label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className={inputClass + ' resize-y'} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className={labelClass}>Rent ($)</label>
                <input type="number" value={rentMonthly} onChange={(e) => setRentMonthly(e.target.value)} className={inputClass} min={0} />
              </div>
              <div className="flex flex-col gap-1">
                <label className={labelClass}>Deposit ($)</label>
                <input type="number" value={depositVal} onChange={(e) => setDepositVal(e.target.value)} className={inputClass} min={0} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
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

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className={labelClass}>Bedrooms</label>
                <input type="number" value={bedroomsVal} onChange={(e) => setBedroomsVal(e.target.value)} className={inputClass} min={0} max={10} />
              </div>
              <div className="flex flex-col gap-1">
                <label className={labelClass}>Bathrooms</label>
                <select value={bathroomsVal} onChange={(e) => setBathroomsVal(e.target.value)} className={inputClass}>
                  {[1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5].map((n) => (
                    <option key={n} value={String(n)}>{n}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className={labelClass}>Available From</label>
                <input type="date" value={availableFrom} onChange={(e) => setAvailableFrom(e.target.value)} className={inputClass} />
              </div>
              <div className="flex flex-col gap-1">
                <label className={labelClass}>Available To</label>
                <input type="date" value={availableTo} onChange={(e) => setAvailableTo(e.target.value)} className={inputClass} />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
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
            </div>
          </div>

          {/* Admin Controls */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex flex-col gap-4">
            <h3 className="text-sm font-semibold text-amber-900">Admin Controls</h3>

            <div className="flex flex-col gap-1">
              <label className={labelClass}>Status</label>
              <select value={status} onChange={(e) => setStatus(e.target.value)} className={inputClass}>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input type="checkbox" checked={verified} onChange={(e) => setVerified(e.target.checked)} className={checkboxClass} />
                Verified
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input type="checkbox" checked={testListing} onChange={(e) => setTestListing(e.target.checked)} className={checkboxClass} />
                Test Listing
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input type="checkbox" checked={paused} onChange={(e) => setPaused(e.target.checked)} className={checkboxClass} />
                Paused
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input type="checkbox" checked={filled} onChange={(e) => setFilled(e.target.checked)} className={checkboxClass} />
                Filled
              </label>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 justify-end pt-2 border-t border-gray-100">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50 transition-colors"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save
            </button>
          </div>
        </div>
      )}
    </Modal>
  )
}
