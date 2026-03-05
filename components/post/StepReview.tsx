'use client'

import Image from 'next/image'
import { MapPin, Home, Calendar, DollarSign, Bed } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { formatRoomType } from '@/lib/utils'
import { AMENITY_LABELS } from '@/lib/constants'
import type { BasicInfoData } from './StepBasicInfo'
import type { DetailsData } from './StepDetails'
import type { PhotoItem } from './StepPhotos'
import { Button } from '@/components/ui/Button'

interface StepReviewProps {
  basicInfo: BasicInfoData
  details: DetailsData
  photos: PhotoItem[]
  onEdit: (step: number) => void
  onSubmit: () => void
  submitting: boolean
}

export function StepReview({ basicInfo, details, photos, onEdit, onSubmit, submitting }: StepReviewProps) {
  const uploadedPhotos = photos.filter((p) => !p.uploading)

  return (
    <div className="max-w-2xl mx-auto flex flex-col gap-6">
      <h2 className="text-xl font-semibold text-gray-900">Review Your Listing</h2>
      <p className="text-sm text-gray-500 -mt-4">
        Double-check everything before submitting. You can edit any section.
      </p>

      {/* Photos preview */}
      <ReviewSection title="Photos" onEdit={() => onEdit(2)}>
        <div className="flex gap-2 overflow-x-auto pb-2">
          {uploadedPhotos.map((p, i) => (
            <div key={p.url + i} className="relative w-24 h-24 rounded-button overflow-hidden flex-shrink-0 bg-gray-100">
              <Image src={p.url} alt={`Photo ${i + 1}`} fill className="object-cover" sizes="96px" />
              {i === 0 && (
                <span className="absolute bottom-0.5 left-0.5 text-[9px] bg-primary-600 text-white px-1 rounded">
                  Cover
                </span>
              )}
            </div>
          ))}
        </div>
      </ReviewSection>

      {/* Basic info */}
      <ReviewSection title="Basic Info" onEdit={() => onEdit(1)}>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
          <Dt>Title</Dt>
          <Dd>{basicInfo.title || '—'}</Dd>
          <Dt>Neighborhood</Dt>
          <Dd>{basicInfo.neighborhood || '—'}</Dd>
          <Dt>Room Type</Dt>
          <Dd>{basicInfo.room_type ? formatRoomType(basicInfo.room_type) : '—'}</Dd>
          <Dt>Rent</Dt>
          <Dd>${basicInfo.rent_monthly || '—'}/mo</Dd>
          <Dt>Deposit</Dt>
          <Dd>{basicInfo.deposit ? `$${basicInfo.deposit}` : 'None'}</Dd>
          <Dt>Dates</Dt>
          <Dd>{basicInfo.available_from} → {basicInfo.available_to}</Dd>
        </dl>
      </ReviewSection>

      {/* Details */}
      <ReviewSection title="Details" onEdit={() => onEdit(3)}>
        <p className="text-sm text-gray-600 line-clamp-4 mb-3">{details.description || 'No description'}</p>
        <div className="flex flex-wrap gap-2">
          {details.furnished && <Badge variant="furnished" />}
          {details.is_intern_friendly && <Badge variant="intern_friendly" />}
          {details.immediate_movein && <Badge variant="immediate" />}
          {details.amenities.map((a) => (
            <span key={a} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-badge">
              {AMENITY_LABELS[a] ?? a}
            </span>
          ))}
        </div>
      </ReviewSection>

      {/* Submit */}
      <div className="border-t border-gray-100 pt-6 text-center">
        <p className="text-sm text-gray-500 mb-4">
          Your listing will be submitted for review. We&apos;ll approve it within 24 hours.
        </p>
        <Button variant="accent" size="lg" onClick={onSubmit} disabled={submitting} className="min-w-[200px]">
          {submitting ? 'Submitting…' : 'Submit for Review'}
        </Button>
      </div>
    </div>
  )
}

function ReviewSection({
  title,
  onEdit,
  children,
}: {
  title: string
  onEdit: () => void
  children: React.ReactNode
}) {
  return (
    <div className="rounded-card border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
        <button onClick={onEdit} className="text-xs text-primary-600 hover:text-primary-700 font-medium">
          Edit
        </button>
      </div>
      {children}
    </div>
  )
}

function Dt({ children }: { children: React.ReactNode }) {
  return <dt className="text-gray-500">{children}</dt>
}

function Dd({ children }: { children: React.ReactNode }) {
  return <dd className="text-gray-900 font-medium">{children}</dd>
}
