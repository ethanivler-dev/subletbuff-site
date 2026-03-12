'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import {
  X, ExternalLink, Pencil, MapPin, Calendar, Home, DollarSign,
  FileText, Shield, Mail, Clock, RotateCw, RotateCcw, FlipVertical2,
} from 'lucide-react'
import { formatRent, formatDate, formatRoomType } from '@/lib/utils'
import { rotateImage } from '@/lib/image-rotate'
import { createClient } from '@/lib/supabase/client'
import { AMENITY_LABELS } from '@/lib/constants'

interface AdminListing {
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
  created_at: string | null
  lister_id: string | null
  user_id: string | null
  address: string | null
  latitude: number | null
  longitude: number | null
  lease_status: string | null
  lease_document_path: string | null
  reviewed_by: string | null
  reviewed_at: string | null
  rejection_reason: string | null
  management_company: string | null
  furnished: boolean | string | null
  is_intern_friendly: boolean | null
  immediate_movein: boolean | null
  amenities: string[] | null
  house_rules: string | null
  roommate_info: string | null
  beds: string | null
  baths: string | null
  utilities_included: boolean | null
  utilities_estimate: number | null
  deposit: number | null
  pets: string | null
  admin_flag: string | null
  admin_notes: string | null
  listing_photos: Array<{ url: string; display_order: number; is_primary: boolean; storage_path?: string; photo_path?: string }> | null
}

interface ListerProfile {
  full_name: string | null
  email: string | null
  verification_level: string | null
}

interface Props {
  listing: AdminListing
  profile: ListerProfile | null
  onClose: () => void
  onContactLister: () => void
  onAction: (action: string) => void
  actionLoading: boolean
  onQuickEdit?: () => void
}

function StatusBadge({ listing }: { listing: AdminListing }) {
  if (listing.paused) return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">Paused</span>
  if (listing.filled) return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">Filled</span>
  if (listing.status === 'approved') return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Live</span>
  if (listing.status === 'pending') return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">Pending</span>
  if (listing.status === 'rejected') return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">Rejected</span>
  return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">{listing.status ?? 'Unknown'}</span>
}

function LeaseStatusBadge({ status }: { status: string | null }) {
  if (!status || status === 'none') return <span className="text-gray-400 text-xs">No lease uploaded</span>
  if (status === 'pending') return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">Lease Pending</span>
  if (status === 'verified') return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Lease Verified</span>
  if (status === 'rejected') return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">Lease Rejected</span>
  return null
}

function InfoRow({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: React.ReactNode }) {
  if (!value) return null
  return (
    <div className="flex items-start gap-3 py-2">
      <Icon className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
      <div className="min-w-0">
        <p className="text-xs text-gray-400 uppercase tracking-wider">{label}</p>
        <p className="text-sm text-gray-900 break-words">{value}</p>
      </div>
    </div>
  )
}

export function ListingDetailPanel({ listing, profile, onClose, onContactLister, onAction, actionLoading, onQuickEdit }: Props) {
  const sortedPhotos = [...(listing.listing_photos ?? [])].sort((a, b) => {
    if (a.is_primary && !b.is_primary) return -1
    if (!a.is_primary && b.is_primary) return 1
    return a.display_order - b.display_order
  })

  const [photos, setPhotos] = useState(sortedPhotos)
  const [rotatingPhoto, setRotatingPhoto] = useState<number | null>(null)

  // Reset photos when listing changes
  useEffect(() => {
    const sorted = [...(listing.listing_photos ?? [])].sort((a, b) => {
      if (a.is_primary && !b.is_primary) return -1
      if (!a.is_primary && b.is_primary) return 1
      return a.display_order - b.display_order
    })
    setPhotos(sorted)
  }, [listing])

  async function handleRotatePhoto(index: number, degrees: 90 | -90 | 180) {
    const photo = photos[index]
    if (!photo || rotatingPhoto !== null) return

    setRotatingPhoto(index)
    try {
      const blob = await rotateImage(photo.url, degrees)
      const storagePath = photo.storage_path || photo.photo_path

      if (storagePath) {
        const supabase = createClient()
        const { error: uploadError } = await supabase.storage
          .from('listing-photos')
          .upload(storagePath, blob, { upsert: true, contentType: 'image/jpeg' })

        if (uploadError) {
          console.error('Failed to re-upload rotated photo:', uploadError.message)
          setRotatingPhoto(null)
          return
        }

        const { data: urlData } = supabase.storage
          .from('listing-photos')
          .getPublicUrl(storagePath)

        const newUrl = `${urlData.publicUrl}?t=${Date.now()}`
        setPhotos((prev) =>
          prev.map((p, i) => (i === index ? { ...p, url: newUrl } : p))
        )
      } else {
        const newUrl = URL.createObjectURL(blob)
        setPhotos((prev) =>
          prev.map((p, i) => (i === index ? { ...p, url: newUrl } : p))
        )
      }
    } catch {
      console.error('Failed to rotate image')
    } finally {
      setRotatingPhoto(null)
    }
  }

  const rent = listing.rent_monthly ?? listing.monthly_rent
  const dateFrom = listing.available_from ?? listing.start_date
  const dateTo = listing.available_to ?? listing.end_date
  const ownerId = listing.lister_id ?? listing.user_id
  const isPending = listing.status === 'pending'
  const isApproved = listing.status === 'approved'

  // Close on Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose} />

      {/* Panel */}
      <div className="fixed top-0 right-0 h-full w-full max-w-lg bg-white shadow-2xl z-50 overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-3 min-w-0">
            <StatusBadge listing={listing} />
            {listing.admin_flag === 'needs_email' && (
              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800" title={listing.admin_notes ?? undefined}>Needs Email</span>
            )}
            {listing.admin_flag === 'waiting_response' && (
              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-cyan-100 text-cyan-800" title={listing.admin_notes ?? undefined}>Waiting</span>
            )}
            {listing.admin_flag === 'note' && (
              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800" title={listing.admin_notes ?? undefined}>Note</span>
            )}
            {listing.admin_flag === 'urgent' && (
              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800" title={listing.admin_notes ?? undefined}>Urgent</span>
            )}
            {listing.test_listing && (
              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">Test</span>
            )}
            {listing.verified && (
              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Verified</span>
            )}
          </div>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-6">
          {/* Photos */}
          {photos.length > 0 && (
            <div className="flex gap-2 overflow-x-auto pb-2">
              {photos.map((p, i) => (
                <div key={i} className="relative w-32 h-24 rounded-lg overflow-hidden bg-gray-100 shrink-0 group">
                  <Image src={p.url} alt="" fill className="object-cover" sizes="128px" />
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

          {/* Title & basics */}
          <div>
            <h2 className="font-serif text-xl text-gray-900 mb-1">{listing.title || '(no title)'}</h2>
            <p className="text-sm text-gray-500">
              {formatRoomType(listing.room_type ?? 'private_room')}
              {listing.beds && ` · ${listing.beds} bed${listing.beds !== '1' ? 's' : ''}`}
              {listing.baths && ` · ${listing.baths} bath${listing.baths !== '1' ? 's' : ''}`}
            </p>
          </div>

          {/* Quick actions */}
          <div className="flex flex-wrap gap-2">
            {isPending && (
              <>
                <button
                  onClick={() => onAction('approve')}
                  disabled={actionLoading}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
                >
                  Approve
                </button>
                <button
                  onClick={() => onAction('reject')}
                  disabled={actionLoading}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
                >
                  Reject
                </button>
              </>
            )}
            {isApproved && !listing.filled && (
              <button
                onClick={() => onAction('fill')}
                disabled={actionLoading}
                className="px-3 py-1.5 text-xs font-medium rounded-lg bg-purple-100 text-purple-800 hover:bg-purple-200 disabled:opacity-50"
              >
                Mark Filled
              </button>
            )}
            {isApproved && listing.filled && (
              <button
                onClick={() => onAction('unfill')}
                disabled={actionLoading}
                className="px-3 py-1.5 text-xs font-medium rounded-lg bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50"
              >
                Unmark Filled
              </button>
            )}
            {isApproved && !listing.paused && (
              <button
                onClick={() => onAction('pause')}
                disabled={actionLoading}
                className="px-3 py-1.5 text-xs font-medium rounded-lg bg-yellow-100 text-yellow-800 hover:bg-yellow-200 disabled:opacity-50"
              >
                Pause
              </button>
            )}
            {isApproved && listing.paused && (
              <button
                onClick={() => onAction('unpause')}
                disabled={actionLoading}
                className="px-3 py-1.5 text-xs font-medium rounded-lg bg-green-100 text-green-800 hover:bg-green-200 disabled:opacity-50"
              >
                Unpause
              </button>
            )}
            {listing.admin_flag !== 'needs_email' && (
              <button
                onClick={() => onAction('flag_needs_email')}
                disabled={actionLoading}
                className="px-3 py-1.5 text-xs font-medium rounded-lg bg-orange-100 text-orange-800 hover:bg-orange-200 disabled:opacity-50"
              >
                Flag: Needs Email
              </button>
            )}
            {listing.admin_flag !== 'waiting_response' && (
              <button
                onClick={() => onAction('flag_waiting')}
                disabled={actionLoading}
                className="px-3 py-1.5 text-xs font-medium rounded-lg bg-cyan-100 text-cyan-800 hover:bg-cyan-200 disabled:opacity-50"
              >
                Flag: Waiting
              </button>
            )}
            {listing.admin_flag !== 'note' && (
              <button
                onClick={() => onAction('flag_note')}
                disabled={actionLoading}
                className="px-3 py-1.5 text-xs font-medium rounded-lg bg-indigo-100 text-indigo-800 hover:bg-indigo-200 disabled:opacity-50"
              >
                Flag: Note
              </button>
            )}
            {listing.admin_flag !== 'urgent' && (
              <button
                onClick={() => onAction('flag_urgent')}
                disabled={actionLoading}
                className="px-3 py-1.5 text-xs font-medium rounded-lg bg-red-100 text-red-800 hover:bg-red-200 disabled:opacity-50"
              >
                Flag: Urgent
              </button>
            )}
            {listing.admin_flag && (
              <button
                onClick={() => onAction('flag_clear')}
                disabled={actionLoading}
                className="px-3 py-1.5 text-xs font-medium rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-50"
              >
                Clear Flag
              </button>
            )}
            <button
              onClick={() => onAction('delete')}
              disabled={actionLoading}
              className="px-3 py-1.5 text-xs font-medium rounded-lg bg-red-50 text-red-600 hover:bg-red-100 disabled:opacity-50"
            >
              Delete
            </button>
            {onQuickEdit && (
              <button
                onClick={onQuickEdit}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100"
              >
                <Pencil className="w-3 h-3" /> Quick Edit
              </button>
            )}
            <Link
              href={`/admin/listings/${listing.id}/edit`}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg bg-gray-50 text-gray-700 hover:bg-gray-100"
            >
              <Pencil className="w-3 h-3" /> Full Edit
            </Link>
            <Link
              href={`/listings/${listing.id}`}
              target="_blank"
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200"
            >
              <ExternalLink className="w-3 h-3" /> View Public
            </Link>
          </div>

          {/* Public Info */}
          <div className="space-y-1">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Listing Details</h3>
            <InfoRow icon={DollarSign} label="Rent" value={rent ? formatRent(rent) : null} />
            {listing.deposit && <InfoRow icon={DollarSign} label="Deposit" value={`$${listing.deposit.toLocaleString()}`} />}
            <InfoRow icon={Home} label="Neighborhood" value={listing.neighborhood} />
            <InfoRow icon={Calendar} label="Available" value={
              dateFrom && dateTo ? `${formatDate(dateFrom)} – ${formatDate(dateTo)}` :
              dateFrom ? `From ${formatDate(dateFrom)}` : null
            } />
            <InfoRow icon={Home} label="Furnished" value={
              listing.furnished === true || listing.furnished === 'Yes' ? 'Yes' :
              listing.furnished === false || listing.furnished === 'No' ? 'No' : null
            } />
            {listing.utilities_included && (
              <InfoRow icon={DollarSign} label="Utilities" value={
                listing.utilities_estimate ? `Included (~$${listing.utilities_estimate}/mo)` : 'Included'
              } />
            )}
            {listing.pets && <InfoRow icon={Home} label="Pets" value={listing.pets} />}
            {listing.management_company && (
              <InfoRow icon={Home} label="Management" value={listing.management_company} />
            )}
          </div>

          {/* Amenities */}
          {listing.amenities && listing.amenities.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Amenities</h3>
              <div className="flex flex-wrap gap-1.5">
                {listing.amenities.map((a) => (
                  <span key={a} className="px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-700">
                    {AMENITY_LABELS[a] ?? a}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Description */}
          {listing.description && (
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Description</h3>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{listing.description}</p>
            </div>
          )}

          {/* House rules & roommate info */}
          {listing.house_rules && (
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">House Rules</h3>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{listing.house_rules}</p>
            </div>
          )}
          {listing.roommate_info && (
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Roommate Info</h3>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{listing.roommate_info}</p>
            </div>
          )}

          {/* Private / Admin Info */}
          <div className="bg-amber-50/50 border border-amber-100 rounded-lg p-4 space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-amber-700 mb-2">Private Info (Admin Only)</h3>
            <InfoRow icon={MapPin} label="Full Address" value={listing.address} />
            {listing.latitude && listing.longitude && (
              <InfoRow icon={MapPin} label="Coordinates" value={`${listing.latitude.toFixed(6)}, ${listing.longitude.toFixed(6)}`} />
            )}
            <InfoRow icon={FileText} label="Lease Status" value={<LeaseStatusBadge status={listing.lease_status} />} />
            {listing.lease_document_path && (
              <InfoRow icon={FileText} label="Lease Document" value={listing.lease_document_path.split('/').pop()} />
            )}
            {listing.reviewed_at && (
              <InfoRow icon={Clock} label="Reviewed" value={formatDate(listing.reviewed_at.split('T')[0])} />
            )}
            {listing.rejection_reason && (
              <InfoRow icon={FileText} label="Rejection Reason" value={listing.rejection_reason} />
            )}
            <InfoRow icon={Shield} label="Test Listing" value={listing.test_listing ? 'Yes' : 'No'} />
            <InfoRow icon={Clock} label="Created" value={listing.created_at ? formatDate(listing.created_at.split('T')[0]) : null} />
            {listing.admin_notes && (
              <div className="mt-2 pt-2 border-t border-amber-200">
                <p className="text-xs font-semibold text-amber-700 mb-1">Admin Note</p>
                <p className="text-xs text-amber-900 bg-amber-100/50 rounded px-2 py-1.5">{listing.admin_notes}</p>
              </div>
            )}
          </div>

          {/* Lister Info */}
          <div className="bg-blue-50/50 border border-blue-100 rounded-lg p-4 space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-blue-700 mb-2">Lister</h3>
            <InfoRow icon={Shield} label="Name" value={profile?.full_name || 'Unknown'} />
            <InfoRow icon={Mail} label="Email" value={profile?.email || 'Unknown'} />
            <InfoRow icon={Shield} label="Verification" value={profile?.verification_level || 'basic'} />
            <InfoRow icon={Shield} label="User ID" value={ownerId ? `${ownerId.slice(0, 8)}...` : null} />

            <button
              onClick={onContactLister}
              className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700"
            >
              <Mail className="w-3 h-3" /> Contact Lister
            </button>
          </div>

          {/* Flags */}
          <div className="flex flex-wrap gap-2 text-xs pb-4">
            {listing.is_intern_friendly && (
              <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-800">Intern Friendly</span>
            )}
            {listing.immediate_movein && (
              <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-800">Immediate Move-in</span>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
